odoo.define("pms_pwa.calendar", function (require) {
    "use strict";
    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    var publicWidget = require("web.public.widget");
    var csrf_token = core.csrf_token;

    publicWidget.registry.CalendarCollapseWidget = publicWidget.Widget.extend({
        selector: "#calendar_table",
        xmlDependencies: ["/pms_pwa/static/src/xml/pms_pwa_roomdoo_calendar_line.xml"],
        events: {
            "click tr.o_pms_pwa_open_calendar": "_onClickGetCalendarLine",
        },

        _onClickGetCalendarLine: function (event) {
            event.preventDefault();
            var room_type_id = event.currentTarget.getAttribute("data-id");
            var date_list = $('input[name="date_list"]').val();
            ajax.jsonRpc("/calendar/line", "call", {
                room_type_id: room_type_id,
                range_date: date_list,
            }).then(function (data) {
                var html = core.qweb.render("pms_pwa.calendar_line", {
                    room_type_id: room_type_id,
                    obj_list: data.reservations,
                    csrf_token: csrf_token,
                });
                $("td.o_pms_pwa_hiddenRow").html(html);
            });
        },
    });

    $(document).on("click", ".open-modalDialog", function () {
        var date = $(this).data("date") + " - " + $(this).data("date");
        var room = $(this).data("room");
        var pricelist = $(this).data("pricelist");
        $('input[name="range_check_date_modal"]').val(date);
        $('select[name="room_type"]').val(room);
        $('select[name="pricelist"]').val(pricelist);
    });
});
