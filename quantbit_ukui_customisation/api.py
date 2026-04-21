import frappe
from frappe import _, cstr
from frappe.model.document import Document
from frappe.utils import flt, get_datetime, generate_hash
from frappe.auth import LoginManager, check_password
from frappe.utils.password import update_password
from bs4 import BeautifulSoup


@frappe.whitelist(allow_guest=False)
def get_session_info():
    session = frappe.session
    return {
        "user": session.user,
        "sid": (
            session.sid
            if frappe.conf.developer_mode
            else "Hidden (enable developer_mode to view)"
        ),
    }


@frappe.whitelist(allow_guest=False)
def get_user_role_profile():
    try:
        user = frappe.session.user
        if user and user != "Guest":
            user_doc = frappe.get_doc("User", user)
            return {
                "role_profile": user_doc.role_profile_name,
                "user": user
            }
        return {
            "role_profile": None,
            "user": user
        }
    except Exception as e:
        return exception_handel(e)


@frappe.whitelist(allow_guest=True)
def login(usr, pwd):
    try:
        login_manager = LoginManager()
        login_manager.authenticate(usr, pwd)
        login_manager.post_login()
        if frappe.response["message"] == "Logged In":
            frappe.response["user"] = login_manager.user
            frappe.response["key_details"] = generate_key(login_manager.user)
        gen_response(200, frappe.response["message"])
    except frappe.AuthenticationError:
        gen_response(500, frappe.response["message"])
    except Exception as e:
        return exception_handel(e)


@frappe.whitelist(allow_guest=True)
def change_password(usr, current_password, new_password):
    try:
        if not usr or not current_password or not new_password:
            return gen_response(400, _("All fields are required."))

        if len(new_password) < 6:
            return gen_response(400, _("New password must be at least 6 characters long."))

        if current_password == new_password:
            return gen_response(400, _("New password must be different from the current password."))

        user_email = None
        if frappe.db.exists("User", usr):
            user_email = usr
        else:
            user_email = frappe.db.get_value("User", {"username": usr}, "name")
            
        if not user_email:
            return gen_response(400, _("No account found for the provided email/username."))

        if user_email in ("Administrator", "Guest"):
            return gen_response(400, _("Password cannot be changed for this account."))


        try:
            check_password(user_email, current_password)
        except frappe.AuthenticationError:
            return gen_response(401, _("Current password is incorrect. Please try again."))

        update_password(user=user_email, pwd=new_password)

        frappe.logger().info(
            f"Password changed for user '{user_email}' via change_password API."
        )

        return gen_response(200, _("Password updated successfully."))

    except frappe.exceptions.ValidationError as ve:
        return gen_response(400, str(ve))
    except Exception as e:
        return exception_handel(e)


@frappe.whitelist(allow_guest=False)
def logout():
    try:
        frappe.local.login_manager.logout()
        gen_response(200, "Logged Out")
    except Exception as e:
        return exception_handel(e)


def gen_response(status, message, data=[]):
    frappe.response["http_status_code"] = status
    if status == 500:
        frappe.response["message"] = BeautifulSoup(str(message)).get_text()
    else:
        frappe.response["message"] = message
    frappe.response["data"] = data


def exception_handel(e):
    frappe.log_error(title="Mobile App Error", message=frappe.get_traceback())
    if hasattr(e, "http_status_code"):
        return gen_response(e.http_status_code, cstr(e))
    else:
        return gen_response(500, cstr(e))


def generate_key(user):
    user_details = frappe.get_doc("User", user)
    api_secret = api_key = ""   
    if not user_details.api_key and not user_details.api_secret:
        api_secret = frappe.generate_hash(length=15)
        api_key = frappe.generate_hash(length=15)
        user_details.api_key = api_key
        user_details.api_secret = api_secret
        user_details.save(ignore_permissions=True)
    else:
        api_secret = user_details.get_password("api_secret")
        api_key = user_details.get("api_key")
    return {"api_secret": api_secret, "api_key": api_key} 





