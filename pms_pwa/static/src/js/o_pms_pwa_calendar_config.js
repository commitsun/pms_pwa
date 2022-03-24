odoo.define("pms_pwa.calendar_config", function (require) {
    "use strict";
    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    var _t = core._t;
    var publicWidget = require("web.public.widget");
    // Var csrf_token = core.csrf_token;

    function new_displayDataAlert(result, pms_property_id = false) {
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
        if (pms_property_id) {
            self.reloadReservationInfo(pms_property_id);
        }

        /* $(String("#reservation_" + pms_property_id)).load(
            String(window.location.href + " #reservation_" + pms_property_id + " td")
        ); */
    }

    publicWidget.registry.CalendarConfigSendWidget = publicWidget.Widget.extend({
        selector: "#buttom_save",
        events: {
            "click #save": "_onClickSendCalendarData",
        },

        _onClickSendCalendarData: function (event) {
            event.preventDefault();
            console.log("envio save");
            var room_type = {};
            var send;
            $(".calendar_config_input input").each(function (index) {
                var input = $(this);
                if (input.data("edit") === true) {
                    var input_array = {};
                    // Value['pricelist_id'].push(input.data('pricelist'));

                    if(input.val() == 'on'){
                        input.val(1);
                    }
                    if(input.val() == 'off'){
                        input.val(0);
                    }
                    input_array[input.attr("name")] = input.val();
                    var price = input.data("pricelist");
                    var availability_plan = input.data("availability_plan");
                    var room = input.data("room");
                    var date = input.data("date");
                    var pms_property_id = input.data("pms_property_id");
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

                    send = {
                        room_type : room_type,
                        availability_plan: availability_plan,
                        pms_property_id: pms_property_id,
                    }
                }
            });
            console.log("send --> ", send);
            ajax.jsonRpc("/calendar/config/save", "call", {
                send
            }).then(function (new_data) {
                let data = JSON.parse(new_data);
                if (data.result == true) {
                    $("#status").toggle();
                    $("#preloader").toggle();
                    let property = $("input[name='selected_property']").val();
                    let parameters = "?selected_property="+property;
                    window.location = "/calendar/reduced" + parameters;
                    // $("#o_pms_pwa_table_reduced").load(
                    //     "/calendar/reduced" + parameters + " #o_pms_pwa_table_reduced>*"
                    // );
                    var element = document.getElementById("save");
                    element.classList.add("d-none");
                    $("#preloader").fadeOut(2500);
                } else {
                    new_displayDataAlert(new_data);
                    //window.location = window.location.href;
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

    // $(".o_pms_pwa_open_collapse").on("click", function () {
    //     $(".o_pms_pwa_hiddenRow").addClass("show");
    //     $("#open_collapse").hide();
    //     $("#close_collapse").show();
    // });
    $(".o_pms_pwa_close_collapse").on("click", function () {
        $(".o_pms_pwa_hiddenRow").removeClass("show");
        $("#close_collapse").hide();
        $("#open_collapse").show();
    });
});
