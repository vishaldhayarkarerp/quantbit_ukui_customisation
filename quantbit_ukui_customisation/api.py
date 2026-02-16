import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, get_datetime
# from erpnext.accounts.doctype.pos_invoice_merge_log.pos_invoice_merge_log import (
#     consolidate_pos_invoices,
# )


@frappe.whitelist()
def get_custom_user_batch_no(purchase_receipt, item_code, warehouse):
    try:
        data = frappe.db.get_value(
            "Purchase Receipt Item",
            {
                "parent": purchase_receipt,
                "item_code": item_code,
                "warehouse": warehouse,
            },
            "custom_user_batch_no",
        )
        return data
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Custom User Batch Fetch Error")
        return None


@frappe.whitelist()
def get_transit_entries(department):
    company = frappe.db.get_value("Department", department, "company")
    suffix = (
        frappe.db.get_value("Company", filters={"name": company}, fieldname="abbr")
        or ""
    )

    entries = frappe.get_all(
        "Stock Entry",
        filters={
            "docstatus": 1,
            "stock_entry_type": "Material Transfer",
            "custom_to_department": department,  # Ensure this matches the selected department
            "add_to_transit": 1,
            "from_warehouse": ["!=", f"In Transit - {suffix}"],
        },
        fields=["name", "posting_date"],
    )

    for entry in entries:
        # Fetch total qty by summing qty from child table
        stock_entry_doc = frappe.get_doc("Stock Entry", entry.name)
        total_qty = sum(d.qty for d in stock_entry_doc.items if d.qty)
        entry["total_qty"] = total_qty if total_qty else 0

    return entries


@frappe.whitelist()
def custom_end_transit(stock_entry_name, department):
    suffix = (
        frappe.db.get_value(
            "Company",
            filters={"name": frappe.db.get_value("Department", department, "company")},
            fieldname="default_in_transit_warehouse",
        )
        or ""
    )
    try:

        stock_entry = frappe.get_doc("Stock Entry", stock_entry_name)
        if (
            stock_entry.docstatus != 1
            or stock_entry.stock_entry_type != "Material Transfer"
            or not stock_entry.add_to_transit
        ):
            frappe.throw(("Invalid stock entry for ending transit."))

        new_stock_entry = frappe.new_doc("Stock Entry")
        new_stock_entry.stock_entry_type = "Material Transfer"
        new_stock_entry.from_warehouse = suffix
        new_stock_entry.custom_to_department = stock_entry.custom_to_department
        new_stock_entry.purpose = "Material Transfer"
        new_stock_entry.docstatus = 0
        new_stock_entry.outgoing_stock_entry = stock_entry_name
        

        for item in stock_entry.items:
            new_stock_entry.append(
                "items",
                {
                    "item_code": item.item_code,
                    "s_warehouse": suffix,
                    "t_warehouse": new_stock_entry.to_warehouse,
                    "qty": item.qty,
                    "uom": item.uom,
                    "to_department": item.to_department,
                    "department": item.department,
                    "patient": item.patient,
                    "against_stock_entry": stock_entry_name,
                    "ste_detail": item.name,
                    "batch_no": item.batch_no,
                    "custom_requested_qty": item.custom_requested_qty,
                },
            )

        new_stock_entry.insert()

        frappe.msgprint(
            ("End Transit stock entry created: {0}").format(new_stock_entry.name)
        )
        return new_stock_entry.name
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Custom End Transit Error")
        frappe.throw(("Failed to create End Transit stock entry: {0}").format(str(e)))


@frappe.whitelist()
def pos_closing_entry_summary(opening_entry):
    invoices = frappe.new_doc("POS Closing Entry")
    invoices.pos_opening_entry = opening_entry
    invoices.insert(ignore_permissions=True)
    invoices.submit()
    return invoices


import frappe
# from erpnext.stock.get_item_details import get_item_details
from frappe.utils import cint


