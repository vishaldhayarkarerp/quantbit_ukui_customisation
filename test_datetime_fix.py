#!/usr/bin/env python3

import frappe

# Initialize Frappe
frappe.init(site='bench-UKhealthcare')
frappe.connect()

try:
    # Test the datetime comparison fix
    from frappe.utils import now_datetime, get_datetime, add_to_date
    
    print("=== Testing DateTime Comparison Fix ===")
    
    # Test current time vs future time
    current_time = now_datetime()
    future_time = add_to_date(current_time, hours=1)
    past_time = add_to_date(current_time, hours=-1)
    
    print(f"Current time: {current_time}")
    print(f"Future time: {future_time}")
    print(f"Past time: {past_time}")
    
    # Test comparisons
    print(f"Current > Future: {current_time > get_datetime(future_time)}")
    print(f"Current > Past: {current_time > get_datetime(past_time)}")
    
    # Test OTP verification with a real record
    otp_records = frappe.get_all('Email OTP Verification', 
        fields=['name', 'email_id', 'otp_send', 'expiry_time'],
        order_by='creation desc',
        limit=1
    )
    
    if otp_records:
        record = otp_records[0]
        print(f"\n=== Testing with Real OTP Record ===")
        print(f"Email: {record.email_id}")
        print(f"OTP Send: {record.otp_send}")
        print(f"Expiry: {record.expiry_time}")
        
        # Test expiry check
        is_expired = now_datetime() > get_datetime(record.expiry_time)
        print(f"Is Expired: {is_expired}")
        
        # Test verification
        from quantbit_ukui_customisation.quantbit_ukui_customisation.api import verify_otp
        result = verify_otp(record.email_id, str(record.otp_send))
        print(f"Verification Result: {result}")
    else:
        print("No OTP records found to test with")

finally:
    frappe.destroy()
