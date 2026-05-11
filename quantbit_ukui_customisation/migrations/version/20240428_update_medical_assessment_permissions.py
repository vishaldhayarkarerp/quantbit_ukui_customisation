# Migration to update Medical Assessment permissions
import frappe

def execute():
    """Update Medical Assessment DocType permissions"""
    
    # Clear existing permissions
    frappe.db.sql("DELETE FROM `tabDocPerm` WHERE parent = 'Medical Assessment'")
    
    # Add System Manager permissions
    frappe.get_doc({
        "doctype": "DocPerm",
        "parent": "Medical Assessment",
        "parenttype": "DocType",
        "parentfield": "permissions",
        "role": "System Manager",
        "read": 1,
        "write": 1,
        "create": 1,
        "delete": 1,
        "submit": 1,
        "cancel": 1,
        "email": 1,
        "print": 1,
        "export": 1,
        "report": 1,
        "share": 1
    }).insert()
    
    # Add Medical Assessment Editor permissions
    frappe.get_doc({
        "doctype": "DocPerm",
        "parent": "Medical Assessment",
        "parenttype": "DocType",
        "parentfield": "permissions",
        "role": "Medical Assessment Editor",
        "read": 1,
        "write": 1,
        "create": 1,
        "delete": 0,
        "submit": 1,
        "cancel": 1,
        "email": 1,
        "print": 1,
        "export": 1,
        "report": 1,
        "share": 1
    }).insert()
    
    # Add All permissions (basic read/create)
    frappe.get_doc({
        "doctype": "DocPerm",
        "parent": "Medical Assessment",
        "parenttype": "DocType",
        "parentfield": "permissions",
        "role": "All",
        "read": 1,
        "write": 0,
        "create": 1,
        "delete": 0,
        "submit": 0,
        "cancel": 0,
        "email": 0,
        "print": 1,
        "export": 1,
        "report": 0,
        "share": 0
    }).insert()
    
    frappe.db.commit()
    print("Medical Assessment permissions updated successfully")
