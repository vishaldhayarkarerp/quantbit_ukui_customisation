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

        try:
            attachment_fhr = self.attachments[0]
            attachment_uc  = self.attachments[1]

            file_fhr = frappe.get_doc("File", {"file_url": attachment_fhr.attachment})
            file_uc  = frappe.get_doc("File", {"file_url": attachment_uc.attachment})

            csv_fhr = file_fhr.get_full_path()
            csv_uc  = file_uc.get_full_path()

            # ----------------------------------
            # Read CSVs
            # ----------------------------------
            df_fhr = pd.read_csv(csv_fhr, header=None, names=["x", "fhr"])
            df_uc  = pd.read_csv(csv_uc,  header=None, names=["x", "uc"])

            # ----------------------------------
            # MERGE DATA
            # ----------------------------------
            merged = pd.merge(df_fhr, df_uc, on="x", how="outer")

            merged["fhr"] = merged["fhr"].fillna(0)
            merged["uc"]  = merged["uc"].fillna(0)

            merged = merged.sort_values("x")

            # ----------------------------------
            # Save merged CSV
            # ----------------------------------
            merged_filename = "final_ctg_signal.csv"
            merged_filepath = os.path.join(
                frappe.get_site_path(), "public", "files", merged_filename
            )

            merged.to_csv(merged_filepath, index=False)

            self.append("attachments", {
                "name_of_document": merged_filename,
                "attachment": "/files/" + merged_filename,
            })

            frappe.msgprint("FHR & UC merged successfully")

        except Exception as e:
            frappe.log_error(str(e), "CTG Processing Error")
            frappe.throw(f"CTG processing failed: {str(e)}")