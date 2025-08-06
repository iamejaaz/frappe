frappe.pages["unified-calendar"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Unified Calendar",
		single_column: true,
	});

	const calendar_wrapper = $('<div class="calendar-wrapper"></div>').appendTo(page.body);

	frappe.require("calendar.bundle.js", () => {
		let field_map = {};
		Promise.all(
			frappe.boot.calendars.map((doctype) =>
				frappe.model.with_doctype(doctype).then(() => {
					const calendar_view = frappe.views.calendar[doctype];
					if (calendar_view && calendar_view.field_map) {
						field_map[doctype] = calendar_view.field_map;
						field_map[doctype].method = calendar_view.get_events_method;
					}
				})
			)
		).then(() => {
			const calendar = new frappe.views.Calendar({
				parent: calendar_wrapper,
				page: page,
				get_args(start, end) {
					return {
						start: frappe.datetime.convert_to_system_tz(start),
						end: frappe.datetime.convert_to_system_tz(end),
						filters: {},
						field_map: this.field_map,
					};
				},
				options: {
					events: function (fetchInfo, successCallback, failureCallback) {
						// const selected_doctypes = Array.from(
						// 	document.querySelectorAll('.calendar-doctype-checkbox:checked')
						// ).map(input => input.dataset.doctype);

						// const filtered_field_map = {};
						// selected_doctypes.forEach(dt => {
						// 	if (field_map[dt]) filtered_field_map[dt] = field_map[dt];
						// });

						// console.log(field_map, "Filtered Field Map");

						// This is automatically called by FullCalendar to fetch events
						frappe.call({
							method: "frappe.core.page.unified_calendar.unified_calendar.get_unified_events",
							args: {
								start: frappe.datetime.convert_to_system_tz(fetchInfo.startStr),
								end: frappe.datetime.convert_to_system_tz(fetchInfo.endStr),
								field_map: field_map,
								filters: {},
							},
							callback: function (r) {
								if (r.message) {
									// buildLegendFromEvents(r.message);
									successCallback(r.message);
									// console.log(field_map, "Field Map");
									const seen = new Set();
									for (let ev of r.message) {
										if (!seen.has(ev.doctype)) {
											seen.add(ev.doctype);
											field_map[ev.doctype].backgroundColor =
												ev.backgroundColor;
										}
									}

									injectCalendarFilterDropdown(field_map, calendar);
								} else {
									failureCallback("No events");
								}
							},
						});
					},
					select: function (info) {
						// this is to prevent the default behavior of creating a new event
					},
					editable: false,
					eventDidMount: function (info) {
						info.el.setAttribute("data-doctype", info.event.extendedProps.doctype);
					},
				},
			});
		});
		// frappe.boot.calendars.map(doctype =>
		// 	frappe.model.with_doctype(doctype).then(() => {
		// 		const calendar_view = frappe.views.calendar[doctype];
		// 		if (calendar_view && calendar_view.field_map) {
		// 			field_map[doctype] = calendar_view.field_map;
		// 		}
		// 	})
		// )
		// console.log(frappe.views.calendar, "calendar view");
		// loop through all calendars and load their doctype and the store in a field map

		// const calendar = new frappe.views.Calendar({
		// 	parent: calendar_wrapper,
		// 	page: page,
		// 	get_args(start, end) {
		// 		return {
		// 			start: frappe.datetime.convert_to_system_tz(start),
		// 			end: frappe.datetime.convert_to_system_tz(end),
		// 			filters: {},
		// 			field_map: this.field_map
		// 		};
		// 	},
		// 	options: {
		// 		// eventDidMount: function(info) {
		// 		// 	// This function is called after an event is rendered.
		// 		// 	// You can use it to update the legend.
		// 		// 	console.log("Event mounted:", info.backgroundColor, info.event.extendedProps.doctype);
		// 		// },
		// 		events: function(fetchInfo, successCallback, failureCallback) {
		// 			console.log(fetchInfo, "fetchInfo");

		// 			// This is automatically called by FullCalendar to fetch events
		// 			frappe.call({
		// 				method: "frappe.core.page.unified_calendar.unified_calendar.get_unified_events",
		// 				args: {
		// 					start: frappe.datetime.convert_to_system_tz(fetchInfo.startStr),
		// 					end: frappe.datetime.convert_to_system_tz(fetchInfo.endStr),
		// 					field_map: field_map,
		// 					filters: {},
		// 				},
		// 				callback: function(r) {
		// 					if (r.message) {
		// 						buildLegendFromEvents(r.message);
		// 						successCallback(r.message);
		// 					} else {
		// 						failureCallback("No events");
		// 					}
		// 				}
		// 			});
		// 		},
		// 		select: function (info) {
		// 			// this is to prevent the default behavior of creating a new event
		// 		},
		// 		editable: false, // Disable editing events directly on the calendar
		// 		eventDidMount: function(info) {

		// 			let bg_color = info.backgroundColor;
		// 			if (!frappe.ui.color.validate_hex(bg_color) || !bg_color) {
		// 				bg_color = frappe.ui.color.get("blue", "extra-light");
		// 			}
		// 			let color = info.color || frappe.ui.color.get_contrast_color(bg_color);
		// 			info.el.style.backgroundColor = bg_color;
		// 			info.el.style.borderColor = bg_color;
		// 			info.el.style.textColor = color;
		// 			// info.el.style.color = color;
		// 			// console.log(info.el.style);

		// 			// console.log(frappe.ui.color.get_contrast_color(color), "contrast color", color);

		// 			// if (bg_color) {
		// 				// if (this.get_css_class) {
		// 				// 	color_name = this.get_css_class(d);
		// 				// 	color_name = this.color_map[color_name] || color_name || "blue";

		// 				// 	if (color_name.startsWith("#")) {
		// 				// 		color_name = frappe.ui.color.validate_hex(color_name) ? color_name : "blue";
		// 				// 	}

		// 				// 	info.d.backgroundColor = frappe.ui.color.get(color_name, "extra-light");
		// 				// 	info.d.textColor = frappe.ui.color.get(color_name, "dark");
		// 				// } else {

		// 				// }
		// 				// info.el.style.backgroundColor = bg_color;
		// 				// info.el.style.borderColor = bg_color;
		// 				// info.el.style.color = "#fff"; // Ensure text is readable
		// 			// }
		// 		},
		// 	},
		// 	// get_events_method: "frappe.core.page.unified_calendar.unified_calendar.get_unified_events",
		// });

		// Build dynamic legend from frappe.boot.unified_calendar_field_map
		// const fieldMap = frappe.boot.unified_calendar_field_map || {};
		// const legendData = Object.values(fieldMap)
		// 	.filter(item => item && item.color && item.label)
		// 	.map(item => ({
		// 		color: item.color,
		// 		label: item.label
		// 	}));

		// console.log(fieldMap);

		// if (legendData.length) {
		// 	const $legend = $(`
		// 		<div class="calendar-legend" style="margin-top: 16px; display: flex; gap: 16px;">
		// 			${legendData.map(item => `
		// 				<div style="display: flex; align-items: center; gap: 6px;">
		// 					<span style="display: inline-block; width: 14px; height: 14px; background: ${item.color}; border-radius: 3px; border: 1px solid #ccc;"></span>
		// 					<span style="font-size: 90%;">${item.label}</span>
		// 				</div>
		// 			`).join("")}
		// 		</div>
		// 	`);
		// 	calendar_wrapper.append($legend);
		// }
	});
};

