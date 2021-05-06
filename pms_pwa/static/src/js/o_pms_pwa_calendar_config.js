odoo.define("pms_pwa.calendar_config", function (require) {
    "use strict";
    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    var publicWidget = require("web.public.widget");
    var csrf_token = core.csrf_token;

    publicWidget.registry.CalendarConfigCollapseWidget = publicWidget.Widget.extend({
        selector: "#calendar_config_table",
        xmlDependencies: [
            "/pms_pwa/static/src/xml/pms_pwa_roomdoo_calendar_config_line.xml",
        ],
        events: {
            "click tr.o_pms_pwa_open_calendar_config": "_onClickGetCalendarConfigLine",
        },

        _onClickGetCalendarConfigLine: function (event) {
            event.preventDefault();
            var room_type_id = event.currentTarget.getAttribute("data-id");
            var date_list = $('input[name="date_list"]').val();
            ajax.jsonRpc("/calendar/config/line", "call", {
                room_type_id: room_type_id,
                range_date: date_list,
            }).then(function (data) {
                var html = core.qweb.render("pms_pwa.calendar_config_line", {
                    room_type_id: room_type_id,
                    obj_list: data,
                    csrf_token: csrf_token,
                });
                $(String("#collapse_accordion_" + room_type_id)).html(html);
            });
        },
    });
    $("#calendar_config_table").on("change", "input[type='text']", function () {
        this.style.backgroundColor = "yellow";
        var element = document.getElementById("save");
        console.log("-->¿?");
        element.classList.remove("d-none");
    });
});
