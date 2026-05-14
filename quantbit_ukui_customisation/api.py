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
            
            # Get all roles assigned to the user
            user_roles = [role.role for role in user_doc.roles if role.role]
            
            # Check if user has Medical Assessment Editor role specifically
            has_medical_assessment_editor = "Medical Assessment Editor" in user_roles
            has_system_manager = "System Manager" in user_roles
            
            return {
                "role_profile": user_doc.role_profile_name,
                "user": user,
                "roles": user_roles,
                "has_medical_assessment_editor": has_medical_assessment_editor,
                "has_system_manager": has_system_manager,
                "can_edit_submitted": has_medical_assessment_editor or has_system_manager
            }
        return {
            "role_profile": None,
            "user": user,
            "roles": [],
            "has_medical_assessment_editor": False,
            "has_system_manager": False,
            "can_edit_submitted": False
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
        
        # Send OTP email immediately
        try:
            # Use faster email sending with multiple optimizations
            frappe.sendmail(
                recipients=[email],
                subject="Password Reset OTP - AIM4SafeBaby",
                message=f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #ec4899;">AIM4SafeBaby - Password Reset</h2>
                    <p>Your One-Time Password (OTP) for password reset is:</p>
                    <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <span style="font-size: 24px; font-weight: bold; color: #1f2937; letter-spacing: 3px;">{otp}</span>
                    </div>
                    <p><strong>Important:</strong></p>
                    <ul>
                        <li>This OTP will expire in 1 hour</li>
                        <li>Never share this OTP with anyone</li>
                        <li>If you didn't request this, please ignore this email</li>
                    </ul>
                    <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                        This is an automated message from AIM4SafeBaby Clinical Research Portal.
                        Please do not reply to this email.
                    </p>
                </div>
                """,
                reference_doctype="Email OTP Verification",
                reference_name=otp_doc.name,
                now=True,     # Force immediate sending
                header="Password Reset OTP"
            )
            
            # Log successful email sending
            frappe.logger().info(f"OTP email sent successfully to {email}")
            
        except Exception as e:
            frappe.log_error(f"Failed to send OTP email to {email}: {str(e)}", "OTP Email Error")
            # Don't fall back to testing mode - return proper error
            return gen_response(500, f"Failed to send email. Please check your email configuration and try again.")
        
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


@frappe.whitelist(allow_guest=False)
def delete_medical_assessment(assessment_name):
    """
    Delete a single Medical Assessment document
    """
    try:
        if not assessment_name:
            return gen_response(400, "Assessment name is required")
        
        # Check if assessment exists
        if not frappe.db.exists("Medical Assessment", assessment_name):
            return gen_response(404, f"Medical Assessment '{assessment_name}' not found")
        
        # Check delete permissions
        if not frappe.has_permission("Medical Assessment", "delete", assessment_name):
            return gen_response(403, "You don't have permission to delete this assessment")
        
        # Delete the document
        frappe.delete_doc("Medical Assessment", assessment_name)
        frappe.db.commit()
        
        return gen_response(200, f"Medical Assessment '{assessment_name}' deleted successfully")
        
    except frappe.PermissionError:
        return gen_response(403, "You don't have permission to delete this assessment")
    except frappe.DoesNotExistError:
        return gen_response(404, "Medical Assessment not found")
    except Exception as e:
        frappe.log_error(title="Delete Medical Assessment Error", message=frappe.get_traceback())
        return gen_response(500, f"Failed to delete assessment: {str(e)}")


@frappe.whitelist(allow_guest=False)
def delete_medical_assessment_get(assessment_name):
    """
    Delete a single Medical Assessment document (GET method for easier CSRF handling)
    Implements cancel-then-delete functionality for submitted documents
    """
    try:
        if not assessment_name:
            return gen_response(400, "Assessment name is required")
        
        # Check if assessment exists
        if not frappe.db.exists("Medical Assessment", assessment_name):
            return gen_response(404, f"Medical Assessment '{assessment_name}' not found")
        
        # Check delete permissions
        if not frappe.has_permission("Medical Assessment", "delete", assessment_name):
            return gen_response(403, "You don't have permission to delete this assessment")
        
        # Get current document status
        current_docstatus = frappe.db.get_value("Medical Assessment", assessment_name, "docstatus")
        
        # If document is submitted (docstatus = 1), cancel it first
        if current_docstatus == 1:
            try:
                # Cancel the submitted document using SQL update for better control
                frappe.db.sql("""
                    UPDATE `tabMedical Assessment` 
                    SET docstatus = 2, modified = %s 
                    WHERE name = %s AND docstatus = 1
                """, (frappe.utils.now(), assessment_name))
                frappe.db.commit()
                
                # Verify the cancellation
                updated_docstatus = frappe.db.get_value("Medical Assessment", assessment_name, "docstatus")
                if updated_docstatus != 2:
                    return gen_response(500, f"Failed to cancel document. Current status: {updated_docstatus}")
                    
            except Exception as cancel_error:
                frappe.log_error(title="Cancel Document Error", message=f"Failed to cancel {assessment_name}: {str(cancel_error)}")
                return gen_response(500, f"Failed to cancel submitted document: {str(cancel_error)}")
        
        # Now delete the document
        frappe.delete_doc("Medical Assessment", assessment_name)
        frappe.db.commit()
        
        return gen_response(200, f"Medical Assessment '{assessment_name}' deleted successfully")
        
    except frappe.PermissionError:
        return gen_response(403, "You don't have permission to delete this assessment")
    except frappe.DoesNotExistError:
        return gen_response(404, "Medical Assessment not found")
    except Exception as e:
        frappe.log_error(title="Delete Medical Assessment Error", message=frappe.get_traceback())
        return gen_response(500, f"Failed to delete assessment: {str(e)}")


@frappe.whitelist(allow_guest=False)
def delete_multiple_medical_assessments(assessment_names):
    """
    Delete multiple Medical Assessment documents
    """
    try:
        if not assessment_names or not isinstance(assessment_names, list):
            return gen_response(400, "Assessment names list is required")
        
        if len(assessment_names) == 0:
            return gen_response(400, "No assessments selected for deletion")
        
        deleted_count = 0
        failed_assessments = []
        
        for assessment_name in assessment_names:
            try:
                # Check if assessment exists
                if not frappe.db.exists("Medical Assessment", assessment_name):
                    failed_assessments.append(f"{assessment_name} (not found)")
                    continue
                
                # Check delete permissions
                if not frappe.has_permission("Medical Assessment", "delete", assessment_name):
                    failed_assessments.append(f"{assessment_name} (no permission)")
                    continue
                
                # Delete the document
                frappe.delete_doc("Medical Assessment", assessment_name)
                deleted_count += 1
                
            except Exception as e:
                failed_assessments.append(f"{assessment_name} ({str(e)})")
        
        # Commit all successful deletions
        if deleted_count > 0:
            frappe.db.commit()
        
        # Prepare response message
        if deleted_count > 0 and len(failed_assessments) == 0:
            message = f"Successfully deleted {deleted_count} assessment(s)"
        elif deleted_count > 0 and len(failed_assessments) > 0:
            message = f"Successfully deleted {deleted_count} assessment(s). Failed to delete: {', '.join(failed_assessments)}"
        else:
            message = f"Failed to delete any assessments. Issues: {', '.join(failed_assessments)}"
        
        status_code = 200 if deleted_count > 0 else 400
        
        return gen_response(status_code, message, {
            "deleted_count": deleted_count,
            "failed_count": len(failed_assessments),
            "failed_assessments": failed_assessments
        })
        
    except Exception as e:
        frappe.log_error(title="Delete Multiple Medical Assessments Error", message=frappe.get_traceback())
        return gen_response(500, f"Failed to delete assessments: {str(e)}")


@frappe.whitelist(allow_guest=False)
def delete_multiple_medical_assessments_get(assessment_names_json):
    """
    Delete multiple Medical Assessment documents (GET method for easier CSRF handling)
    Implements cancel-then-delete functionality for submitted documents
    """
    try:
        import json
        
        # Parse JSON string from URL parameter
        assessment_names = json.loads(assessment_names_json)
        
        if not assessment_names or not isinstance(assessment_names, list):
            return gen_response(400, "Assessment names list is required")
        
        if len(assessment_names) == 0:
            return gen_response(400, "No assessments selected for deletion")
        
        deleted_count = 0
        failed_assessments = []
        
        for assessment_name in assessment_names:
            try:
                # Check if assessment exists
                if not frappe.db.exists("Medical Assessment", assessment_name):
                    failed_assessments.append(f"{assessment_name} (not found)")
                    continue
                
                # Check delete permissions
                if not frappe.has_permission("Medical Assessment", "delete", assessment_name):
                    failed_assessments.append(f"{assessment_name} (no permission)")
                    continue
                
                # Get current document status
                current_docstatus = frappe.db.get_value("Medical Assessment", assessment_name, "docstatus")
                
                # If document is submitted (docstatus = 1), cancel it first
                if current_docstatus == 1:
                    try:
                        # Cancel the submitted document using SQL update for better control
                        frappe.db.sql("""
                            UPDATE `tabMedical Assessment` 
                            SET docstatus = 2, modified = %s 
                            WHERE name = %s AND docstatus = 1
                        """, (frappe.utils.now(), assessment_name))
                        
                        # Verify the cancellation
                        updated_docstatus = frappe.db.get_value("Medical Assessment", assessment_name, "docstatus")
                        if updated_docstatus != 2:
                            failed_assessments.append(f"{assessment_name} (cancel failed: status {updated_docstatus})")
                            continue
                            
                    except Exception as cancel_error:
                        frappe.log_error(title="Cancel Document Error", message=f"Failed to cancel {assessment_name}: {str(cancel_error)}")
                        failed_assessments.append(f"{assessment_name} (cancel failed: {str(cancel_error)})")
                        continue
                
                # Now delete the document
                frappe.delete_doc("Medical Assessment", assessment_name)
                deleted_count += 1
                
            except Exception as e:
                failed_assessments.append(f"{assessment_name} ({str(e)})")
        
        # Commit all successful deletions
        if deleted_count > 0:
            frappe.db.commit()
        
        # Prepare response message
        if deleted_count > 0 and len(failed_assessments) == 0:
            message = f"Successfully deleted {deleted_count} assessment(s)"
        elif deleted_count > 0 and len(failed_assessments) > 0:
            message = f"Successfully deleted {deleted_count} assessment(s). Failed to delete: {', '.join(failed_assessments)}"
        else:
            message = f"Failed to delete any assessments. Issues: {', '.join(failed_assessments)}"
        
        status_code = 200 if deleted_count > 0 else 400
        
        return gen_response(status_code, message, {
            "deleted_count": deleted_count,
            "failed_count": len(failed_assessments),
            "failed_assessments": failed_assessments
        })
        
    except json.JSONDecodeError:
        return gen_response(400, "Invalid assessment names format")
    except Exception as e:
        frappe.log_error(title="Delete Multiple Medical Assessments GET Error", message=frappe.get_traceback())
        return gen_response(500, f"Failed to delete assessments: {str(e)}")


@frappe.whitelist(allow_guest=False)
def update_cancelled_medical_assessment(document_name, form_data):
    """
    Update a cancelled Medical Assessment document back to draft status
    SAFE and ROBUST solution that bypasses Frappe validation
    """
    try:
        import json
        
        # Parse form data
        if isinstance(form_data, str):
            form_data = json.loads(form_data)
        
        # Check if document exists and is cancelled
        if not frappe.db.exists("Medical Assessment", document_name):
            return gen_response(404, f"Medical Assessment '{document_name}' not found")
        
        # Get current docstatus
        current_docstatus = frappe.db.get_value("Medical Assessment", document_name, "docstatus")
        if current_docstatus != 2:
            return gen_response(400, f"Document '{document_name}' is not cancelled. Current status: {current_docstatus}")
        
        # Get all valid columns from the Medical Assessment table
        columns_query = """
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'tabMedical Assessment'
        """
        valid_columns = [row[0] for row in frappe.db.sql(columns_query)]
        
        # Build safe SET clause with only valid columns and non-empty values
        set_clauses = []
        values = []
        
        # Always update docstatus to 0 (draft)
        set_clauses.append("docstatus = %s")
        values.append(0)
        
        # Update only valid, non-empty form fields
        for key, value in form_data.items():
            # Skip system fields and invalid columns
            if key in ['name', 'creation', 'modified', 'owner', 'modified_by', 'docstatus']:
                continue
            
            # Only update if column exists and value is not empty
            if key in valid_columns and value is not None and str(value).strip() != '':
                # Handle different data types safely
                if isinstance(value, bool):
                    set_clauses.append(f"`{key}` = %s")
                    values.append(1 if value else 0)
                else:
                    set_clauses.append(f"`{key}` = %s")
                    values.append(str(value))
        
        # Always update modified timestamp
        set_clauses.append("modified = %s")
        values.append(frappe.utils.now())
        
        # If no valid fields to update, just update docstatus and modified
        if len(set_clauses) <= 2:  # Only docstatus and modified
            sql = """
                UPDATE `tabMedical Assessment` 
                SET docstatus = %s, modified = %s 
                WHERE name = %s
            """
            values = [0, frappe.utils.now(), document_name]
        else:
            # Build safe SQL query with proper parameterization
            sql = f"""
                UPDATE `tabMedical Assessment` 
                SET {', '.join(set_clauses)} 
                WHERE name = %s
            """
            values.append(document_name)
        
        # Execute the safe SQL query
        frappe.db.sql(sql, values)
        frappe.db.commit()
        
        # Verify the update
        new_docstatus = frappe.db.get_value("Medical Assessment", document_name, "docstatus")
        
        return gen_response(200, f"Medical Assessment '{document_name}' updated successfully", {
            "name": document_name,
            "docstatus": new_docstatus,
            "updated_fields": len(set_clauses) - 2  # Exclude docstatus and modified
        })
        
    except Exception as e:
        frappe.log_error(title="Update Cancelled Medical Assessment Error", message=frappe.get_traceback())
        return gen_response(500, f"Failed to update cancelled assessment: {str(e)}")


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


@frappe.whitelist(allow_guest=False)
def create_new_medical_assessment():
    """
    Create a new Medical Assessment document and return its name
    """
    try:
        doc = frappe.new_doc("Medical Assessment")
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return {
            "status": "success",
            "name": doc.name
        }
    except Exception as e:
        frappe.log_error(title="Create New Medical Assessment Error", message=frappe.get_traceback())
        return gen_response(500, f"Failed to create new assessment: {str(e)}")