// $('.calendar-doctype-checkbox').on('change', () => {
// 	// this will refresh events
// 	calendar.calendar.refetchEvents();
// });

function injectCalendarFilterDropdown(field_map, calendar) {
	const doctypes = Object.keys(field_map);

	// Create the dropdown container
	const $filterContainer = $(`
		<div class="dropdown calendar-doctype-filter" style="margin-left: 10px;">
			<button class="btn btn-default dropdown-toggle" type="button" data-toggle="dropdown">
				Calendars
			</button>
			<ul class="dropdown-menu" style="padding: 10px;">
				${doctypes
					.map(
						(doctype) => `
					<li style="margin-bottom: 4px;">
						<label style="display: flex; align-items: center; gap: 6px;">
							<input type="checkbox" class="calendar-doctype-checkbox" data-doctype="${doctype}" checked>
							<span style="display: inline-block; width: 10px; height: 10px; background: ${
								field_map[doctype].backgroundColor || "#888"
							}; border-radius: 2px;"></span>
							${doctype}
						</label>
					</li>
				`
					)
					.join("")}
			</ul>
		</div>
	`);
	// console.log($filterContainer);

	// Add the dropdown to the second child of .fc-toolbar-chunk
	const toolbarChunks = document.querySelectorAll(".fc-toolbar-chunk");
	// console.log("chunk", toolbarChunks);
	if (toolbarChunks.length > 2) {
		toolbarChunks[2].style.display = "flex";
		toolbarChunks[2].prepend($filterContainer[0]);
	}

	// Handle checkbox changes
	$filterContainer.find("input.calendar-doctype-checkbox").on("change", () => {
		const selected = [];
		$filterContainer.find("input.calendar-doctype-checkbox:checked").each(function () {
			selected.push($(this).data("doctype"));
		});

		// ✅ set selected doctypes in FullCalendar's option
		// calendar.calendar.setOption("filterDoctypes", selected);

		// ✅ refresh events
		// console.log(calendar.fullCalendar.refetchEvents());

		// calendar.calendar.refetchEvents();
	});
}

