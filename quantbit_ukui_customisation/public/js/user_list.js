frappe.listview_settings['User'] = {
	add_fields: ["enabled", "user_type"],
	get_indicator: function(doc) {
		if (doc.enabled) {
			return [__("Active"), "green", "enabled,=,1"];
		} else {
			return [__("Disabled"), "red", "enabled,=,0"];
		}
	},
	onload: function(listview) {
		listview.page.add_button(__("Go Back to Medical Assessments"), function() {
			window.location.href = "/medical_assesment_list";
		}).addClass("btn-pink-medical");
		
		if (!$('#pink-button-style').length) {
			$('<style id="pink-button-style">')
				.html('.btn-pink-medical { background-color: #ec4899 !important; color: white !important; border-color: #ec4899 !important; } .btn-pink-medical:hover { background-color: #db2777 !important; border-color: #db2777 !important; }')
				.appendTo('head');
		}
	}
};
