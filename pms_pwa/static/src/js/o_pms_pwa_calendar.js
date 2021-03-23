odoo.define("pms_pwa.calendar", function (require) {
    "use strict";
    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    // Var _t = core._t;
    var publicWidget = require("web.public.widget");
    var csrf_token = core.csrf_token;

    $(".collapse").on("show.bs.collapse", function () {
        $(".collapse.in").collapse("hide");
    });

    publicWidget.registry.CalendarCollapseWidget = publicWidget.Widget.extend({
        selector: "#calendar_table",
        xmlDependencies: ["/pms_pwa/static/src/xml/pms_pwa_roomdoo_calendar_line.xml"],
        events: {
            "click tr.o_pms_pwa_open_calendar": "_onClickGetCalendarLine",
        },
        displayContent: function (xmlid, render_values) {
            console.log(render_values);
            var html = core.qweb.render(xmlid, render_values);
            $("td.o_pms_pwa_hiddenRow").html(html);
        },
        _onClickGetCalendarLine: function (event) {
            event.preventDefault();
            var self = this;
            var room_type_id = event.currentTarget.getAttribute("data-id");
            /* RPC call to get the reservation data */
            ajax.jsonRpc("/calendar/line", "call", {
                room_type_id: room_type_id,
            }).then(function (data) {
                self.displayContent("pms_pwa.calendar_line", {
                    room_type_id: room_type_id,
                    obj_list: data.reservations,
                    csrf_token: csrf_token,
                });
            });
        },
    });
});
