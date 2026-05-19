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

    def process_ctg_merging(self):
        try:
            attachments = self.get("attachments", [])
            if not attachments:
                return                  
            fhr_files = []
            uc_files = []
            
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
            
            self.final_ctg_data = "/files/" + merged_filename
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