function buildLegendFromEvents(events) {
	// Clear if already present
	$(".unified-calendar-legend").remove();

	const container = $(`
		<div class="unified-calendar-legend flex gap-4 px-4 pb-2 pt-2 border-b items-center text-sm font-medium"></div>
	`).prependTo(".calendar-wrapper");

	const seen = new Set();
	for (let ev of events) {
		if (!seen.has(ev.doctype)) {
			seen.add(ev.doctype);

			const tag = $(`
				<div class="d-flex align-items-center pr-2 py-1">
					<span class="badge mr-1 p-2" style="background:${ev.backgroundColor}; color: ${ev.textColor}">${ev.doctype}</span>
				</div>
			`);
			container.append(tag);
		}
	}
}

// frappe.pages['unified-calendar'].on_page_load = function(wrapper) {
// 	var page = frappe.ui.make_app_page({
// 		parent: wrapper,
// 		title: __("Unified Calendar"),
// 		single_column: true
// 	});

// 	frappe.breadcrumbs.add("Setup");

// 	$("<div class='perm-engine' style='min-height: 200px; padding: 15px;'></div>").appendTo(
// 		page.main
// 	);

// 	// $(frappe.render_template("permission_manager_help", {})).appendTo(page.main);
// 	// wrapper.unified_calendar = calendar_settings;
// 	wrapper.unified_calendar = new frappe.UnifiedCalendar(wrapper);
// }
// frappe.pages["unified-calendar"].refresh = function (wrapper) {
// 	wrapper.unified_calendar.set_from_route();
// 	frappe.breadcrumbs.add("Setup");
// };

// frappe.UnifiedCalendar = class UnifiedCalendar {
// 	constructor(wrapper) {
// 		this.wrapper = wrapper;
// 		this.page = wrapper.page;
// 		this.body = $(this.wrapper).find(".perm-engine");
// 		this.make();
// 		this.refresh();
// 		this.add_check_events();
// 	}

// 	make() {
// 		this.make_reset_button();
// 		frappe
// 			.call({
// 				module: "frappe.core",
// 				page: "permission_manager",
// 				method: "get_roles_and_doctypes",
// 			})
// 			.then((res) => {
// 				this.options = res.message;
// 				this.setup_page();
// 			});
// 	}

// 	setup_page() {
// 		this.doctype_select = this.wrapper.page.add_field({
// 			fieldname: "doctype_select",
// 			label: __("Document Type"),
// 			fieldtype: "Link",
// 			options: "DocType",
// 			get_query: function () {
// 				return {
// 					filters: {
// 						istable: 0,
// 					},
// 				};
// 			},
// 			change: function () {
// 				frappe.set_route("permission-manager", this.get_value());
// 			},
// 		});
// 		this.set_from_route();
// 	}

// 	set_from_route() {
// 		if (!this.doctype_select) {
// 			// selects not yet loaded, call again after a bit
// 			setTimeout(() => {
// 				this.set_from_route();
// 			}, 500);
// 			return;
// 		}
// 		if (frappe.get_route()[1]) {
// 			this.doctype_select.set_value(frappe.get_route()[1]);
// 		} else if (frappe.route_options) {
// 			if (frappe.route_options.doctype) {
// 				this.doctype_select.set_value(frappe.route_options.doctype);
// 			}
// 			frappe.route_options = null;
// 		}
// 		this.refresh();
// 	}