@frappe.whitelist()
def item_details(
    item_code, company, customer, price_list, qty=1, uom="KGS", input_rate=None
):
    """
    Fetch item details including tax information for POS Invoice
    """
    try:
        if not item_code:
            return {"error": "Item code is required"}
        if not company:
            return {"error": "Company is required"}

        company_doc = frappe.get_doc("Company", company)
        default_currency = company_doc.default_currency or "INR"

        # Prepare args with UI-provided values
        args = {
            "item_code": item_code,
            "customer": customer or "",
            "currency": default_currency,
            "price_list": price_list or "Standard Selling",
            "price_list_currency": default_currency,
            "plc_conversion_rate": 1,
            "company": company,
            "doctype": "POS Invoice",
            "qty": float(qty) if qty else 1,
            "uom": uom or "KGS",
            "for_update": 0,
        }

        doc = frappe._dict(
            {
                "doctype": "POS Invoice",
                "selling_price_list": args["price_list"],
                "company": args["company"],
                "currency": args["currency"],  # Explicitly set currency in doc
                "items": [],
                "get": lambda x: args.get(x) if x not in ["items"] else [],
            }
        )

        item = get_item_details(args=args, doc=doc)

        if not item:
            return {"error": "Item not found"}

        item_tax_template = ""
        try:
            item_tax = frappe.get_all(
                "Item Tax",
                filters={"parent": item_code, "parenttype": "Item"},
                fields=["item_tax_template"],
                limit=1,
            )
            if item_tax:
                item_tax_template = item_tax[0].item_tax_template
        except Exception as e:
            frappe.log_error(
                f"Error fetching item tax template: {str(e)}", "item_details"
            )

        company_gstin = frappe.db.get_value("Company", company, "gstin") or ""
        customer_gstin = ""
        if customer:
            try:
                customer_gstin = (
                    frappe.db.get_value(
                        "Address",
                        {"customer": customer, "is_primary_address": 1},
                        "gstin",
                    )
                    or ""
                )
            except Exception as e:
                try:
                    customer_gstin = (
                        frappe.db.get_value("Customer", customer, "gstin") or ""
                    )
                except Exception as e2:
                    frappe.log_error(
                        f"Error fetching customer GSTIN: {str(e2)}", "item_details"
                    )
                    customer_gstin = ""

        company_state_code = (
            company_gstin[:2] if company_gstin and len(company_gstin) >= 2 else ""
        )
        customer_state_code = (
            customer_gstin[:2] if customer_gstin and len(customer_gstin) >= 2 else ""
        )

        suffix = (
            frappe.db.get_value("Company", filters={"name": company}, fieldname="abbr")
            or ""
        )

        is_intra_state = (
            company_state_code == customer_state_code
            if company_state_code and customer_state_code
            else True
        )

        tax_rates = {}
        try:
            if item.get("item_tax_rate"):
                tax_rates = frappe.parse_json(item.get("item_tax_rate", "{}"))
        except Exception as e:
            frappe.log_error(f"Error parsing tax rates: {str(e)}", "item_details")
            tax_rates = {}

        cgst_rate = 0
        sgst_rate = 0
        igst_rate = 0

        if is_intra_state:
            cgst_rate = (
                tax_rates.get(f"Output Tax CGST - {suffix}", 0)
                or tax_rates.get(f"CGST - {suffix}", 0)
                or tax_rates.get("CGST", 0)
                or 0
            )
            sgst_rate = (
                tax_rates.get(f"Output Tax SGST - {suffix}", 0)
                or tax_rates.get(f"SGST - {suffix}", 0)
                or tax_rates.get(f"SGST", 0)
                or 0
            )
            igst_rate = 0
        else:
            igst_rate = (
                tax_rates.get(f"Output Tax IGST - {suffix}", 0)
                or tax_rates.get(f"IGST - {suffix}", 0)
                or tax_rates.get("IGST", 0)
                or 0
            )
            cgst_rate = 0
            sgst_rate = 0
        final_rate = (
            input_rate if input_rate is not None else item.get("price_list_rate", 0)
        )
        result = {
            "item_code": item_code,
            "item_name": item.get("item_name", ""),
            "description": item.get("description", ""),
            "uom": item.get("uom", uom),
            "rate": final_rate,
            "item_tax_template": item_tax_template,
            "cgst_rate": float(cgst_rate),
            "sgst_rate": float(sgst_rate),
            "igst_rate": float(igst_rate),
            "is_intra_state": is_intra_state,
            "company_gstin": company_gstin,
            "customer_gstin": customer_gstin,
        }

        return result

    except Exception as e:
        frappe.log_error(f"Error in item_details API: {str(e)}", "item_details")
        return {
            "error": f"Error fetching item details: {str(e)}",
            "item_code": item_code,
            "item_name": "",
            "description": "",
            "uom": uom or "KGS",
            "rate": 0,
            "item_tax_template": "",
            "cgst_rate": 0,
            "sgst_rate": 0,
            "igst_rate": 0,
            "is_intra_state": True,
        }


