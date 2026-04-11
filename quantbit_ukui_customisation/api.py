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