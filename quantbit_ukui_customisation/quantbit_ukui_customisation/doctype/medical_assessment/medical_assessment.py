# Copyright (c) 2025, Quantbit Technologies Pvt Ltd
# For license information, please see license.txt

import frappe
import pandas as pd
import os
from frappe.model.document import Document

class MedicalAssessment(Document):

    def before_save(self):           
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
                frappe.throw("No valid files found for merging")
            
            final_merged = pd.concat(merged_data).drop_duplicates(subset=["x"]).sort_values("x")
            
            # Delete existing files starting with final_ctg_signal.csv
            files_dir = os.path.join(frappe.get_site_path(), "public", "files")
            for filename in os.listdir(files_dir):
                if filename.startswith("final") and filename.endswith(".csv"):
                    try:
                        os.remove(os.path.join(files_dir, filename))
                    except:
                        pass
            
            merged_filename = "final_ctg_signal.csv"
            merged_filepath = os.path.join(frappe.get_site_path(), "public", "files", merged_filename)
            final_merged.to_csv(merged_filepath, index=False)
            
            self.final_ctg_data = "/files/" + merged_filename
            frappe.msgprint("FHR & UC files merged successfully")
            
        except Exception as e:
            frappe.log_error(str(e), "CTG Processing Error")
            frappe.throw(f"Error merging files: {str(e)}")