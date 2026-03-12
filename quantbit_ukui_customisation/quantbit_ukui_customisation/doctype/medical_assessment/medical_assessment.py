# Copyright (c) 2025, Quantbit Technologies Pvt Ltd
# For license information, please see license.txt

import frappe
import pandas as pd
import os
from frappe.model.document import Document

class MedicalAssessment(Document):

    def before_save(self):
        if not self.attachments or len(self.attachments) < 2:
            return
            
        attachment_fhr, attachment_uc = self.attachments[0], self.attachments[1]
        
        if not attachment_fhr.get('attachment') or not attachment_uc.get('attachment'):
            return
            
        try:                
            file_fhr = frappe.get_doc("File", {"file_url": attachment_fhr.get('attachment')})
            file_uc = frappe.get_doc("File", {"file_url": attachment_uc.get('attachment')})

            csv_fhr, csv_uc = file_fhr.get_full_path(), file_uc.get_full_path()
            
            if not os.path.exists(csv_fhr) or not os.path.exists(csv_uc):
                frappe.throw("FHR or UC file not found")
                
            df_fhr = pd.read_csv(csv_fhr, header=None, names=["x", "fhr"])
            df_uc = pd.read_csv(csv_uc, header=None, names=["x", "uc"])
            
            merged = pd.merge(df_fhr, df_uc, on="x", how="outer").fillna(0).sort_values("x")
            
            merged_filename = "final_ctg_signal.csv"
            merged_filepath = os.path.join(frappe.get_site_path(), "public", "files", merged_filename)
            merged.to_csv(merged_filepath, index=False)
            
            self.append("attachments", {
                "name_of_document": merged_filename,
                "attachment": "/files/" + merged_filename,
            })
            frappe.msgprint("FHR & UC merged successfully")

        except Exception as e:
            frappe.log_error(str(e), "CTG Processing Error")
            frappe.throw(f"CTG processing failed: {str(e)}")