// 	get_standard_permissions(callback) {
// 		let doctype = this.get_doctype();
// 		if (doctype) {
// 			return frappe.call({
// 				module: "frappe.core",
// 				page: "permission_manager",
// 				method: "get_standard_permissions",
// 				args: { doctype: doctype },
// 				callback: callback,
// 			});
// 		}
// 		return false;
// 	}

// 	reset_std_permissions(data) {
// 		let doctype = this.get_doctype();
// 		let d = frappe.confirm(__("Reset Permissions for {0}?", [__(doctype)]), () => {
// 			return frappe
// 				.call({
// 					module: "frappe.core",
// 					page: "permission_manager",
// 					method: "reset",
// 					args: { doctype },
// 				})
// 				.then(() => {
// 					this.refresh();
// 				});
// 		});

// 		// show standard permissions
// 		let $d = $(d.wrapper)
// 			.find(".frappe-confirm-message")
// 			.append(`<hr><h5>${__("Standard Permissions")}:</h5><br>`);
// 		let $wrapper = $("<p></p>").appendTo($d);
// 		data.message.forEach((d) => {
// 			let rights = this.rights
// 				.filter((r) => d[r])
// 				.map((r) => {
// 					return __(toTitle(frappe.unscrub(r)));
// 				});

// 			d.rights = rights.join(", ");

// 			$wrapper.append(`<div class="row">\
// 				<div class="col-xs-5"><b>${__(d.role)}</b>, ${__("Level")} ${d.permlevel || 0}</div>\
// 				<div class="col-xs-7">${d.rights}</div>\
// 			</div><br>`);
// 		});
// 	}

// 	get_doctype() {
// 		return this.doctype_select.get_value();
// 	}

// 	set_empty_message(message) {
// 		this.body.html(`
// 		<div class="text-muted flex justify-center align-center" style="min-height: 300px;">
// 			<p class='text-muted'>
// 				${message}
// 			</p>
// 		</div>`);
// 	}

// 	refresh() {
// 		this.page.clear_secondary_action();
// 		this.page.clear_primary_action();

// 		if (!this.doctype_select) {
// 			return this.set_empty_message(__("Loading"));
// 		}

// 		let doctype = this.get_doctype();

// 		if (!doctype) {
// 			return this.set_empty_message(__("Select Document Type or Role to start."));
// 		}

// 		let calendar_settings = frappe.views.calendar["TFS Combi View"] = {
// 			field_map: {
// 				"start": "exp_start_date",
// 				"end": "exp_end_date",
// 				"title": "subject",
// 				"eventColor": "color"
// 			},
// 			gantt: true,

// 			get_events_method: "the_factory_suite.events.get_events.get_events"
// 		}

// 		// get permissions
// 		frappe
// 			.call({
// 				module: "frappe.core",
// 				page: "permission_manager",
// 				method: "get_permissions",
// 				args: { doctype },
// 			})
// 			.then((r) => {
// 				this.render(r.message);
// 			});
// 	}

// 	render(perm_list) {
// 		this.body.empty();
// 		this.perm_list = perm_list || [];
// 		if (!this.perm_list.length) {
// 			this.set_empty_message(__("No Permissions set for this criteria."));
// 		} else {
// 			this.show_permission_table(this.perm_list);
// 		}
// 		this.show_add_rule();
// 		this.get_doctype() && this.make_reset_button();
// 	}

// 	show_permission_table(perm_list) {
// 		this.table = $(
// 			"<div class='table-responsive'>\
// 			<table class='table table-borderless'>\
// 				<thead><tr></tr></thead>\
// 				<tbody></tbody>\
// 			</table>\
// 		</div>"
// 		).appendTo(this.body);

// 		const table_columns = [
// 			[__("Document Type"), 150],
// 			[__("Role"), 170],
// 			[__("Level"), 40],
// 			[__("Permissions"), 350],
// 			["", 40],
// 		];

// 		table_columns.forEach((col) => {
// 			$("<th>")
// 				.html(col[0])
// 				.css("width", col[1] + "px")
// 				.appendTo(this.table.find("thead tr"));
// 		});

// 		perm_list.forEach((d) => {
// 			if (d.parent === "DocType") {
// 				return;
// 			}

// 			if (!d.permlevel) d.permlevel = 0;

// 			let row = $("<tr>").appendTo(this.table.find("tbody"));
// 			this.add_cell(row, d, "parent");
// 			let role_cell = this.add_cell(row, d, "role");

