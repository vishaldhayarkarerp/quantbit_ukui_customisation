#!/usr/bin/env python3

import frappe

# Initialize Frappe
frappe.init(site='bench-UKhealthcare')
frappe.connect()

try:
    # Get all OTP records
    otp_records = frappe.get_all('Email OTP Verification', 
        fields=['name', 'email_id', 'otp_code', 'verified', 'expiry_time'],
        order_by='creation desc'
    )
    
    print("=== OTP Records ===")
    for record in otp_records:
        print(f"Email: {record.email_id}")
        print(f"OTP: {record.otp_code}")
        print(f"Verified: {record.verified}")
        print(f"Expires: {record.expiry_time}")
        print("-" * 30)
    
    # Check email configuration
    print("\n=== Email Configuration ===")
    try:
        email_settings = frappe.get_single('Email Settings')
        print(f"Email Enabled: {email_settings.enable_email}")
        print(f"Mail Server: {email_settings.mail_server}")
    except:
        print("Email Settings not configured")
    
    # Test sending email
    print("\n=== Testing Email Send ===")
    try:
        frappe.sendmail(
            recipients=['test@example.com'],
            subject='Test Email',
            message='This is a test email'
        )
        print("Email sent successfully")
    except Exception as e:
        print(f"Email failed: {e}")

finally:
    frappe.destroy()
