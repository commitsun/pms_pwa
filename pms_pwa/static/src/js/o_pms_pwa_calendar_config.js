odoo.define("pms_pwa.calendar_config", function (require) {
    "use strict";
    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    var _t = core._t;
    var publicWidget = require("web.public.widget");
    // Var csrf_token = core.csrf_token;

    function new_displayDataAlert(result, data_id = false) {
        var data = JSON.parse(result);
        if (data && data.result === true) {
            data.type = "success";
        } else if (data && data.result === false) {
            data.type = "warning";
        } else {
            data.type = "warning";
            data.message = _t(
                "An undefined error has ocurred, please try again later."
            );
        }
        var alert_div = $(".o_pms_pwa_roomdoo_alerts");
        var alert = core.qweb.render("pms_pwa.reservation_alerts", {
            alert: data,
        });
        alert_div.append(alert);
        if (data_id) {
            self.reloadReservationInfo(data_id);
        }

        /* $(String("#reservation_" + data_id)).load(
            String(window.location.href + " #reservation_" + data_id + " td")
        ); */
    }

    publicWidget.registry.CalendarConfigSendWidget = publicWidget.Widget.extend({
        selector: "#buttom_save",
        events: {
            "click #save": "_onClickSendCalendarData",
        },

        _onClickSendCalendarData: function (event) {
            event.preventDefault();

            var room_type = {};
            $("#calendar_conf_table_line input").each(function (index) {
                // console.log(index);
                var input = $(this);
                if (input.data("edit") === true) {
                    var input_array = {};
                    // Value['pricelist_id'].push(input.data('pricelist'));
                    input_array[input.attr("name")] = input.val();
                    var price = input.data("pricelist");
                    var room = input.data("room");
                    var date = input.data("date");
                    // Var input_name = input.attr("name");
                    var current_datetime = new Date(date);
                    var formatted_date =
                        current_datetime.getMonth() +
                        1 +
                        "/" +
                        current_datetime.getDate() +
                        "/" +
                        current_datetime.getFullYear();
                    if (document.documentElement.lang === "es-ES") {
                        formatted_date =
                            current_datetime.getDate() +
                            "/" +
                            (current_datetime.getMonth() + 1) +
                            "/" +
                            current_datetime.getFullYear();
                    }
                    // console.log(formatted_date);
                    // Console.log("price ", price);
                    if (!room_type[room]) {
                        room_type[room] = {};
                    }
                    if (!room_type[room].pricelist_id) {
                        room_type[room].pricelist_id = {};
                    }
                    if (!room_type[room].pricelist_id[price]) {
                        room_type[room].pricelist_id[price] = {};
                    }
                    if (!room_type[room].pricelist_id[price].date) {
                        room_type[room].pricelist_id[price].date = {};
                    }
                    // Value['room_type'][room]['pricelist_id'][price]['date'].push(formatted_date);
                    if (!room_type[room].pricelist_id[price].date[formatted_date]) {
                        room_type[room].pricelist_id[price].date[formatted_date] = [];
                    }
                    room_type[room].pricelist_id[price].date[formatted_date].push(
                        input_array
                    );
                }
            });
            // Console.log(room_type);
            ajax.jsonRpc("/calendar/config/save", "call", {
                room_type,
            }).then(function (new_data) {
                if (!JSON.parse(new_data).result) {
                    new_displayDataAlert(new_data);
                } else {
                    window.location = window.location.href;
                }
            });
        },
    });

    $("#calendar_config_table").on("change", "input[type='text']", function () {
        this.style.backgroundColor = "yellow";
        var element = document.getElementById("save");
        $(this).data("edit", true);
        element.classList.remove("d-none");
    });

    $(".o_pms_pwa_open_collapse").on("click", function () {
        $(".o_pms_pwa_hiddenRow").addClass("show");
        $("#open_collapse").hide();
        $("#close_collapse").show();
    });
    $(".o_pms_pwa_close_collapse").on("click", function () {
        $(".o_pms_pwa_hiddenRow").removeClass("show");
        $("#close_collapse").hide();
        $("#open_collapse").show();
    });
});