// 			this.set_show_users(role_cell, d.role);

// 			if (d.permlevel === 0) {
// 				// this.setup_user_permissions(d, role_cell);
// 				this.setup_if_owner(d, role_cell);
// 			}

// 			let cell = this.add_cell(row, d, "permlevel");

// 			if (d.permlevel == 0) {
// 				cell.css("font-weight", "bold");
// 			}

// 			let perm_cell = this.add_cell(row, d, "permissions");
// 			let perm_container = $("<div class='row'></div>").appendTo(perm_cell);

// 			this.rights.forEach((r) => {
// 				if (!d.is_submittable && ["submit", "cancel", "amend"].includes(r)) return;
// 				this.add_check(perm_container, d, r);

// 				if (d.if_owner && r == "report") {
// 					perm_container.find("div[data-fieldname='report']").toggle(false);
// 				}
// 			});

// 			// buttons
// 			this.add_delete_button(row, d);
// 		});
// 	}

// 	add_cell(row, d, fieldname) {
// 		return $("<td>")
// 			.appendTo(row)
// 			.attr("data-fieldname", fieldname)
// 			.addClass("pt-4")
// 			.html(__(d[fieldname]));
// 	}

// 	add_check(cell, d, fieldname, label, description = "") {
// 		if (!label) label = toTitle(fieldname.replace(/_/g, " "));
// 		if (d.permlevel > 0 && ["read", "write"].indexOf(fieldname) == -1) {
// 			return;
// 		}

// 		let checkbox = $(
// 			`<div class='col-md-4'>
// 				<div class='checkbox'>
// 					<label><input type='checkbox'>${__(label)}</input></label>
// 					<p class='help-box small text-muted'>${__(description)}</p>
// 				</div>
// 			</div>`
// 		)
// 			.appendTo(cell)
// 			.attr("data-fieldname", fieldname);

// 		checkbox
// 			.find("input")
// 			.prop("checked", d[fieldname] ? true : false)
// 			.attr("data-ptype", fieldname)
// 			.attr("data-role", d.role)
// 			.attr("data-permlevel", d.permlevel)
// 			.attr("data-if_owner", d.if_owner)
// 			.attr("data-doctype", d.parent);

// 		checkbox.find("label").css("text-transform", "capitalize");

// 		return checkbox;
// 	}

// 	setup_if_owner(d, role_cell) {
// 		this.add_check(role_cell, d, "if_owner", "Only if Creator")
// 			.removeClass("col-md-4")
// 			.css({ "margin-top": "15px" });
// 	}

// 	get rights() {
// 		return [
// 			"select",
// 			"read",
// 			"write",
// 			"create",
// 			"delete",
// 			"submit",
// 			"cancel",
// 			"amend",
// 			"print",
// 			"email",
// 			"report",
// 			"import",
// 			"export",
// 			"share",
// 		];
// 	}

// 	set_show_users(cell, role) {
// 		cell.html("<a class='grey' href='#'>" + __(role) + "</a>")
// 			.find("a")
// 			.attr("data-role", role)
// 			.click(function () {
// 				let role = $(this).attr("data-role");
// 				frappe.call({
// 					module: "frappe.core",
// 					page: "permission_manager",
// 					method: "get_users_with_role",
// 					args: {
// 						role: role,
// 					},
// 					callback: function (r) {
// 						r.message = $.map(r.message, function (p) {
// 							return $.format('<a href="/app/user/{0}">{1}</a>', [p, p]);
// 						});
// 						frappe.msgprint(
// 							__("Users with role {0}:", [__(role)]) +
// 								"<br>" +
// 								r.message.join("<br>")
// 						);
// 					},
// 				});
// 				return false;
// 			});
// 	}

// 	add_delete_button(row, d) {
// 		$(
// 			`<button class='btn btn-danger btn-remove-perm btn-xs'>${frappe.utils.icon(
// 				"delete"
// 			)}</button>`
// 		)
// 			.appendTo($(`<td class="pt-4">`).appendTo(row))
// 			.attr("data-doctype", d.parent)
// 			.attr("data-role", d.role)
// 			.attr("data-permlevel", d.permlevel)
// 			.on("click", () => {
// 				return frappe.call({
// 					module: "frappe.core",
// 					page: "permission_manager",
// 					method: "remove",
// 					args: {
// 						doctype: d.parent,
// 						role: d.role,
// 						permlevel: d.permlevel,
// 						if_owner: d.if_owner,
// 					},
// 					callback: (r) => {
// 						if (r.exc) {
// 							frappe.msgprint(__("Did not remove"));
// 						} else {
// 							this.refresh();
// 						}
// 					},
// 				});
// 			});
// 	}

