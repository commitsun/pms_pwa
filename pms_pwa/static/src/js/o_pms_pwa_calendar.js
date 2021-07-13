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
            var data_id = event.currentTarget.getAttribute("data-id");
            var date_list = $('input[name="date_list"]').val();
            var selected_display = $('input[name="selected_display"]').val();
            ajax.jsonRpc("/calendar/line", "call", {
                data_id: data_id,
                range_date: date_list,
                selected_display: selected_display,
            }).then(function (data) {
                var html = core.qweb.render("pms_pwa.calendar_line", {
                    data_id: data_id,
                    obj_list: data.reservations,
                    csrf_token: csrf_token,
                });
                $(String("#collapse_accordion_" + data_id)).html(html);
            });
        },
    });

    $(document).on("click", ".open-modalDialog", function () {
        const date_options = {year: "numeric", month: "2-digit", day: "2-digit"};
        var date_string = $(this).data("date");

        try {
            const parts_of_date = date_string.split("/");

            const new_date =
                parts_of_date[1] + "/" + parts_of_date[0] + "/" + parts_of_date[2];

            date_string = new_date;
        } catch (error) {
            console.error("Invalid format date");
        }
        const date = new Date(date_string);

        const tomorrow = new Date(date);
        tomorrow.setDate(tomorrow.getDate() + 1);
        var checkin_date = date.toLocaleDateString(
            document.documentElement.lang,
            date_options
        );

        var checkout_date = tomorrow.toLocaleDateString(
            document.documentElement.lang,
            date_options
        );

        var range_date = checkin_date + " - " + checkout_date;
        var room = $(this).data("room");
        var pricelist = $(this).data("pricelist");
        setTimeout(function () {
            $('input[name="range_check_date_modal_reservation"]').val(range_date);
            $('input[name="range_check_date_modal_reservation_multi"]').val(range_date);
            $('select[name="room_type"]').val(room);
            $('select[name="pricelist"]').val(pricelist);
            $("#o_pms_pwa_new_reservation_modal")
                .find("input[name='range_check_date_modal_reservation']")
                .trigger("change");
            $("#o_pms_pwa_new_reservation_modal")
                .find("input[name='range_check_date_modal_reservation_multi']")
                .trigger("change");
        }, 300);
    });
});
