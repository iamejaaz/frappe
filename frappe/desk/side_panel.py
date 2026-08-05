# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and Contributors
# License: MIT. See LICENSE

import frappe
from frappe.desk.form.load import set_link_titles
from frappe.model import table_fields

DOCFIELD_KEYS = (
	"fieldname",
	"fieldtype",
	"label",
	"options",
	"depends_on",
	"hidden",
	"permlevel",
	"precision",
	"in_list_view",
	"columns",
	"hide_days",
	"hide_seconds",
	"max_rating",
)


@frappe.whitelist(methods=["GET"])
def get_preview(doctype: str, name: str):
	doc = frappe.get_doc(doctype, name)
	doc.check_permission("read")
	doc.apply_fieldlevel_read_permissions()
	set_link_titles(doc)

	return {
		"doc": doc.as_dict(),
		"metas": get_preview_metas(doctype),
		"permlevels": doc.get_permlevel_access("read"),
	}


def get_preview_metas(doctype, metas=None):
	if metas is None:
		metas = {}
	if doctype in metas:
		return metas

	meta = frappe.get_meta(doctype)
	metas[doctype] = {
		"name": meta.name,
		"istable": meta.istable,
		"is_submittable": meta.is_submittable,
		"title_field": meta.title_field,
		"states": [{"title": s.title, "color": s.color} for s in meta.states or []],
		"fields": [
			{key: df.get(key) for key in DOCFIELD_KEYS if df.get(key) is not None} for df in meta.fields
		],
	}

	for df in meta.fields:
		if df.fieldtype in table_fields and df.options:
			get_preview_metas(df.options, metas)

	return metas
