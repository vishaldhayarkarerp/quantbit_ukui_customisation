import frappe

no_cache = 1
login_required = True 

def get_context(context):
    context.user = frappe.session.user
    
    # Import the generate_key function from api.py
    from quantbit_ukui_customisation.api import generate_key
    
    # Get API credentials for the current user
    try:
        credentials = generate_key(frappe.session.user)
        api_key = credentials.get("api_key")
        api_secret = credentials.get("api_secret")
        
        # Set credentials in context
        context.api_key = api_key or ""
        context.api_secret = api_secret or ""
        
        # Debug logging
        frappe.logger().info(f"API credentials generated for user {frappe.session.user}: api_key={'SET' if api_key else 'NOT_SET'}, api_secret={'SET' if api_secret else 'NOT_SET'}")
        
        # Also add to context for debugging
        context.debug_info = {
            "user": frappe.session.user,
            "api_key_set": bool(api_key),
            "api_secret_set": bool(api_secret),
            "api_key_length": len(api_key) if api_key else 0,
            "api_secret_length": len(api_secret) if api_secret else 0
        }
        
    except Exception as e:
        context.api_key = ""
        context.api_secret = ""
        context.debug_info = {
            "error": str(e),
            "user": frappe.session.user
        }
        frappe.log_error(title="API Credentials Error", message=f"Failed to generate API credentials for user {frappe.session.user}: {str(e)}")
    
    return context