@frappe.whitelist()
def get_tax_accounts(company):
    """
    Get tax accounts for a company
    """
    try:
        if not company:
            print("Error: Company is required for get_tax_accounts")
            return {"error": "Company is required"}

        print(f"Fetching tax accounts for company: {company}")

        # Get company suffix
        company_suffix = frappe.db.get_value("Company", company, "abbr") or ""
        print(f"Company suffix: {company_suffix}")

        # Search for CGST accounts - prioritize exact match with suffix, exclude RCM and Refund, prioritize Output Tax
        cgst_accounts = frappe.get_all(
            "Account",
            filters={
                "company": company,
                "account_name": ["like", f"%Output Tax CGST%{company_suffix}"],
                "account_type": "Tax",
            },
            fields=["name", "account_name"],
            limit=5,
        )
        # Filter out RCM and Refund accounts in Python
        cgst_accounts = [
            acc
            for acc in cgst_accounts
            if "RCM" not in acc.get("account_name", "")
            and "Refund" not in acc.get("account_name", "")
        ]
        print(f"CGST Output Tax accounts found: {cgst_accounts}")

        if not cgst_accounts:
            print(
                "No CGST Output Tax accounts found with suffix, trying generic Output Tax search."
            )
            cgst_accounts = frappe.get_all(
                "Account",
                filters={
                    "company": company,
                    "account_name": ["like", "%Output Tax CGST%"],
                    "account_type": "Tax",
                },
                fields=["name", "account_name"],
                limit=5,
            )
            cgst_accounts = [
                acc
                for acc in cgst_accounts
                if "RCM" not in acc.get("account_name", "")
                and "Refund" not in acc.get("account_name", "")
            ]
            print(f"CGST generic Output Tax accounts found: {cgst_accounts}")

        if not cgst_accounts:
            print(
                "No CGST Output Tax accounts found, falling back to any CGST accounts."
            )
            cgst_accounts = frappe.get_all(
                "Account",
                filters={
                    "company": company,
                    "account_name": ["like", "%CGST%"],
                    "account_type": "Tax",
                },
                fields=["name", "account_name"],
                limit=5,
            )
            # Filter to prioritize Output Tax, exclude RCM and Refund
            output_tax_cgst = [
                acc
                for acc in cgst_accounts
                if "Output Tax" in acc.get("account_name", "")
                and "RCM" not in acc.get("account_name", "")
                and "Refund" not in acc.get("account_name", "")
            ]
            if output_tax_cgst:
                cgst_accounts = output_tax_cgst
            else:
                cgst_accounts = [
                    acc
                    for acc in cgst_accounts
                    if "RCM" not in acc.get("account_name", "")
                    and "Refund" not in acc.get("account_name", "")
                ]
        print(f"Final CGST accounts: {cgst_accounts}")

        # Search for SGST accounts - prioritize Output Tax
        sgst_accounts = frappe.get_all(
            "Account",
            filters={
                "company": company,
                "account_name": ["like", f"%Output Tax SGST%{company_suffix}"],
                "account_type": "Tax",
            },
            fields=["name", "account_name"],
            limit=5,
        )
        sgst_accounts = [
            acc
            for acc in sgst_accounts
            if "RCM" not in acc.get("account_name", "")
            and "Refund" not in acc.get("account_name", "")
        ]
        print(f"SGST Output Tax accounts found: {sgst_accounts}")

        if not sgst_accounts:
            print(
                "No SGST Output Tax accounts found with suffix, trying generic Output Tax search."
            )
            sgst_accounts = frappe.get_all(
                "Account",
                filters={
                    "company": company,
                    "account_name": ["like", "%Output Tax SGST%"],
                    "account_type": "Tax",
                },
                fields=["name", "account_name"],
                limit=5,
            )
            sgst_accounts = [
                acc
                for acc in sgst_accounts
                if "RCM" not in acc.get("account_name", "")
                and "Refund" not in acc.get("account_name", "")
            ]
            print(f"SGST generic Output Tax accounts found: {sgst_accounts}")

        if not sgst_accounts:
            print(
                "No SGST Output Tax accounts found, falling back to any SGST accounts."
            )
            sgst_accounts = frappe.get_all(
                "Account",
                filters={
                    "company": company,
                    "account_name": ["like", "%SGST%"],
                    "account_type": "Tax",
                },
                fields=["name", "account_name"],
                limit=5,
            )
            # Filter to prioritize Output Tax, exclude RCM and Refund
            output_tax_sgst = [
                acc
                for acc in sgst_accounts
                if "Output Tax" in acc.get("account_name", "")
                and "RCM" not in acc.get("account_name", "")
                and "Refund" not in acc.get("account_name", "")
            ]
            if output_tax_sgst:
                sgst_accounts = output_tax_sgst
            else:
                sgst_accounts = [
                    acc
                    for acc in sgst_accounts
                    if "RCM" not in acc.get("account_name", "")
                    and "Refund" not in acc.get("account_name", "")
                ]
        print(f"Final SGST accounts: {sgst_accounts}")

        # Search for IGST accounts - prioritize Output Tax
        igst_accounts = frappe.get_all(
            "Account",
            filters={
                "company": company,
                "account_name": ["like", f"%Output Tax IGST%{company_suffix}"],
                "account_type": "Tax",
            },
            fields=["name", "account_name"],
            limit=5,
        )
        igst_accounts = [
            acc
            for acc in igst_accounts
            if "RCM" not in acc.get("account_name", "")
            and "Refund" not in acc.get("account_name", "")
        ]
        print(f"IGST Output Tax accounts found: {igst_accounts}")

        if not igst_accounts:
            print(
                "No IGST Output Tax accounts found with suffix, trying generic Output Tax search."
            )
            igst_accounts = frappe.get_all(
                "Account",
                filters={
                    "company": company,
                    "account_name": ["like", "%Output Tax IGST%"],
                    "account_type": "Tax",
                },
                fields=["name", "account_name"],
                limit=5,
            )
            igst_accounts = [
                acc
                for acc in igst_accounts
                if "RCM" not in acc.get("account_name", "")
                and "Refund" not in acc.get("account_name", "")
            ]
            print(f"IGST generic Output Tax accounts found: {igst_accounts}")

        if not igst_accounts:
            print(
                "No IGST Output Tax accounts found, falling back to any IGST accounts."
            )
            igst_accounts = frappe.get_all(
                "Account",
                filters={
                    "company": company,
                    "account_name": ["like", "%IGST%"],
                    "account_type": "Tax",
                },
                fields=["name", "account_name"],
                limit=5,
            )
            # Filter to prioritize Output Tax, exclude RCM and Refund
            output_tax_igst = [
                acc
                for acc in igst_accounts
                if "Output Tax" in acc.get("account_name", "")
                and "RCM" not in acc.get("account_name", "")
                and "Refund" not in acc.get("account_name", "")
            ]
            if output_tax_igst:
                igst_accounts = output_tax_igst
            else:
                igst_accounts = [
                    acc
                    for acc in igst_accounts
                    if "RCM" not in acc.get("account_name", "")
                    and "Refund" not in acc.get("account_name", "")
                ]
        print(f"Final IGST accounts: {igst_accounts}")

        return {
            "cgst_accounts": cgst_accounts,
            "sgst_accounts": sgst_accounts,
            "igst_accounts": igst_accounts,
        }

    except Exception as e:
        print(f"Error in get_tax_accounts: {str(e)}")
        frappe.log_error(str(e), "Tax Account Error")
        return {"error": str(e)}


