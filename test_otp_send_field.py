#!/usr/bin/env python3

import frappe

# Initialize Frappe
frappe.init(site='bench-UKhealthcare')
frappe.connect()

try:
    # Get all OTP records to check otp_send field
    otp_records = frappe.get_all('Email OTP Verification', 
        fields=['name', 'email_id', 'otp_send', 'otp_code', 'verified', 'expiry_time'],
        order_by='creation desc'
    )
    
    print("=== OTP Records with otp_send field ===")
    for record in otp_records:
        print(f"Email: {record.email_id}")
        print(f"OTP Send: {record.otp_send}")
        print(f"OTP Code: {record.otp_code}")
        print(f"Verified: {record.verified}")
        print(f"Expires: {record.expiry_time}")
        print("-" * 40)
    
    # Test sending OTP to a specific email
    if len(otp_records) > 0:
        test_email = otp_records[0].email_id
        print(f"\n=== Testing OTP Send for: {test_email} ===")
        
        # Call the API function
        from quantbit_ukui_customisation.quantbit_ukui_customisation.api import send_otp
        result = send_otp(test_email)
        print(f"Send OTP Result: {result}")
        
        # Check the updated record
        updated_record = frappe.get_doc("Email OTP Verification", {"email_id": test_email})
        print(f"Updated OTP Send: {updated_record.otp_send}")
        print(f"Updated Verified: {updated_record.verified}")

finally:
    frappe.destroy()
