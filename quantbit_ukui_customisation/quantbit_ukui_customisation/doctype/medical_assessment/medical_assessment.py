# Copyright (c) 2025, Quantbit Technologies Pvt Ltd
# For license information, please see license.txt

import frappe
import pandas as pd
import numpy as np
import os
from frappe.model.document import Document


def hampel_filter(series, window=7, n_sigma=3):
    cleaned = series.copy()
    k = 1.4826

    for i in range(window, len(series) - window):
        window_slice = series.iloc[i - window : i + window]
        median = np.median(window_slice)
        mad = k * np.median(np.abs(window_slice - median))

        if mad > 0 and abs(series.iloc[i] - median) > n_sigma * mad:
            cleaned.iloc[i] = median

    return cleaned


class MedicalAssessment(Document):

    def before_save(self):

        if not self.attachments or len(self.attachments) < 2:
            return

        try:
            # ----------------------------------
            # Load first two attachments
            # ----------------------------------
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
            # FHR PROCESSING (ONLY FHR)
            # ----------------------------------
            df_fhr["fhr"] = hampel_filter(df_fhr["fhr"], window=7)

            # Physiological limits
            df_fhr.loc[(df_fhr["fhr"] < 50) | (df_fhr["fhr"] > 210), "fhr"] = None

            # Sudden jumps
            df_fhr.loc[df_fhr["fhr"].diff().abs() > 25, "fhr"] = None

            df_fhr["fhr"] = df_fhr["fhr"].interpolate()

            # ----------------------------------
            # UC PROCESSING (ONLY UC)
            # ----------------------------------
            df_uc["uc"] = hampel_filter(df_uc["uc"], window=11)

            df_uc.loc[df_uc["uc"] < 0, "uc"] = None
            df_uc.loc[df_uc["uc"].diff().abs() > 20, "uc"] = None

            df_uc["uc"] = df_uc["uc"].interpolate()

            # ----------------------------------
            # MERGE AFTER CLEANING
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

            # ----------------------------------
            # Attach merged file as 3rd attachment
            # ----------------------------------
            with open(merged_filepath, "rb") as f:
                file_doc = frappe.get_doc({
                    "doctype": "File",
                    "file_name": merged_filename,
                    "attached_to_doctype": self.doctype,
                    "attached_to_name": self.name,
                    "is_private": 0,
                    "content": f.read(),
                })
                file_doc.save()

            self.append("attachments", {
                "name_of_document": merged_filename,
                "attachment": file_doc.file_url,
            })

            frappe.msgprint("FHR & UC cleaned and merged successfully")

        except Exception as e:
            frappe.log_error(str(e), "CTG Processing Error")
            frappe.throw(f"CTG processing failed: {str(e)}")