import frappe
from frappe import _


@frappe.whitelist()
def get_tax_template(company, customer):
    """
    Determine the appropriate tax template based on company and customer GSTIN comparison.

    Args:
        company (str): Name of the company
        customer (str): Name of the customer

    Returns:
        dict: Contains taxes_template value
    """
    try:
        # Get company GSTIN
        company_gstin = frappe.db.get_value("Company", company, "gstin") or ""
        # Get customer GSTIN
        customer_gstin = frappe.db.get_value("Customer", customer, "gstin") or ""

        # Extract state codes (first 2 digits of GSTIN)
        company_state_code = (
            company_gstin[:2] if company_gstin and len(company_gstin) >= 2 else ""
        )
        customer_state_code = (
            customer_gstin[:2] if customer_gstin and len(customer_gstin) >= 2 else ""
        )

        # Get company abbreviation
        suffix = frappe.db.get_value("Company", {"name": company}, "abbr") or ""

        # Determine if intra-state or inter-state
        is_intra_state = (
            company_state_code == customer_state_code
            if company_state_code and customer_state_code
            else True
        )

        # Set taxes_template based on comparison
        taxes_template = (
            f"Output GST {'In-state' if is_intra_state else 'Out-state'} - {suffix}"
        )

        return {
            "status": "success",
            "suffix": suffix,
            "taxes_template": taxes_template,
            "is_intra_state": is_intra_state,
        }

    except Exception as e:
        frappe.log_error(f"Error in get_tax_template: {str(e)}")
        return {
            "status": "error",
            "message": f"Error determining tax template: {str(e)}",
        }


@frappe.whitelist()
def get_company_gst_category(company):
    """
    Get the GST Category for a given company.
    """
    try:
        if not company:
            # frappe.log_error("Company is required for get_company_gst_category", "GST Category Fetch Error")
            return {"error": "Company is required"}

        gst_category = frappe.db.get_value("Customer", company, "gst_category")
        # frappe.log_error(f"Fetched GST Category for company {company}: {gst_category}", "GST Category Debug")
        return {"gst_category": gst_category or ""}
    except Exception as e:
        frappe.log_error(
            f"Error in get_company_gst_category: {str(e)}", "GST Category Fetch Error"
        )
        return {"error": str(e)}


from frappe.utils import getdate, get_datetime, flt, now_datetime, nowtime
import frappe


