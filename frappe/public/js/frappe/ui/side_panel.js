// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

frappe.provide("frappe.ui");

const SIDE_PANEL_WIDTH_KEY = "side_panel_width";

const TABLE_FIELDTYPES = new Set(["Table", "Table MultiSelect"]);
const SKIP_FIELDTYPES = new Set(["Tab Break", "HTML", "Button", "Fold", "Heading"]);
const SAFE_HTML_FIELDTYPES = new Set([
	"Currency",
	"Int",
	"Float",
	"Percent",
	"Duration",
	"Date",
	"Datetime",
	"Time",
	"Rating",
]);

function passes_depends_on(expression, doc, parent) {
	if (!expression) return true;
	if (typeof expression === "boolean") return expression;
	if (expression.startsWith("eval:")) {
		try {
			return Boolean(frappe.utils.eval(expression.substr(5), { doc, parent }));
		} catch (e) {
			return true;
		}
	}
	if (expression.startsWith("fn:")) return true;
	const value = doc[expression];
	return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

function get_preview_indicator(doc, meta) {
	if (meta.is_submittable && doc.docstatus == 0) return [__("Draft"), "red"];
	if (meta.is_submittable && doc.docstatus == 2) return [__("Cancelled"), "red"];

	const state = doc.status && (meta.states || []).find((s) => s.title === doc.status);
	if (state) return [__(doc.status), frappe.scrub(state.color || "gray", "-")];

	if (meta.is_submittable && doc.docstatus == 1) return [__("Submitted"), "blue"];
	if (doc.status) return [__(doc.status), frappe.utils.guess_colour(doc.status)];

	const has_field = (fieldname) => meta.fields.some((df) => df.fieldname === fieldname);
	if (has_field("enabled")) {
		return cint(doc.enabled) ? [__("Enabled"), "blue"] : [__("Disabled"), "gray"];
	}
	if (has_field("disabled")) {
		return cint(doc.disabled) ? [__("Disabled"), "gray"] : [__("Enabled"), "blue"];
	}
	return null;
}

function is_safe_url(url) {
	return typeof url === "string" && (url.startsWith("/") || /^https?:\/\//.test(url));
}

function render_field_value($value, df, doc) {
	const raw = doc[df.fieldname];

	if (df.fieldtype === "Link" || df.fieldtype === "Dynamic Link") {
		if (raw == null || raw === "") return;
		const link_doctype = df.fieldtype === "Dynamic Link" ? doc[df.options] : df.options;
		if (!link_doctype || !frappe.model.can_read(link_doctype)) {
			$value.text(String(raw));
			return;
		}
		const anchor = document.createElement("a");
		anchor.href = `/app/${frappe.router.slug(link_doctype)}/${encodeURIComponent(raw)}`;
		anchor.dataset.doctype = link_doctype;
		anchor.dataset.name = raw;
		anchor.innerText = frappe.utils.get_link_title(link_doctype, raw) || raw;
		$value.append(anchor);
		return;
	}

	if (df.fieldtype === "Check") {
		$value.html(
			`<input type="checkbox" disabled class="disabled-${
				cint(raw) ? "selected" : "deselected"
			}">`
		);
		return;
	}

	if (["Attach", "Attach Image"].includes(df.fieldtype)) {
		if (!raw || !is_safe_url(raw)) return;
		const anchor = document.createElement("a");
		anchor.href = raw;
		anchor.target = "_blank";
		anchor.rel = "noopener noreferrer";
		anchor.innerText = decodeURIComponent(String(raw).split("/").pop());
		$value.append(anchor);
		return;
	}

	if (SAFE_HTML_FIELDTYPES.has(df.fieldtype)) {
		const formatted = frappe.format(raw, df, { no_icon: true, only_value: true }, doc);
		$value.html(formatted == null ? "" : formatted);
		return;
	}

	const escaped = frappe.utils.escape_html(raw == null ? "" : String(raw));
	$value.html(escaped.replace(/&lt;br\s*\/?&gt;/gi, "<br>"));
}

function render_child_table($columns, df, doc, ctx) {
	const rows = doc[df.fieldname] || [];
	const child_meta = ctx.metas[df.options];
	const $wrapper = $('<div class="side-panel-table-wrapper frappe-control"></div>').appendTo(
		$columns
	);
	$('<label class="control-label"></label>')
		.text(__(df.label || df.fieldname))
		.appendTo($wrapper);

	if (!child_meta || !rows.length) {
		$('<div class="like-disabled-input side-panel-table-empty text-muted"></div>')
			.text(__("No Data"))
			.appendTo($wrapper);
		return;
	}

	const is_value_field = (cdf) =>
		!SKIP_FIELDTYPES.has(cdf.fieldtype) &&
		!TABLE_FIELDTYPES.has(cdf.fieldtype) &&
		!["Section Break", "Column Break"].includes(cdf.fieldtype) &&
		!cdf.hidden &&
		(!cdf.permlevel || ctx.permlevels.includes(cdf.permlevel));

	let columns = child_meta.fields.filter((cdf) => cdf.in_list_view && is_value_field(cdf));
	if (!columns.length) columns = child_meta.fields.filter(is_value_field).slice(0, 4);
	columns = columns.slice(0, 5);

	const $scroll = $('<div class="side-panel-table"></div>').appendTo($wrapper);
	const $table = $("<table></table>").appendTo($scroll);
	const $head_row = $("<tr></tr>").appendTo($("<thead></thead>").appendTo($table));
	$('<th class="side-panel-row-idx">#</th>').appendTo($head_row);
	for (const cdf of columns) {
		$("<th></th>")
			.text(__(cdf.label || cdf.fieldname))
			.appendTo($head_row);
	}

	const $tbody = $("<tbody></tbody>").appendTo($table);
	for (const row of rows) {
		const $tr = $("<tr></tr>").appendTo($tbody);
		$('<td class="side-panel-row-idx"></td>').text(row.idx).appendTo($tr);
		for (const cdf of columns) {
			render_field_value($("<td></td>").appendTo($tr), cdf, row);
		}
		$tr.on("click", (e) => {
			if ($(e.target).closest("a, input").length) return;
			ctx.open_row(df.options, row);
		});
	}
}

function render_doc_fields(container, doctype, doc, ctx) {
	const meta = ctx.metas[doctype];
	const $root = $('<div class="side-panel-detail form-layout"></div>').appendTo(container);
	const parent = ctx.parent || null;

	let $section = null;
	let $columns = null;
	let $column = null;
	let section_ok = true;

	const open_section = (label, ok) => {
		section_ok = ok;
		$section = null;
		$columns = null;
		$column = null;
		if (!ok) return;
		$section = $('<div class="form-section card-section"></div>').appendTo($root);
		if (label) $('<div class="section-head"></div>').text(__(label)).appendTo($section);
		$columns = $('<div class="section-body side-panel-detail-columns"></div>').appendTo(
			$section
		);
	};

	const open_column = () => {
		if (!$columns) open_section(null, true);
		$column = $('<div class="form-column side-panel-detail-column"></div>').appendTo($columns);
	};

	for (const df of meta.fields) {
		if (df.fieldtype === "Section Break") {
			open_section(
				df.label,
				!df.depends_on || passes_depends_on(df.depends_on, doc, parent)
			);
			continue;
		}
		if (!section_ok) continue;
		if (df.fieldtype === "Column Break") {
			open_column();
			continue;
		}
		if (SKIP_FIELDTYPES.has(df.fieldtype)) continue;
		if (df.hidden) continue;
		if (df.permlevel && !ctx.permlevels.includes(df.permlevel)) continue;
		if (df.depends_on && !passes_depends_on(df.depends_on, doc, parent)) continue;

		if (TABLE_FIELDTYPES.has(df.fieldtype)) {
			if (!$columns) open_section(null, true);
			render_child_table($columns, df, doc, ctx);
			$column = null;
			continue;
		}

		if (!$column) open_column();
		const $group = $('<div class="form-group"></div>').appendTo(
			$('<div class="frappe-control"></div>').appendTo($column)
		);
		$('<label class="control-label"></label>')
			.text(__(df.label || df.fieldname))
			.appendTo($group);
		render_field_value(
			$('<div class="control-value like-disabled-input"></div>').appendTo($group),
			df,
			doc
		);
	}

	$root.find(".form-section").each(function () {
		if (!$(this).find(".frappe-control").length) $(this).remove();
	});
}

frappe.ui.SidePanel = class SidePanel {
	constructor() {
		this.history = [];
		this.metas = {};
		this.token = 0;
		this.current = null;
		this.preview = null;
		this.make();
	}

	make() {
		this.$panel = $(frappe.render_template("side_panel", {})).appendTo(document.body);
		this.$body = this.$panel.find(".side-panel-body");
		this.setup_resize();

		this.$panel.find(".side-panel-back").on("click", () => this.back());

		this.$panel.find(".side-panel-expand").on("click", () => {
			const current = this.current;
			this.close();
			if (current) frappe.set_route("Form", current.doctype, current.docname);
		});

		this.$panel.find(".side-panel-close").on("click", () => this.close());

		this.$body.on("click", "a[data-doctype][data-name]", (e) => {
			if (e.which !== 1 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
			e.preventDefault();
			e.stopPropagation();
			const { doctype, name } = e.currentTarget.dataset;
			this.open(doctype, name);
		});

		frappe.router.on("change", () => this.close());

		$(document).on("keydown.side-panel", (e) => {
			if (e.key !== "Escape" || !this.is_open()) return;
			if ($(".modal:visible").length) return;
			this.close();
		});
	}

	setup_resize() {
		const stored = parseInt(localStorage.getItem(SIDE_PANEL_WIDTH_KEY), 10);
		if (stored) this.set_width(stored);

		this.$panel.find(".side-panel-resizer").on("mousedown", (e) => {
			if (!$(e.currentTarget).is(":visible")) return;
			e.preventDefault();

			const start_x = e.clientX;
			const start_width = this.$panel.outerWidth();

			$("body").addClass("side-panel-resizing");

			const on_move = (move_event) => {
				this.set_width(start_width + (start_x - move_event.clientX));
			};

			const on_up = () => {
				$(document).off("mousemove.side-panel-resize mouseup.side-panel-resize");
				$("body").removeClass("side-panel-resizing");
				localStorage.setItem(SIDE_PANEL_WIDTH_KEY, this.$panel.outerWidth());
			};

			$(document)
				.on("mousemove.side-panel-resize", on_move)
				.on("mouseup.side-panel-resize", on_up);
		});

		this.$panel.find(".side-panel-resizer").on("dblclick", () => {
			this.$panel[0].style.removeProperty("--side-panel-width");
			localStorage.removeItem(SIDE_PANEL_WIDTH_KEY);
		});

		$(window).on(
			"resize.side-panel",
			frappe.utils.debounce(() => {
				const width = parseInt(
					this.$panel[0].style.getPropertyValue("--side-panel-width"),
					10
				);
				if (width) this.set_width(width);
			}, 100)
		);
	}

	set_width(width) {
		const min =
			parseInt(
				getComputedStyle(this.$panel[0]).getPropertyValue("--side-panel-min-width"),
				10
			) || 0;
		const max = Math.max(min, window.innerWidth - 120);
		const clamped = Math.min(Math.max(width, min), max);
		this.$panel[0].style.setProperty("--side-panel-width", `${clamped}px`);
	}

	open(doctype, docname, { push = true } = {}) {
		if (!doctype || !docname) return;

		if (!frappe.model.can_read(doctype)) {
			frappe.show_alert({
				message: __("Not permitted to view {0}", [__(doctype)]),
				indicator: "orange",
			});
			return;
		}

		if (
			this.is_open() &&
			this.current &&
			this.current.doctype === doctype &&
			this.current.docname === docname
		) {
			return;
		}

		if (push && this.current) this.history.push(this.current);
		this.current = { doctype, docname };
		this.show();
		this.render();
	}

	back() {
		const previous = this.history.pop();
		if (!previous) return;
		this.current = previous;
		this.render();
	}

	render() {
		const { doctype, docname } = this.current;
		const token = ++this.token;

		this.$panel.find(".side-panel-back").toggleClass("hidden", !this.history.length);
		this.set_header(doctype, docname, null);
		this.set_state("loading");

		frappe
			.xcall("frappe.desk.side_panel.get_preview", { doctype, name: docname }, "GET")
			.then((preview) => {
				if (token !== this.token) return;
				this.preview = preview;
				Object.assign(this.metas, preview.metas);
				this.render_doc(preview);
				this.set_header(doctype, docname, preview);
				this.set_state("ready");
			})
			.catch((e) => {
				if (token !== this.token) return;
				console.error("[side panel] failed to render", doctype, docname, e);
				this.set_state("error");
			});
	}

	render_doc(preview) {
		this.$body.find(".side-panel-doc").remove();
		const $doc = $('<div class="side-panel-doc">').appendTo(this.$body);
		render_doc_fields($doc, preview.doc.doctype, preview.doc, {
			metas: this.metas,
			permlevels: preview.permlevels || [0],
			open_row: (child_doctype, row) => this.open_row_dialog(child_doctype, row),
		});
	}

	open_row_dialog(child_doctype, row_doc) {
		this.row_dialog?.hide();

		const dialog = new frappe.ui.Dialog({
			title: __("Row #{0}", [row_doc.idx]),
			size: "extra-large",
		});
		this.row_dialog = dialog;
		dialog.$wrapper.addClass("side-panel-row-dialog");
		dialog.get_primary_btn().hide();

		render_doc_fields($(dialog.body), child_doctype, row_doc, {
			metas: this.metas,
			permlevels: this.preview?.permlevels || [0],
			parent: this.preview?.doc || null,
			open_row: (doctype, row) => this.open_row_dialog(doctype, row),
		});

		$(dialog.body).on("click", "a[data-doctype][data-name]", (e) => {
			if (e.which !== 1 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
			e.preventDefault();
			const { doctype, name } = e.currentTarget.dataset;
			dialog.hide();
			this.open(doctype, name);
		});

		dialog.show();
	}

	set_header(doctype, docname, preview) {
		this.$panel.find(".side-panel-doctype").text(__(doctype));
		this.$panel.find(".side-panel-title").text(docname);

		const $indicator = this.$panel.find(".side-panel-indicator").empty();
		if (!preview) return;
		const indicator = get_preview_indicator(preview.doc, preview.metas[doctype]);
		if (indicator) {
			$indicator.append(
				$('<span class="es-badge">').attr("data-theme", indicator[1]).text(indicator[0])
			);
		}
	}

	set_state(state) {
		this.$body.find(".side-panel-message").remove();
		if (state !== "ready") this.$body.find(".side-panel-doc").remove();

		const message =
			state === "loading"
				? __("Loading...")
				: state === "error"
				? __("Could not load this document")
				: null;

		if (message) {
			$('<div class="side-panel-message text-center text-extra-muted"></div>')
				.text(message)
				.appendTo(this.$body);
		}
	}

	show() {
		this.$panel.removeClass("hidden");
		requestAnimationFrame(() => this.$panel.addClass("is-open"));
		$("body").addClass("side-panel-open");
	}

	is_open() {
		return this.$panel.hasClass("is-open");
	}

	close() {
		if (!this.is_open()) return;
		this.token++;
		this.$panel.removeClass("is-open").addClass("hidden");
		$("body").removeClass("side-panel-open");
		this.history = [];
		this.current = null;
		this.preview = null;
		this.row_dialog?.hide();
	}
};

frappe.ui.get_side_panel = function () {
	if (!frappe.ui._side_panel) {
		frappe.ui._side_panel = new frappe.ui.SidePanel();
	}
	return frappe.ui._side_panel;
};

frappe.ui.split_view_enabled = function () {
	if (frappe.is_mobile()) return false;
	const enabled = frappe.boot.desk_settings?.report_split_view;
	return enabled === undefined || cint(enabled) === 1;
};

frappe.ui.handle_link_cell_click = function (e, is_link_cell) {
	if (!frappe.ui.split_view_enabled()) return false;
	if (e.which !== 1 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return false;

	const link = e.currentTarget;
	const { doctype, name } = link.dataset;
	if (!doctype || !name) return false;

	if (is_link_cell && !is_link_cell($(link).closest(".dt-cell"))) return false;

	e.preventDefault();
	e.stopPropagation();

	frappe.ui.get_side_panel().open(doctype, name);
	return true;
};
