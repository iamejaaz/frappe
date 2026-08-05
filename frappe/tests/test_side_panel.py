# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and Contributors
# License: MIT. See LICENSE

import frappe
from frappe.desk.side_panel import DOCFIELD_KEYS, get_preview
from frappe.tests import IntegrationTestCase


class TestSidePanel(IntegrationTestCase):
	def test_get_preview(self):
		todo = frappe.get_doc(doctype="ToDo", description="side panel preview").insert()
		preview = get_preview("ToDo", todo.name)

		self.assertEqual(preview["doc"]["name"], todo.name)
		self.assertEqual(preview["doc"]["description"], "side panel preview")
		self.assertIn(0, preview["permlevels"])

		meta = preview["metas"]["ToDo"]
		self.assertIn("description", {df["fieldname"] for df in meta["fields"]})
		for df in meta["fields"]:
			self.assertTrue(set(df).issubset(set(DOCFIELD_KEYS)))

	def test_no_client_assets_in_meta(self):
		todo = frappe.get_doc(doctype="ToDo", description="asset check").insert()
		preview = get_preview("ToDo", todo.name)

		for meta in preview["metas"].values():
			self.assertFalse(any(key.startswith("__") for key in meta))

	def test_child_table_metas_included(self):
		preview = get_preview("User", "Administrator")
		self.assertIn("Has Role", preview["metas"])
		self.assertTrue(any(df.get("in_list_view") for df in preview["metas"]["Has Role"]["fields"]))

	def test_permission_check(self):
		todo = frappe.get_doc(doctype="ToDo", description="perm check").insert()
		with self.set_user("Guest"), self.assertRaises(frappe.PermissionError):
			get_preview("ToDo", todo.name)