def _prepare_pos_closing_entry_components(opening_entry_name: str):
    if not opening_entry_name:
        frappe.throw("POS Opening Entry name is required")

    opening_entry = frappe.get_doc("POS Opening Entry", opening_entry_name)

    if opening_entry.status != "Open":
        frappe.throw("POS Opening Entry is not open")

    period_end = now_datetime()
    posting_date = getdate(period_end)
    posting_time = nowtime()

    closing_values = frappe._dict(
        {
            "pos_opening_entry": opening_entry.name,
            "period_start_date": opening_entry.period_start_date,
            "period_end_date": period_end,
            "posting_date": posting_date,
            "posting_time": posting_time,
            "pos_profile": opening_entry.pos_profile,
            "user": opening_entry.user,
            "company": opening_entry.company,
            "grand_total": 0.0,
            "net_total": 0.0,
            "total_quantity": 0.0,
        }
    )

    invoices = get_pos_invoices_for_closing(
        opening_entry.name,
        opening_entry.period_start_date,
        period_end,
        opening_entry.pos_profile,
        opening_entry.user,
    )

    if not invoices:
        frappe.throw("No POS Invoices found for this period.")

    taxes = []
    payments_lookup = {}
    transactions = []

    if opening_entry.balance_details:
        for detail in opening_entry.balance_details:
            payments_lookup[detail.mode_of_payment] = frappe._dict(
                {
                    "mode_of_payment": detail.mode_of_payment,
                    "opening_amount": flt(detail.opening_amount),
                    "expected_amount": flt(detail.opening_amount),
                    "closing_amount": flt(
                        getattr(detail, "closing_amount", detail.opening_amount)
                    ),
                }
            )

    for invoice_row in invoices:
        transactions.append(
            frappe._dict(
                {
                    "pos_invoice": invoice_row.name,
                    "posting_date": invoice_row.posting_date,
                    "grand_total": flt(invoice_row.grand_total),
                    "customer": invoice_row.customer,
                    "is_return": invoice_row.is_return,
                }
            )
        )

        closing_values.grand_total += flt(invoice_row.grand_total)
        closing_values.net_total += flt(invoice_row.net_total)
        closing_values.total_quantity += flt(invoice_row.total_qty)

        invoice_doc = frappe.get_doc("POS Invoice", invoice_row.name)

        if invoice_doc.taxes:
            for tax_row in invoice_doc.taxes:
                existing_tax = next(
                    (
                        tax
                        for tax in taxes
                        if tax.account_head == tax_row.account_head
                        and flt(tax.rate) == flt(tax_row.rate)
                    ),
                    None,
                )
                if existing_tax:
                    existing_tax.amount += flt(tax_row.tax_amount)
                else:
                    taxes.append(
                        frappe._dict(
                            {
                                "account_head": tax_row.account_head,
                                "rate": flt(tax_row.rate),
                                "amount": flt(tax_row.tax_amount),
                            }
                        )
                    )

        if invoice_doc.payments:
            for payment_row in invoice_doc.payments:
                existing_payment = payments_lookup.get(payment_row.mode_of_payment)
                if existing_payment:
                    existing_payment.expected_amount += flt(payment_row.amount)
                    existing_payment.closing_amount = existing_payment.expected_amount
                else:
                    payments_lookup[payment_row.mode_of_payment] = frappe._dict(
                        {
                            "mode_of_payment": payment_row.mode_of_payment,
                            "opening_amount": 0.0,
                            "expected_amount": flt(payment_row.amount),
                            "closing_amount": flt(payment_row.amount),
                        }
                    )

    payments = []
    for idx, payment in enumerate(payments_lookup.values(), start=1):
        closing_amount = flt(
            getattr(payment, "closing_amount", payment.expected_amount)
        )
        expected_amount = flt(payment.expected_amount)
        payments.append(
            frappe._dict(
                {
                    "mode_of_payment": payment.mode_of_payment,
                    "opening_amount": flt(payment.opening_amount),
                    "expected_amount": expected_amount,
                    "closing_amount": closing_amount,
                    "difference": closing_amount - expected_amount,
                    "idx": idx,
                }
            )
        )

    taxes_with_idx = []
    for idx, tax in enumerate(taxes, start=1):
        taxes_with_idx.append(
            frappe._dict(
                {
                    "account_head": tax.account_head,
                    "rate": flt(tax.rate),
                    "amount": flt(tax.amount),
                    "idx": idx,
                }
            )
        )

    transactions_with_idx = []
    for idx, txn in enumerate(transactions, start=1):
        transactions_with_idx.append(
            frappe._dict(
                {
                    "pos_invoice": txn.pos_invoice,
                    "posting_date": txn.posting_date,
                    "grand_total": flt(txn.grand_total),
                    "customer": txn.customer,
                    "is_return": txn.is_return,
                    "idx": idx,
                }
            )
        )

    return closing_values, taxes_with_idx, transactions_with_idx, payments


@frappe.whitelist()
def get_pos_closing_entry_preview(opening_entry_name):
    try:
        closing_values, taxes, transactions, payments = (
            _prepare_pos_closing_entry_components(opening_entry_name)
        )

        current_dt = now_datetime()
        preview_name = f"{closing_values.pos_opening_entry}-PREVIEW"

        return {
            "success": True,
            "data": {
                "name": preview_name,
                "owner": frappe.session.user,
                "creation": current_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "modified": current_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "modified_by": frappe.session.user,
                "docstatus": 0,
                "idx": 0,
                "period_start_date": str(closing_values.period_start_date),
                "period_end_date": closing_values.period_end_date.strftime(
                    "%Y-%m-%d %H:%M:%S"
                ),
                "posting_date": str(closing_values.posting_date),
                "posting_time": closing_values.posting_time,
                "pos_opening_entry": closing_values.pos_opening_entry,
                "status": "Draft",
                "company": closing_values.company,
                "pos_profile": closing_values.pos_profile,
                "user": closing_values.user,
                "grand_total": flt(closing_values.grand_total),
                "net_total": flt(closing_values.net_total),
                "total_quantity": flt(closing_values.total_quantity),
                "error_message": "",
                "doctype": "POS Closing Entry",
                "taxes": [tax for tax in taxes],
                "pos_transactions": [txn for txn in transactions],
                "payment_reconciliation": [payment for payment in payments],
            },
        }
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "POS Closing Preview Error")
        return {
            "success": False,
            "error": frappe.utils.escape_html(str(exc)),
        }