@frappe.whitelist(allow_guest=True)
def send_otp(email):
    """
    Send OTP to user's email for password reset
    """
    try:
        import random
        import string
        from frappe.utils import now, add_to_date, now_datetime, get_datetime
        
        # Validate email
        if not email or not '@' in email:
            return gen_response(400, "Invalid email address")
        
        # Check if user exists
        if not frappe.db.exists("User", {"email": email}):
            return gen_response(400, "No account found with this email address")
        
        # Generate 6-digit OTP
        otp = ''.join(random.choices(string.digits, k=6))
        
        # Check if OTP record exists for this email
        if frappe.db.exists("Email OTP Verification", {"email_id": email}):
            # Update existing record
            otp_doc = frappe.get_doc("Email OTP Verification", {"email_id": email})
        else:
            # Create new OTP record
            otp_doc = frappe.new_doc("Email OTP Verification")
            otp_doc.email_id = email
        
        # Update otp_send field (not otp_code)
        otp_doc.otp_send = otp
        otp_doc.verified = 0
        otp_doc.expiry_time = add_to_date(now(), hours=1)  # OTP expires in 1 hour
        otp_doc.save(ignore_permissions=True)
        frappe.db.commit()
        
        # Send OTP email immediately with optimized settings
        try:
            # Use faster email sending with multiple optimizations
            frappe.sendmail(
                recipients=[email],
                subject="Password Reset OTP",
                message=f"""
                <p>Your OTP for password reset is: <strong>{otp}</strong></p>
                <p>This OTP will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
                """,
                reference_doctype="Email OTP Verification",
                reference_name=otp_doc.name,
                queue='now',  # Send immediately, don't queue
                now=True,     # Force immediate sending
                retry=0       # No retries for faster delivery
            )
        except Exception as e:
            frappe.log_error(f"Failed to send OTP email: {str(e)}", "OTP Email Error")
            # For development/testing, return OTP in response if email fails
            return gen_response(200, f"OTP sent successfully. For testing: {otp}")
        
        return gen_response(200, "OTP sent successfully to your email")
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Send OTP Error")
        return gen_response(500, f"Failed to send OTP: {str(e)}")


@frappe.whitelist(allow_guest=True)
def verify_otp(email, otp):
    """
    Verify OTP for password reset
    """
    try:
        from frappe.utils import now, now_datetime, get_datetime
        
        # Validate inputs
        if not email or not otp:
            return gen_response(400, "Email and OTP are required")
        
        if not otp.isdigit() or len(otp) != 6:
            return gen_response(400, "Invalid OTP format")
        
        # Get OTP record by email first
        otp_doc_name = frappe.db.get_value("Email OTP Verification", {"email_id": email}, "name")
        
        if not otp_doc_name:
            return gen_response(400, "No OTP found for this email")
        
        # Get the full document to check otp_send field
        otp_doc = frappe.get_doc("Email OTP Verification", otp_doc_name)
        
        # Check if OTP matches the latest otp_send
        if str(otp_doc.otp_send) != otp:
            return gen_response(400, "Invalid OTP")
        
        # Check if already verified
        if otp_doc.verified:
            return gen_response(400, "OTP already used")
        
        # Check expiry
        if now_datetime() > get_datetime(otp_doc.expiry_time):
            return gen_response(400, "OTP has expired")
        
        # Mark as verified
        otp_doc.verified = 1
        otp_doc.save(ignore_permissions=True)
        frappe.db.commit()
        
        return gen_response(200, "OTP verified successfully")
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Verify OTP Error")
        return gen_response(500, f"Failed to verify OTP: {str(e)}")


@frappe.whitelist(allow_guest=True)
def reset_password_with_otp(email, new_password):
    """
    Reset password using OTP verification
    First checks if OTP is verified for the email, then resets password
    """
    try:
        # Check if OTP is verified for this email
        otp_doc_name = frappe.db.get_value(
            "Email OTP Verification",
            {"email_id": email, "verified": 1},
            "name"
        )
        
        if not otp_doc_name:
            return gen_response(400, "OTP not verified. Please verify OTP first.")
        
        # Find user with this email
        user = frappe.db.get_value("User", {"email": email}, "name")
        
        if not user:
            return gen_response(400, "No account found with this email address.")
        
        # Validate new password
        if not new_password or len(new_password) < 6:
            return gen_response(400, "Password must be at least 6 characters long.")
        
        # Update password
        update_password(user, new_password)
        
        # Clean up OTP record after successful password reset
        frappe.delete_doc("Email OTP Verification", otp_doc_name, ignore_permissions=True)
        frappe.db.commit()
        
        return gen_response(200, "Password reset successfully!")
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Reset Password with OTP Error")
        return gen_response(500, f"Error resetting password: {str(e)}")


@frappe.whitelist()
def create_hospital(hospital_id, hospital_name):
    try:
        # Check duplicate hospital_id
        if frappe.db.exists("Hospital", {"hospital_id": hospital_id}):
            return gen_response(400, f"Hospital ID '{hospital_id}' already exists")

        # Check duplicate hospital_name
        if frappe.db.exists("Hospital", {"hospital_name": hospital_name}):
            return gen_response(400, f"Hospital Name '{hospital_name}' already exists")

        hospital = frappe.new_doc("Hospital")
        hospital.hospital_id = hospital_id
        hospital.hospital_name = hospital_name

        hospital.insert(ignore_permissions=True)
        frappe.db.commit()

        return gen_response(200, f"Hospital '{hospital_name}' created successfully", {
            "hospital_id": hospital_id,
            "hospital_name": hospital_name,
            "name": hospital.name
        })

    except frappe.exceptions.ValidationError as ve:
        return gen_response(400, str(ve))

    except Exception as e:
        frappe.log_error(title="Create Hospital Error", message=frappe.get_traceback())
        return gen_response(500, f"Failed to create hospital: {str(e)}")