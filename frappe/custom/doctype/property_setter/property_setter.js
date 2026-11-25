// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

frappe.ui.form.on("Property Setter", {
	refresh(frm) {
		frm.set_df_property("field_name", "ignore_validation", 1);
		frm.trigger("doc_type");
	},

	doc_type(frm) {
		const doctype = frm.doc.doc_type;
		if (!doctype) return;

		frappe.model.with_doctype(doctype, () => {
			frm.fields_dict.field_name.set_data(
				frappe.get_meta(doctype).fields.map((df) => ({
					label: df.fieldname,
					value: df.fieldname,
					description: df.label,
				}))
			);
		});
	},

	validate: function (frm) {
		if (frm.doc.property_type == "Check" && !["0", "1"].includes(frm.doc.value)) {
			frappe.throw(__("Value for a check field can be either 0 or 1"));
		}
	},
});