@frappe.whitelist()
def create_pos_closing_entry(opening_entry_name):
    """
    Create and submit POS Closing Entry with consolidated sales invoice
    Custom whitelisted method for POS closing functionality
    """
    try:
        closing_values, taxes, transactions, payments = (
            _prepare_pos_closing_entry_components(opening_entry_name)
        )

        closing_entry = frappe.new_doc("POS Closing Entry")
        closing_entry.pos_opening_entry = closing_values.pos_opening_entry
        closing_entry.period_start_date = closing_values.period_start_date
        closing_entry.period_end_date = closing_values.period_end_date
        closing_entry.posting_date = closing_values.posting_date
        closing_entry.posting_time = closing_values.posting_time
        closing_entry.pos_profile = closing_values.pos_profile
        closing_entry.user = closing_values.user
        closing_entry.company = closing_values.company
        closing_entry.grand_total = flt(closing_values.grand_total)
        closing_entry.net_total = flt(closing_values.net_total)
        closing_entry.total_quantity = flt(closing_values.total_quantity)

        closing_entry.set("pos_transactions", transactions)
        closing_entry.set("payment_reconciliation", payments)
        closing_entry.set("taxes", taxes)

        closing_entry.insert()
        closing_entry.submit()

        try:
            consolidate_result = consolidate_pos_invoices(closing_entry.name)
        except Exception as e:
            frappe.log_error(
                f"Error consolidating POS invoices: {str(e)}", "POS Consolidation"
            )
            consolidate_result = None

        return {
            "success": True,
            "closing_entry": closing_entry.name,
            "message": "POS Closing Entry created and submitted successfully",
            "consolidation": consolidate_result,
            "total_invoices": len(transactions),
            "grand_total": flt(closing_entry.grand_total),
            "data": closing_entry.as_dict(),
        }

    except Exception as e:
        error_msg = str(e)
        if len(error_msg) > 100:
            error_msg = error_msg[:100] + "..."

        frappe.log_error(f"POS Closing Entry Error: {error_msg}", "POS Closing")

        return {
            "success": False,
            "error": f"Error creating POS Closing Entry: {str(e)[:200]}...",
        }


def get_pos_invoices_for_closing(
    opening_entry_name, start_date, end_date, pos_profile, user
):
    """Get all POS Invoices for the given period and user"""
    start_datetime = get_datetime(start_date)
    end_datetime = get_datetime(end_date)

    frappe.logger().info(
        f"Query params: opening_entry={opening_entry_name}, start={start_datetime}, end={end_datetime}, profile={pos_profile}, user={user}"
    )
    invoices = frappe.db.sql(
        """
        SELECT name, grand_total, net_total, total_qty, customer, posting_date, is_return
        FROM `tabPOS Invoice`
        WHERE timestamp(posting_date, COALESCE(posting_time, '00:00:00')) BETWEEN %s AND %s
        AND pos_profile = %s
        AND owner = %s
        AND docstatus = 1
        AND IFNULL(consolidated_invoice, '') = ''
        ORDER BY posting_date, posting_time
        """,
        (start_datetime, end_datetime, pos_profile, user),
        as_dict=1,
    )
    frappe.logger().info(f"Found {len(invoices)} invoices")
    return invoices


import frappe
from frappe import _
from frappe.model.document import Document


@frappe.whitelist()
def get_paid_pos_invoices(
    invoice_no=None, customer=None, from_date=None, to_date=None, status=None
):

    try:
        filters = {}

        if invoice_no:
            filters["name"] = ["like", f"%{invoice_no}%"]
        if customer:
            filters["customer"] = ["like", f"%{customer}%"]
        if from_date and to_date:
            filters["posting_date"] = ["between", [from_date, to_date]]
        elif from_date:
            filters["posting_date"] = [">=", from_date]
        elif to_date:
            filters["posting_date"] = ["<=", to_date]
        if status:
            filters["status"] = status

        invoices = frappe.get_all(
            "POS Invoice",
            filters=filters,
            fields=[
                "name",
                "customer",
                "posting_date",
                "posting_time",
                "grand_total",
                "status",
            ],
            order_by="posting_date desc, posting_time desc",
        )

        return invoices

    except Exception as e:
        frappe.log_error(str(e)[:140], "Get Paid POS Invoices Error")
        frappe.throw(_(f"Failed to fetch paid invoices: {str(e)}"))


