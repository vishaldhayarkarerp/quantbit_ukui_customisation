# Copyright (c) 2025, Quantbit Technologies Pvt Ltd
# For license information, please see license.txt

import frappe
import pandas as pd
import os
from frappe.model.document import Document

class MedicalAssessment(Document):


    def before_save(self):
        self.process_ctg_merging()
        self.generate_patient_metadata()
        self.generate_final_ctg_data()

    def process_ctg_merging(self):
        try:
            attachments = self.get("attachments", [])
            if not attachments:
                return                  
            fhr_files = []
            uc_files = []
            mp_files = []
            
            for attachment in attachments:
                # Get filename with multiple fallbacks to ensure it's never None
                filename = attachment.get("name_of_document")
                if filename is None:
                    filename = attachment.get("name_of_document", "")
                if filename is None:
                    filename = ""
                
                # Convert to string if it's not already
                if not isinstance(filename, str):
                    try:
                        filename = str(filename)
                    except:
                        filename = ""
                
                # Strip whitespace and check if it's a valid string
                filename = str(filename).strip() if filename else ""
                
                if filename and filename.upper().startswith("FHR"):
                    fhr_files.append(attachment)
                elif filename and filename.upper().startswith("UC"):
                    uc_files.append(attachment)
                elif filename and filename.upper().startswith("MP"):
                    mp_files.append(attachment)
            
            if not fhr_files or not uc_files:
                return
            
            merged_data = []
            
            for fhr_file in fhr_files:
                fhr_path = os.path.join(frappe.get_site_path(), "public", fhr_file.get("attachment", "").lstrip("/"))
                if not os.path.exists(fhr_path):
                    continue
                        
                df_fhr = pd.read_csv(fhr_path, header=None, names=["x", "FHR"])
                
                for uc_file in uc_files:
                    uc_path = os.path.join(frappe.get_site_path(), "public", uc_file.get("attachment", "").lstrip("/"))
                    if not os.path.exists(uc_path):
                        continue
                        
                    df_uc = pd.read_csv(uc_path, header=None, names=["x", "UC"])
                    
                    if mp_files:
                        for mp_file in mp_files:
                            mp_path = os.path.join(frappe.get_site_path(), "public", mp_file.get("attachment", "").lstrip("/"))
                            if not os.path.exists(mp_path):
                                continue
                                
                            df_mp = pd.read_csv(mp_path, header=None, names=["x", "MP"])
                            
                            merged = pd.merge(df_fhr, df_uc, on="x", how="outer").fillna(0)
                            merged = pd.merge(merged, df_mp, on="x", how="outer").fillna(0).sort_values("x")
                            merged_data.append(merged)
                    else:
                        merged = pd.merge(df_fhr, df_uc, on="x", how="outer").fillna(0).sort_values("x")
                        merged_data.append(merged)
            
            if not merged_data:
                return
            
            final_merged = pd.concat(merged_data).drop_duplicates(subset=["x"]).sort_values("x")
            
            # Delete existing files starting with final_ctg_signal.csv
            files_dir = os.path.join(frappe.get_site_path(), "public", "files")
            if not os.path.exists(files_dir):
                os.makedirs(files_dir)
                
            for filename in os.listdir(files_dir):
                if filename.startswith("final") and filename.endswith(".csv"):
                    try:
                        os.remove(os.path.join(files_dir, filename))
                    except:
                        pass
            
            merged_filename = "final_ctg_signal.csv"
            merged_filepath = os.path.join(files_dir, merged_filename)
            final_merged.to_csv(merged_filepath, index=False)
            
            self.signal_data = "/files/" + merged_filename
            if mp_files:
                frappe.msgprint("FHR, UC & MP files merged successfully")
            else:
                frappe.msgprint("FHR & UC files merged successfully")
            
        except Exception as e:
            frappe.log_error(str(e), "CTG Processing Error")
            frappe.throw(f"Error merging files: {str(e)}")

    def generate_patient_metadata(self):
        try:
            import re
            # Get doctype metadata
            meta = frappe.get_meta(self.doctype)
            
            # Fields to exclude from the Excel export
            exclude_types = ['Section Break', 'Column Break', 'Tab Break', 'HTML', 'Button', 'Table', 'Fold']
            
            # First pass: Get all field values to easily lookup header values
            field_values = {}
            for field in meta.fields:
                if field.fieldtype not in exclude_types:
                    val = self.get(field.fieldname)
                    if val is None or val == "":
                        val = "No Data"
                    field_values[field.fieldname] = val

            # Second pass: Process fields with section tracking
            labels = []
            fieldnames = []
            values = []
            current_header_value = None
            
            for field in meta.fields:
                # Track section breaks and their depends_on values
                if field.fieldtype == 'Section Break':
                    depends_on = field.get('depends_on')
                    header_fieldname = None
                    if depends_on:
                        match = re.search(r'eval:\s*doc\.([a-zA-Z0-9_]+)\s*==', depends_on)
                        if match:
                            header_fieldname = match.group(1)
                    
                    if header_fieldname:
                        current_header_value = field_values.get(header_fieldname)
                    else:
                        current_header_value = None
                        
                elif field.fieldtype == 'Tab Break':
                    # Reset section tracking on Tab Break
                    current_header_value = None
                    
                elif field.fieldtype not in exclude_types:
                    label = field.label or field.fieldname
                    fieldname = field.fieldname
                    value = self.get(fieldname)
                    
                    # Apply override if the current section's header question is "No Data"
                    if current_header_value == "No Data":
                        value = "No Data"
                    else:
                        if value is None or value == "":
                            value = "No Data"
                    
                    labels.append(label)
                    fieldnames.append(fieldname)
                    values.append(value)
            
            if not labels:
                return
                
            df = pd.DataFrame([fieldnames, values], columns=labels)
            
            import io
            
            # Write dataframe to bytes
            output = io.BytesIO()
            df.to_excel(output, index=False)
            excel_bytes = output.getvalue()
            
            # Find existing attachment File documents for this field
            existing_files = frappe.get_all(
                "File", 
                filters={
                    "attached_to_doctype": "Medical Assessment", 
                    "attached_to_name": self.name, 
                    "attached_to_field": "patient_metadata"
                }
            )
            
            # Delete existing files completely (DB and disk)
            for f in existing_files:
                frappe.delete_doc("File", f.name, ignore_permissions=True)
                
            # Safely create a new File document
            safe_name = "".join([c for c in self.name if c.isalnum() or c in ("-", "_")])
            file_name = f"patient_metadata_{safe_name}.xlsx"
            
            # Use Frappe's file manager to create and save the file
            f_doc = frappe.get_doc({
                "doctype": "File",
                "file_name": file_name,
                "attached_to_doctype": "Medical Assessment",
                "attached_to_name": self.name,
                "attached_to_field": "patient_metadata",
                "folder": "Home/Attachments",
                "is_private": 0,
                "content": excel_bytes
            })
            f_doc.insert(ignore_permissions=True)
            
            # Update the reference field
            self.patient_metadata = f_doc.file_url
            
        except Exception as e:
            frappe.log_error(title="Generate Patient Metadata Error", message=frappe.get_traceback())
            frappe.throw(f"Error generating patient metadata: {str(e)}")

    def generate_final_ctg_data(self):
        try:
            import io
            import pandas as pd
            import os
            
            metadata_df = None
            if self.patient_metadata:
                m_path = self.patient_metadata.lstrip("/")
                if m_path.startswith("private/"):
                    metadata_path = frappe.get_site_path("private", "files", m_path.split("private/files/")[-1])
                elif m_path.startswith("files/"):
                    metadata_path = frappe.get_site_path("public", "files", m_path.split("files/")[-1])
                else:
                    metadata_path = frappe.get_site_path("public", m_path)
                
                if os.path.exists(metadata_path):
                    metadata_df = pd.read_excel(metadata_path)
                    
            signal_df = None
            if self.signal_data:
                s_path = self.signal_data.lstrip("/")
                if s_path.startswith("private/"):
                    signal_path = frappe.get_site_path("private", "files", s_path.split("private/files/")[-1])
                elif s_path.startswith("files/"):
                    signal_path = frappe.get_site_path("public", "files", s_path.split("files/")[-1])
                else:
                    signal_path = frappe.get_site_path("public", s_path)
                
                if os.path.exists(signal_path):
                    signal_df = pd.read_csv(signal_path)
                else:
                    frappe.msgprint(f"Signal file not found at: {signal_path}")
                    
            if metadata_df is None and signal_df is None:
                return
                
            # Create a combined Excel file with BytesIO
            output = io.BytesIO()
            with pd.ExcelWriter(output) as writer:
                if metadata_df is not None:
                    metadata_df.to_excel(writer, sheet_name="Patient Metadata", index=False)
                if signal_df is not None:
                    signal_df.to_excel(writer, sheet_name="Signal Data", index=False)
                    
            excel_bytes = output.getvalue()
            
            # Find and delete existing File documents for final_ctg_data
            existing_files = frappe.get_all(
                "File", 
                filters={
                    "attached_to_doctype": "Medical Assessment", 
                    "attached_to_name": self.name, 
                    "attached_to_field": "final_ctg_data"
                }
            )
            for f in existing_files:
                frappe.delete_doc("File", f.name, ignore_permissions=True)
                
            safe_name = "".join([c for c in self.name if c.isalnum() or c in ("-", "_")])
            file_name = f"final_ctg_data_{safe_name}.xlsx"
            
            f_doc = frappe.get_doc({
                "doctype": "File",
                "file_name": file_name,
                "attached_to_doctype": "Medical Assessment",
                "attached_to_name": self.name,
                "attached_to_field": "final_ctg_data",
                "folder": "Home/Attachments",
                "is_private": 0,
                "content": excel_bytes
            })
            f_doc.insert(ignore_permissions=True)
            
            self.final_ctg_data = f_doc.file_url
            
        except Exception as e:
            frappe.log_error(title="Generate Final CTG Data Error", message=frappe.get_traceback())
            frappe.msgprint(f"Error generating final CTG data: {str(e)}")