// 	add_check_events() {
// 		let me = this;
// 		this.body.on("click", ".show-user-permissions", () => {
// 			frappe.route_options = { allow: this.get_doctype() || "" };
// 			frappe.set_route("List", "User Permission");
// 		});

// 		this.body.on("click", "input[type='checkbox']", function () {
// 			frappe.dom.freeze();
// 			let chk = $(this);
// 			let args = {
// 				role: chk.attr("data-role"),
// 				permlevel: chk.attr("data-permlevel"),
// 				doctype: chk.attr("data-doctype"),
// 				ptype: chk.attr("data-ptype"),
// 				value: chk.prop("checked") ? 1 : 0,
// 				if_owner: chk.attr("data-if_owner"),
// 			};
// 			return frappe.call({
// 				module: "frappe.core",
// 				page: "permission_manager",
// 				method: "update",
// 				args: args,
// 				callback: (r) => {
// 					frappe.dom.unfreeze();
// 					if (r.exc) {
// 						// exception: reverse
// 						chk.prop("checked", !chk.prop("checked"));
// 					} else {
// 						me.get_perm(args.role)[args.ptype] = args.value;

// 						if (args.ptype == "if_owner") {
// 							let report_checkbox = chk
// 								.closest("div.row")
// 								.find("div[data-fieldname='report']");
// 							report_checkbox.toggle(!args.value);
// 						}
// 					}
// 				},
// 			});
// 		});
// 	}

// 	show_add_rule() {
// 		this.page.set_primary_action(
// 			__("Add A New Rule"),
// 			() => {
// 				let d = new frappe.ui.Dialog({
// 					title: __("Add New Permission Rule"),
// 					fields: [
// 						{
// 							fieldtype: "Select",
// 							label: __("Document Type"),
// 							options: this.options.doctypes,
// 							reqd: 1,
// 							fieldname: "parent",
// 						},
// 						{
// 							fieldtype: "Select",
// 							label: __("Role"),
// 							options: this.options.roles,
// 							reqd: 1,
// 							fieldname: "role",
// 						},
// 						{
// 							fieldtype: "Select",
// 							label: __("Permission Level"),
// 							options: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
// 							reqd: 1,
// 							fieldname: "permlevel",
// 							description: __(
// 								"Level 0 is for document level permissions, higher levels for field level permissions."
// 							),
// 						},
// 					],
// 				});
// 				if (this.get_doctype()) {
// 					d.set_value("parent", this.get_doctype());
// 					d.get_input("parent").prop("disabled", true);
// 				}
// 				if (this.get_role()) {
// 					d.set_value("role", this.get_role());
// 					d.get_input("role").prop("disabled", true);
// 				}
// 				d.set_value("permlevel", "0");
// 				d.set_primary_action(__("Add"), () => {
// 					let args = d.get_values();
// 					if (!args) {
// 						return;
// 					}
// 					frappe.call({
// 						module: "frappe.core",
// 						page: "permission_manager",
// 						method: "add",
// 						args: args,
// 						callback: (r) => {
// 							if (r.exc) {
// 								frappe.msgprint(__("Did not add"));
// 							} else {
// 								this.refresh();
// 							}
// 						},
// 					});
// 					d.hide();
// 				});
// 				d.show();
// 			},
// 			"small-add"
// 		);
// 	}

// 	make_reset_button() {
// 		this.page.set_secondary_action(__("Restore Original Permissions"), () => {
// 			this.get_standard_permissions((data) => {
// 				this.reset_std_permissions(data);
// 			});
// 		});
// 	}

// 	get_perm(role) {
// 		return $.map(this.perm_list, function (d) {
// 			if (d.role == role) return d;
// 		})[0];
// 	}

// 	get_link_fields(doctype) {
// 		return frappe.get_children("DocType", doctype, "fields", {
// 			fieldtype: "Link",
// 			options: ["not in", ["User", "[Select]"]],
// 		});
// 	}
// };