@frappe.whitelist()
def get_pos_invoice_details(invoice_name):

    try:
        invoice = frappe.get_doc("POS Invoice", invoice_name)
        return {
            "name": invoice.name,
            "customer": invoice.customer,
            "posting_date": invoice.posting_date,
            "posting_time": invoice.posting_time,
            "grand_total": invoice.grand_total,
            "status": invoice.status,
            "items": [
                {
                    "item_code": item.item_code,
                    "item_name": item.item_name,
                    "qty": item.qty,
                    "uom": item.uom,
                    "rate": item.rate,
                    "amount": item.amount,
                    "cgst_rate": item.cgst_rate or 0,
                    "cgst_amount": item.cgst_amount or 0,
                    "sgst_rate": item.sgst_rate or 0,
                    "sgst_amount": item.sgst_amount or 0,
                    "igst_rate": item.igst_rate or 0,
                    "igst_amount": item.igst_amount or 0,
                }
                for item in invoice.items
            ],
        }
    except Exception as e:
        frappe.log_error(str(e)[:140], "Get POS Invoice Details Error")
        frappe.throw(_(f"Failed to fetch invoice details: {str(e)}"))


@frappe.whitelist()
def create_pos_invoice_return(
    original_invoice, return_items, refund_mode, return_remarks=None
):

    try:
        if (
            not original_invoice
            or not isinstance(return_items, list)
            or not refund_mode
        ):
            frappe.throw(
                _(
                    "Invalid input: original_invoice, return_items, and refund_mode are required"
                )
            )

        payload_str = f"original_invoice={original_invoice}, return_items={str(return_items)[:50]}, refund_mode={refund_mode}, return_remarks={return_remarks or ''}"
        payload_log = (
            f"Request Payload: {payload_str[:120]}..."
            if len(payload_str) > 120
            else f"Request Payload: {payload_str}"
        )
        frappe.log_error(payload_log[:140], "POS Invoice Return Request")

        # Log request headers for 417 debugging
        frappe.log_error(
            f"Request Headers: {frappe.request.headers}", "POS Invoice Request Headers"
        )

        # Fetch original invoice
        original_doc = frappe.get_doc("POS Invoice", original_invoice)

        for idx, item in enumerate(return_items, 1):
            orig_item = next(
                (i for i in original_doc.items if i.item_code == item.get("item_code")),
                None,
            )
            if not orig_item:
                frappe.throw(
                    _(
                        f"Row #{idx}: Returned Item {item.get('item_code')} does not exist in POS Invoice {original_invoice}"
                    )
                )

            return_qty = float(item.get("return_qty", 0))
            if return_qty <= 0:
                frappe.throw(
                    _(
                        f"Row #{idx}: Return quantity for {item.get('item_code')} must be greater than 0"
                    )
                )
            if return_qty > orig_item.qty:
                frappe.throw(
                    _(
                        f"Row #{idx}: Return quantity for {item.get('item_code')} cannot exceed original quantity {orig_item.qty}"
                    )
                )

        return_doc = frappe.new_doc("POS Invoice")
        return_doc.update(
            {
                "is_return": 1,
                "return_against": original_invoice,
                "customer": original_doc.customer,
                "company": original_doc.company,
                "posting_date": frappe.utils.nowdate(),
                "posting_time": frappe.utils.nowtime(),
                "pos_profile": original_doc.pos_profile,
                "is_pos": 1,
                "remarks": return_remarks or "",
                "taxes_and_charges": original_doc.taxes_and_charges,
                "tax_category": original_doc.tax_category,
                "place_of_supply": original_doc.place_of_supply,
                "gst_category": original_doc.gst_category,
            }
        )

        total_return_qty = 0
        all_nil_rated = True
        total_amount = 0
        total_tax_amount = 0
        suffix = (
            frappe.db.get_value(
                "Company", filters={"name": original_doc.company}, fieldname="abbr"
            )
            or ""
        )
        for item in return_items:
            orig_item = next(
                (i for i in original_doc.items if i.item_code == item.get("item_code")),
                None,
            )
            return_qty = float(item.get("return_qty", 0))
            tax_ratio = return_qty / orig_item.qty
            cgst_rate = orig_item.cgst_rate or next(
                (
                    t.rate
                    for t in original_doc.taxes
                    if t.account_head == f"Output Tax CGST - {suffix}"
                    and t.gst_tax_type == "cgst"
                ),
                9,
            )
            sgst_rate = orig_item.sgst_rate or next(
                (
                    t.rate
                    for t in original_doc.taxes
                    if t.account_head == f"Output Tax SGST - {suffix}"
                    and t.gst_tax_type == "sgst"
                ),
                9,
            )
            item_amount = orig_item.amount * tax_ratio
            cgst_amount = -(item_amount * cgst_rate / 100)
            sgst_amount = -(item_amount * sgst_rate / 100)
            tax_fields = {
                "igst_rate": 0,
                "igst_amount": 0,
                "cgst_rate": cgst_rate,
                "cgst_amount": cgst_amount,
                "sgst_rate": sgst_rate,
                "sgst_amount": sgst_amount,
            }
            if cgst_amount or sgst_amount:
                all_nil_rated = False
            return_doc.append(
                "items",
                {
                    "item_code": item.get("item_code"),
                    "item_name": orig_item.item_name,
                    "qty": -return_qty,
                    "rate": orig_item.rate,
                    "amount": -item_amount,
                    "uom": orig_item.uom,
                    "warehouse": orig_item.warehouse,
                    **tax_fields,
                    "income_account": orig_item.income_account,
                    "cost_center": orig_item.cost_center,
                    "gst_treatment": orig_item.gst_treatment,
                    "item_tax_template": orig_item.item_tax_template,
                },
            )
            frappe.log_error(
                f"Item {item.get('item_code')}: qty={-return_qty}, amount={-item_amount}, cgst_amount={cgst_amount}, sgst_amount={sgst_amount}",
                "POS Invoice Item Debug",
            )
            total_return_qty += return_qty
            total_amount += -item_amount
            total_tax_amount += cgst_amount + sgst_amount

        return_doc.net_total = total_amount
        return_doc.total_taxes_and_charges = total_tax_amount
        return_doc.base_net_total = total_amount
        return_doc.base_total_taxes_and_charges = total_tax_amount
        return_doc.grand_total = total_amount + total_tax_amount
        return_doc.base_grand_total = total_amount + total_tax_amount

        return_doc.set_missing_values()
        return_doc.set_missing_item_details(for_validate=True)
        return_doc.calculate_taxes_and_totals()

        debug_log = f"After calculation: net_total={return_doc.net_total}, total_taxes={return_doc.total_taxes_and_charges}, grand_total={return_doc.grand_total}"[
            :140
        ]
        frappe.log_error(debug_log, "Tax Calculation Debug")

        if return_doc.grand_total is None:
            frappe.throw(_("Failed to calculate grand total for return invoice"))
        if return_doc.grand_total >= 0:
            frappe.throw(_("Grand total must be negative for a return invoice"))
        if (
            not all_nil_rated
            and return_doc.total_taxes_and_charges == 0
            and original_doc.total_taxes_and_charges != 0
        ):
            frappe.throw(
                _(
                    "Tax amounts not calculated for return invoice. Please check tax configuration. Original taxes: {0}, Return taxes: {1}"
                ).format(
                    original_doc.total_taxes_and_charges,
                    return_doc.total_taxes_and_charges,
                )
            )

        payment_account = frappe.db.get_value(
            "Mode of Payment Account",
            {"parent": refund_mode, "company": original_doc.company},
            "default_account",
        )
        if not payment_account:
            frappe.throw(
                _(
                    f"No default account configured for Mode of Payment '{refund_mode}' and company '{original_doc.company}'"
                )
            )

        return_amount = abs(return_doc.grand_total)
        return_doc.append(
            "payments",
            {
                "mode_of_payment": refund_mode,
                "amount": -return_amount,
                "account": payment_account,
            },
        )
        return_doc.paid_amount = -return_amount

        return_doc.insert()
        return_doc.submit()

        return {
            "status": "success",
            "return_invoice": return_doc.name,
            "total_return_qty": total_return_qty,
            "total_return_amount": return_amount,
        }

    except Exception as e:
        frappe.log_error(str(e)[:140], "POS Invoice Return Error")
        frappe.throw(_(f"Failed to create return invoice: {str(e)}"))


