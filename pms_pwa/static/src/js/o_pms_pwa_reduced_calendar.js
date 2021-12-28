odoo.define("pms_pwa.reduced_calendar", function (require) {
    "use strict";
    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    var publicWidget = require("web.public.widget");
    var csrf_token = core.csrf_token;
    const date_options = {year: "numeric", month: "2-digit", day: "2-digit"};
    //event mouse
    var mouseDown = false;
    var mouseUp = false;
    var elemMousedowned;
    var elemMouseuped;

    var wentLeft = false;
    var wentRight = false;

    var selectingToTheLeft = false;
    var selectingToTheRight = false;

    var doneSelecting = false;
    var initial_day = "";
    var calendar_room = "";
    //end event mouse
    // Dragabble
    var drop_function = false;
    $("table#reduced_calendar_table")
        .largetable({
            enableMaximize: true,
        })
        .on("toggleMaximize", function () {
            console.log("toggleMaximize event");
        })
        .on("maximize", function () {
            console.log("maximize event");
            $("header#top nav").hide();
        })
        .on("unmaximize", function () {
            console.log("unmaximize event");
            $("header#top nav").show();
        });
    publicWidget.registry.ReducedCalendarCollapseWidget = publicWidget.Widget.extend({
        selector: "#reduced_calendar_table, #confirmChange",
        xmlDependencies: [
            "/pms_pwa/static/src/xml/pms_pwa_roomdoo_reduced_calendar_line.xml",
        ],
        events: {
            "click tr.o_pms_pwa_open_reduced_calendar": "_onClickGetCalendarLine",
            "click .close_confirmChange": "_onClickCloseModal",
            "click .send_ConfirmChanges": "_onClickConfirmModal",
        },
        /**
         * @override
         */
        start: function () {
            console.log("start");
            var self = this;
            return this._super.apply(this, arguments);
        },
        init: function () {
            console.log("init");
            var self = this;
            // $(".o_pms_pwa_open_reduced_calendar").map(function() {
            //     self.launchLines(this);
            // }).get();
            return this._super.apply(this, arguments);
        },
        convertDay: function (day_to_convert) {
            if (document.documentElement.lang === "es-ES") {
                try {
                    let parts_of_date = day_to_convert.split("/");

                    let new_date =
                        parts_of_date[1] +
                        "/" +
                        parts_of_date[0] +
                        "/" +
                        parts_of_date[2];

                    day_to_convert = new_date;
                } catch (error) {
                    console.error("Invalid format date");
                    return false;
                }
            } else {
                try {
                    let parts_of_date = day_to_convert.split("/");

                    let new_date =
                        parts_of_date[0] +
                        "-" +
                        parts_of_date[1] +
                        "-" +
                        parts_of_date[2];

                    day_to_convert = new_date;
                } catch (error) {
                    console.error("Invalid format date");
                    return false;
                }
            }
            return day_to_convert;
        },
        closestEdge: function (mouse, elem) {
            var elemBounding = elem.getBoundingClientRect();
            var elementLeftEdge = elemBounding.left;
            var elementTopEdge = elemBounding.top+100;
            var elementRightEdge = elemBounding.right;
            var elementBottomEdge = elemBounding.bottom+100;

            var mouseX = mouse.pageX;
            var mouseY = mouse.pageY;
            var topEdgeDist = Math.abs(elementTopEdge - mouseY);
            var bottomEdgeDist = Math.abs(elementBottomEdge - mouseY);
            var leftEdgeDist = Math.abs(elementLeftEdge - mouseX);
            var rightEdgeDist = Math.abs(elementRightEdge - mouseX);

            var min = Math.min(
                topEdgeDist,
                bottomEdgeDist,
                leftEdgeDist,
                rightEdgeDist
            );
            switch (min) {
                case leftEdgeDist:
                    return "left";
                case rightEdgeDist:
                    return "right";
                case topEdgeDist:
                    return "top";
                case bottomEdgeDist:
                    return "bottom";
            }
        },

        launchLines: function (event, pms_property_id = false) {
            var self = this;
            if (pms_property_id) {
                pms_property_id = pms_property_id;
            } else {
                pms_property_id = event.getAttribute("data-id");
            }
            var date_list = $('input[name="date_list"]').val();
            var selected_display = $('input[name="selected_display"]').val();
            ajax.jsonRpc("/calendar/line", "call", {
                pms_property_id: pms_property_id,
                range_date: date_list,
            }).then(function (data) {
                var html = core.qweb.render("pms_pwa.reduced_calendar_line", {
                    pms_property_id: pms_property_id,
                    obj_list: data.reservations,
                    csrf_token: csrf_token,
                });
                $(String("#collapse_accordion_" + pms_property_id)).html(html);
                // $(String("#collapse_accordion_" + pms_property_id)).addClass("show");
                //
                $('table.o_pms_pwa_reduced_reservation_list_table').tableHover({colClass: 'hover'});
                // ESTO PARA CREAR EL DRAG
                $("table.o_pms_pwa_reduced_reservation_list_table td.o_pms_pwa_reduced_calendar_reservation").draggable({
                    containment: "#reduced_calendar_table",
                    revert: "invalid",
                    start: function (event, ui) {
                        // event.preventDefault();
                        console.log("creo el dragabble");
                        $(event.currentTarget).addClass("z-index-all");
                        $(".o_pms_pwa_line_cell_content").removeAttr("style");
                        $(".o_pms_pwa_line_cell_content").draggable();
                        drop_function = true;
                    },
                });
                // ESTO PARA VER DONDE IR Y DROP PARA CONOCER DONDE SE SUELTA
                $("table.o_pms_pwa_reduced_reservation_list_table td.o_pms_pwa_line_cell_content").droppable({
                    // CLASES PARA MOSTRAR CUADROS ACTIVOS Y COLOR DE HOVER
                    classes: {
                        "ui-droppable-active": "ui-state-active",
                        "ui-droppable-hover": "ui-state-hover",
                    },
                    drop: function (event, ui) {
                        console.log("mouseDown", mouseDown);
                        event.preventDefault();
                        if(mouseDown == false){
                            console.log("drop event--->", event);
                            console.log("drop ui--->", ui);

                            ajax.jsonRpc("/calendar/reduced-change", "call", {
                                id: ui.draggable.data("id"),
                                date: event.target.dataset.date,
                                room: event.target.dataset.calendarRoom,
                                // selected_display: selected_display,
                            }).then(function (data) {
                                console.log("devuelve --->", data);

                                if (data && String(data["result"]) == "success") {
                                    // LANZO MODAL DE CONFIRMACIÓN
                                    $("#confirmChange").on(
                                        "show.bs.modal",
                                        function (event) {
                                            var button = $(event.relatedTarget);
                                            var recipient = button.data("whatever");
                                            var modal = $(this);
                                            modal
                                                .find(".modal-title")
                                                .text("Confirmar cambio");
                                            modal
                                                .find(".modal-body p")
                                                .text(String(data["message"]));
                                            $("input[name='modal_date']").val(
                                                String(data["date"])
                                            );
                                            $("input[name='modal_reservation']").val(
                                                String(data["reservation"])
                                            );
                                            $("input[name='modal_room']").val(
                                                String(data["room"])
                                            );
                                        }
                                    );
                                    $("#confirmChange").modal("show");
                                    // $(".o_pms_pwa_line_cell_content").removeAttr("style");
                                    //$(".o_pms_pwa_line_cell_content").draggable("destroy");
                                    //$(".o_pms_pwa_line_cell_content").draggable();
                                    console.log("elimino las clases de draggable de los tds")
                                    $("table.o_pms_pwa_reduced_reservation_list_table td.o_pms_pwa_free_day").removeClass(
                                        "ui-draggable ui-draggable-handle"
                                    ); //we reset
                                    $(this).effect("highlight", {}, 1500);
                                    drop_function = false;

                                } else {
                                    //LANZO WARNNING
                                    data["type"] = "warning";
                                    if (!data["message"]) {
                                        data["message"] =
                                            "Se ha producido un error al procesar los datos.";
                                    }
                                    var alert_div = $(".o_pms_pwa_roomdoo_alerts");
                                    var alert = core.qweb.render(
                                        "pms_pwa.reservation_alerts",
                                        {
                                            alert: data,
                                        }
                                    );
                                    alert_div.append(alert);
                                    jQuery.ready();
                                    $(".o_pms_pwa_line_cell_content").removeAttr("style");

                                    // Destroy original draggable and create new one
                                    // $(".o_pms_pwa_line_cell_content").draggable("destroy");
                                    // $(".o_pms_pwa_line_cell_content").draggable();
                                    console.log("elimino las clases de draggable de los tds")
                                    $("table.o_pms_pwa_reduced_reservation_list_table td.o_pms_pwa_free_day").removeClass(
                                        "ui-draggable ui-draggable-handle"
                                    ); //we reset
                                    $(this).effect("highlight", {}, 1500);
                                    drop_function = false;
                                }
                            });

                        }
                    },
                    // over: function(event, ui) {
                    //     event.preventDefault();
                    //     drop_function = true;
                    //     console.log("over event--->", event);
                    //     console.log("over ui--->", ui);
                    //     $(this).css('background', 'brown');
                    //     // $(".o_pms_pwa_line_cell_content").removeAttr('style');
                    //     $(".o_pms_pwa_line_cell_content").draggable("destroy");
                    //     // $(".o_pms_pwa_line_cell_content").draggable();
                    // },
                    // out: function(event, ui) {
                    //     event.preventDefault();
                    //     drop_function = true;
                    //     console.log("out event--->", event);
                    //     console.log("out ui--->", ui);
                    //     $(this).css('background', 'red');
                    //     $(".o_pms_pwa_line_cell_content").removeAttr('style');
                    //     $(".o_pms_pwa_line_cell_content").draggable("destroy");
                    //     $(".o_pms_pwa_line_cell_content").draggable();
                    // }
                });
                // Arrastras para crear reserva
                // $(document).on("click", ".open-calendar-modalDialog", function () {
                //     $(".o_pms_pwa_line_cell_content").removeAttr("style");

                //     // Destroy original draggable and create new one
                //     // $(".o_pms_pwa_line_cell_content").draggable("destroy");
                //     // $(".o_pms_pwa_line_cell_content").draggable();
                //     console.log("elimino las clases de draggable de los tds al abrir la modal launch modal?");
                //     $("table.o_pms_pwa_reduced_reservation_list_table td.o_pms_pwa_free_day").removeClass(
                //         "ui-draggable ui-draggable-handle"
                //     ); //we reset
                //     console.log("launch modal ?¿");
                // });

                $("table.o_pms_pwa_reduced_reservation_list_table td.o_pms_pwa_free_day").mousedown(function (
                    e
                ) {
                    //Mouse Down
                    e.preventDefault();
                    mouseDown = true;
                    mouseUp = false;
                    doneSelecting = false;
                    elemMousedowned = $(e.target);
                    initial_day = elemMousedowned.data("date");
                    calendar_room = elemMousedowned.data("calendar-room");
                    //we are selecting in this row
                    $("tr.o_pms_pwa_reduced_calendar_line").removeClass("o_pms_pwa_range_days_selecting"); //we reset
                    elemMousedowned.parent("tr.o_pms_pwa_reduced_calendar_line").addClass("o_pms_pwa_range_days_selecting");
                    console.log("mouseDown o_pms_pwa_range_days_selecting")
                    $("table.o_pms_pwa_reduced_reservation_list_table ").removeClass(
                        "o_pms_pwa_range_days_selected o_pms_pwa_range_days_first o_pms_pwa_range_days_end o_pms_pwa_range_days_start"
                    ).attr('unselectable', 'on'); //we reset
                    elemMousedowned.addClass("o_pms_pwa_range_days_selected o_pms_pwa_range_days_start"); // we started
                });

                $("table.o_pms_pwa_reduced_reservation_list_table").mouseup(function (
                    e
                ) {
                    //Mouse Up
                    e.preventDefault();
                    mouseDown = false;
                    mouseUp = true;
                    elemMouseuped = $(e.target);
                    console.log("drop_function ->", drop_function);
                    console.log("doneSelecting --->", doneSelecting);

                    if (!drop_function) {
                        if (
                            elemMouseuped
                                .parent("tr.o_pms_pwa_reduced_calendar_line")
                                .hasClass("o_pms_pwa_range_days_selecting")
                        ) {
                            $(".o_pms_pwa_range_days_selecting .o_pms_pwa_range_days_end").removeClass("o_pms_pwa_range_days_end");
                            //the end one
                            elemMouseuped.addClass("o_pms_pwa_range_days_selected o_pms_pwa_range_days_end");
                            doneSelecting = true;
                            //elemMouseuped.removeClass("selected start");
                            if (mouseUp && drop_function == false) {
                                initial_day = initial_day;
                                let last_day = elemMouseuped.data("date");
                                calendar_room = calendar_room;
                                initial_day = self.convertDay(initial_day);
                                last_day = self.convertDay(last_day);
                                initial_day = new Date(initial_day);
                                last_day = new Date(last_day);
                                if (initial_day.toString() === last_day.toString()) {
                                    last_day.setDate(last_day.getDate() + 1);
                                }
                                let pricelist = elemMouseuped.data("pricelist");
                                let checkin_date = initial_day.toLocaleDateString(
                                    document.documentElement.lang,
                                    date_options
                                );
                                let checkout_date = last_day.toLocaleDateString(
                                    document.documentElement.lang,
                                    date_options
                                );
                                console.log("checkin_date ----> ", checkin_date);
                                console.log("checkout_date ----> ", checkout_date);
                                if (initial_day > last_day) {
                                    console.log("Cambio las fechas");
                                    let change_date = checkin_date;
                                    checkin_date = checkout_date;
                                    checkout_date = change_date;
                                }

                                let range_date = checkin_date + " - " + checkout_date;
                                console.log("Range date -> ", range_date);
                                $("#bookengine_table > tr").remove();
                                $("#booking_engine_form")
                                    .find(
                                        "input:text, input:password, input:file, select, textarea"
                                    )
                                    .val("");
                                $(
                                    "div#o_pms_pwa_new_reservation_modal #segmentation_ids"
                                ).select2("destroy");
                                $("div#o_pms_pwa_new_reservation_modal #amenity_ids").select2(
                                    "destroy"
                                );
                                $('form#booking_engine_form input[name="calendar_room"]').val(
                                    calendar_room
                                );
                                $('form#booking_engine_form select[name="pricelist"]').val(
                                    pricelist
                                );
                                $(
                                    'form#booking_engine_form input[name="new_reservation_date_modal_reservation"]'
                                ).val(range_date);
                                $('form#booking_engine_form input[name="checkin"]').val(
                                    checkin_date
                                );
                                $('form#booking_engine_form input[name="checkout"]').val(
                                    checkout_date
                                );
                                $("form#booking_engine_form")
                                    .find(
                                        "input[name='new_reservation_date_modal_reservation']"
                                    )
                                    .trigger("change");
                                $(".open-calendar-modalDialog").attr("data-range_days", true);
                                $(".open-calendar-modalDialog").click();
                                $(".open-calendar-modalDialog").attr("data-range_days", false);
                            }
                        }
                    }
                });

                $("table.o_pms_pwa_reduced_reservation_list_table td.o_pms_pwa_free_day").hover(
                    function (e) {
                        //console.log(doneSelecting);
                        // Esta función se ejecuta cuando el puntero del ratón entra en el elemento tr
                        $(this).parent("tr.o_pms_pwa_reduced_calendar_line").hasClass("o_pms_pwa_range_days_selecting")
                        if (!doneSelecting) {
                            if (
                                $(this)
                                    .parent("tr.o_pms_pwa_reduced_calendar_line")
                                    .hasClass("o_pms_pwa_range_days_selecting") &&
                                mouseDown
                            ) {
                                //only in the selected row
                                if (selectingToTheRight) {
                                    $("td.o_pms_pwa_range_days_end").removeClass("o_pms_pwa_range_days_end"); //we reset any end TD
                                    $(this).addClass("o_pms_pwa_range_days_selected o_pms_pwa_range_days_end");
                                }
                                /*
                              if(selectingToTheLeft){
                                $(this).addClass("selected start");
                              }*/
                            }
                        }
                    },
                    function (e) {
                        console.log("doneSelecting ----> ", doneSelecting);
                        // Esta función se ejecuta cuando el puntero del ratón sale del elemento tr
                        if (!doneSelecting) {
                            if (
                                $(this)
                                    .parent("tr.o_pms_pwa_reduced_calendar_line")
                                    .hasClass("o_pms_pwa_range_days_selecting") &&
                                mouseDown
                            ) {
                                var went = self.closestEdge(e, $(this)[0]);

                                if (went == "top" || went == "bottom") {
                                    console.log(went);
                                    console.log($(this));
                                    $(".o_pms_pwa_range_days_selecting .o_pms_pwa_range_days_end").removeClass("o_pms_pwa_range_days_end");
                                    $(this).addClass("o_pms_pwa_range_days_selected o_pms_pwa_range_days_end");
                                    // $(this).closest('td').next('td').addClass("o_pms_pwa_range_days_selected o_pms_pwa_range_days_end");
                                    doneSelecting = true;
                                    console.log(doneSelecting);
                                }
                                if (went == "right") {
                                    console.log("Right");
                                    if ($(this).hasClass("o_pms_pwa_range_days_start")) {
                                        selectingToTheLeft = false;
                                        selectingToTheRight = true;
                                    } else {
                                        $(this).removeClass("o_pms_pwa_range_days_selected o_pms_pwa_range_days_end");
                                        $(this).addClass("o_pms_pwa_range_days_selected");
                                    }
                                }
                                if (went == "left") {
                                    console.log("left");
                                    if ($(this).hasClass("o_pms_pwa_range_days_start")) {
                                        selectingToTheLeft = true;
                                        selectingToTheRight = false;
                                        $(this).removeClass("o_pms_pwa_range_days_selected o_pms_pwa_range_days_start");
                                        $(this).addClass("o_pms_pwa_range_days_selected o_pms_pwa_range_days_end");
                                    } else {
                                        $(this).removeClass("o_pms_pwa_range_days_selected o_pms_pwa_range_days_end");
                                    }
                                }
                            }
                        }
                    }
                );
            });
        },

        _onClickCloseModal: function (event) {
            var self = this;
            event.preventDefault();
            console.log("reinicio el calendario");
            $("table.o_pms_pwa_reduced_reservation_list_table td.o_pms_pwa_reduced_calendar_line_event").removeClass("o_pms_pwa_range_days_selected o_pms_pwa_range_days_start o_pms_pwa_range_days_end o_pms_pwa_range_days_first");
            $("table.o_pms_pwa_reduced_reservation_list_table tr.o_pms_pwa_reduced_calendar_line").removeClass("o_pms_pwa_range_days_selecting");

            $(".o_pms_pwa_line_cell_content").removeAttr("style");
            // Destroy original draggable and create new one
            $(".o_pms_pwa_line_cell_content").draggable("destroy");
            $("table.o_pms_pwa_reduced_reservation_list_table td.o_pms_pwa_reduced_calendar_reservation").draggable({
                containment: "#reduced_calendar_table",
                revert: "invalid",
                start: function (event, ui) {
                    // event.preventDefault();
                    console.log("creo de nuevo el dragabble");
                    $(event.currentTarget).addClass("z-index-all");
                    $(".o_pms_pwa_line_cell_content").removeAttr("style");
                    $(".o_pms_pwa_line_cell_content").draggable();
                    drop_function = true;
                },
            });

            console.log("elimino las clases de draggable de los tds _onClickCloseModal")
            $("table.o_pms_pwa_reduced_reservation_list_table td.o_pms_pwa_free_day").removeClass(
                "ui-draggable ui-draggable-handle"
            ); //we reset

            drop_function = false;
            console.log(event);
            // self.launchLines(event.currentTarget);
        },

        _onClickGetCalendarLine: function (event) {
            var self = this;
            event.preventDefault();

            self.launchLines(event.currentTarget);
        },
        _onClickConfirmModal: function (event) {
            console.log("Confirmo en modal.");
            var self = this;
            event.preventDefault();
            drop_function = false;
            var send_date = $("input[name='modal_date']").val();
            var send_reservation = $("input[name='modal_reservation']").val();
            var send_room = $("input[name='modal_room']").val();
            ajax.jsonRpc("/calendar/reduced-change", "call", {
                id: send_reservation,
                date: send_date,
                room: send_room,
                submit: true,
                // selected_display: selected_display,
            }).then(function (data) {
                $("#confirmChange").modal("hide");
                var data_id = data["reservation"];
                // var reservation_table = require("pms_pwa.reservation_table");
                // new reservation_table(this).reloadReservationInfo(data_id);
                ajax.jsonRpc("/reservation/json_data", "call", {
                    reservation_id: data_id,
                }).then(function (updated_data) {
                    setTimeout(function () {
                        if (updated_data) {
                            try {
                                var selected_display = $(
                                    'input[name="selected_display"]'
                                ).val();
                                if (selected_display == "ubication") {
                                    var selected_id = updated_data.current_ubication_id;
                                } else if (selected_display == "room_type") {
                                    var selected_id = updated_data.current_room_type_id;
                                } else if (selected_display == "pms_property") {
                                    var selected_id = updated_data.current_property_id;
                                }
                                $(this)
                                    .parents(
                                        "table.o_pms_pwa_reduced_reservation_list_table"
                                    )
                                    .remove();
                                // Destroy draggable
                                $(".o_pms_pwa_line_cell_content").draggable();
                                self.launchLines(this, selected_id);
                            } catch (error) {
                                console.log(error);
                                location.reload();
                            }
                        } else {
                            console.log(error);
                            location.reload();
                        }
                    });
                });
            });
        },
    });
});

