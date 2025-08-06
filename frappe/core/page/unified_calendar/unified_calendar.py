import json

import frappe
import frappe.utils

# @frappe.whitelist()
# def get_unified_events(start, end, field_map):

# 	print(field_map, type(field_map), start, end, "field_map, start, end \n\n\n\nn\n\n\n")

# 	raw_hook_values = frappe.get_hooks("unified_calendar_field_map")

# 	calendar_events = []

# 	for doctype, config in raw_hook_values.items():
# 		# Frappe wraps hook values in lists, even if we defined strings in hooks.py.
# 		# e.g. config["start_field"] returns ["starts_on"] not "starts_on"
# 		start_field = config["start_field"]
# 		if isinstance(start_field, list):
# 			start_field = start_field[0]

# 		end_field = config.get("end_field")
# 		if isinstance(end_field, list):
# 			end_field = end_field[0] if end_field else None

# 		title_field = config.get("title_field", "name")
# 		if isinstance(title_field, list):
# 			title_field = title_field[0] if title_field else "name"

# 		color = config.get("color", "#888")
# 		if isinstance(color, list):
# 			color = color[0] if color else "#888"

# 		bg_color = config.get("bg_color", "#fff")
# 		if isinstance(bg_color, list):
# 			bg_color = bg_color[0] if bg_color else "#888"

# 		fields = ["name", start_field, title_field]
# 		if end_field:
# 			fields.append(end_field)

# 		filters = {
# 			start_field: ["between", [start, end]]
# 		},

# 		docs = frappe.get_list(
# 			doctype,
# 			fields = fields,
# 			filters = filters,
# 		)


# 		for d in docs:
# 			# start_date_time = get_datetime(d.get(start_field))
# 			# has_time = bool(start_date_time and (start_date_time.hour != 0 or start_date_time.minute != 0))

# 			# formatted_time = format_time(start_date_time) if has_time else ""
# 			# title = d.get(title_field) or doctype
# 			# if formatted_time:
# 			# 	title = f"{formatted_time} {title}"

# 			calendar_events.append({
# 				"id": d.name,
# 				"doctype": doctype,
# 				"title": d.get(title_field),
# 				"start": d.get(start_field),
# 				"end": d.get(end_field) if end_field else None,
# 				"backgroundColor": bg_color,
# 				"color": color,
# 				"textColor": color,
# 				"url": frappe.utils.data.get_url_to_form(doctype, d.name),
# 				"allDay": False
# 			})

# 	# print("Unified Calendar Events:", calendar_events)

# 	# print(get_merged_unified_calendar_field_map(), "unified calendar field map")

# 	return calendar_events


@frappe.whitelist()
def get_unified_events(start, end, field_map):
	# Convert field_map string to dictionary
	if isinstance(field_map, str):
		field_map = json.loads(field_map)

	# print(field_map, type(field_map), start, end, "field_map, start, end \n\n\n\nn\n\n\n")
	calendar_events = []

	DEFAULT_COLORS = ["#E4FAEB", "#FFF7D3", "#EEE8FF", "#FFE7E7", "#E4FAEB", "#FFE7E7", "#E6F4FF"]

	for i, (doctype, config) in enumerate(field_map.items()):
		start_field = config.get("start")
		end_field = config.get("end")
		title_field = config.get("title", "name")
		bg_color = config.get("background_color")

		if not bg_color:
			bg_color = DEFAULT_COLORS[i % len(DEFAULT_COLORS)]

		meta = frappe.get_meta(doctype)
		valid_fields = {df.fieldname for df in meta.fields}

		fields = ["name"]
		if start_field in valid_fields:
			fields.append(start_field)

		if title_field in valid_fields:
			fields.append(title_field)

		if end_field and end_field in valid_fields:
			fields.append(end_field)

		docs = frappe.get_list(doctype, fields=fields, filters={start_field: ["between", [start, end]]})

		for d in docs:
			calendar_events.append(
				{
					"id": d.name,
					"doctype": doctype,
					"title": d.get(title_field) or "name",
					"start": d.get(start_field),
					"end": d.get(end_field) if end_field else None,
					"backgroundColor": bg_color,
					"textColor": "var(--text-color)",
					"url": frappe.utils.get_url_to_form(doctype, d.name),
				}
			)

	return calendar_events


# def get_merged_unified_calendar_field_map():
# 	unified_calendars = frappe.get_hooks("unified_calendar_field_map")
# 	event_details = {}


# 	for doctype, config in unified_calendars.items() or []:
# 		print("\n\n\n Unified Calendars:", type(doctype))
# 		if isinstance(config, dict):
# 			event_details.update(config)

# 	return event_details