def generate_key(user):
    user_details = frappe.get_doc("User", user)
    api_secret = api_key = ""
    if not user_details.api_key and not user_details.api_secret:
        api_secret = frappe.generate_hash(length=15)
        # if api key is not set generate api key
        api_key = frappe.generate_hash(length=15)
        user_details.api_key = api_key
        user_details.api_secret = api_secret
        user_details.save(ignore_permissions=True)
        frappe.db.commit()
    else:
        api_key = user_details.get("api_key")
        api_secret = user_details.get_password("api_secret")
    
    # Ensure we have valid credentials
    if not api_key or not api_secret:
        frappe.log_error(f"API credentials missing for user {user}: api_key={bool(api_key)}, api_secret={bool(api_secret)}")
    
    return {"api_secret": api_secret, "api_key": api_key}


@frappe.whitelist(allow_guest=True)
def test_api_credentials(api_key, api_secret):
    """
    Test if API credentials are valid
    """
    try:
        # Check if credentials exist and are valid
        user = frappe.db.get_value("User", {"api_key": api_key})
        if not user:
            return {"valid": False, "message": "API key not found"}
        
        user_doc = frappe.get_doc("User", user)
        secret = user_doc.get_password("api_secret")
        
        if secret == api_secret:
            return {"valid": True, "message": "Credentials are valid", "user": user}
        else:
            return {"valid": False, "message": "API secret mismatch"}
            
    except Exception as e:
        return {"valid": False, "message": str(e)}
        user = frappe.session.user
    
    try:
        credentials = generate_key(user)
        return {
            "status": "success",
            "user": user,
            "api_key": credentials.get("api_key"),
            "api_secret": credentials.get("api_secret")
        }
    except Exception as e:
        frappe.log_error(title="API Credentials Error", message=f"Error getting credentials for user {user}: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }
