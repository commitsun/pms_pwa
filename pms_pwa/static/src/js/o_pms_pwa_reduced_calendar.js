odoo.define("pms_pwa.reduced_calendar", function (require) {
    "use strict";

    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    var qweb = core.qweb;
    const session = require("web.session");
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
    publicWidget.registry.ReducedCalendarPorpertyChanges = publicWidget.Widget.extend({
        selector: "#propertyTab, #o_pms_pwa_update_calendar",
        events: {
            "click a.property-change": "_onClickPropertyChange",
            "click #update_calendar": "_onClickPropertyChange",
        },
        /**
         * @override
         */
        start: function () {
            var self = this;
            return this._super.apply(this, arguments);
        },
        init: function () {
            var self = this;
            return this._super.apply(this, arguments);
        },
        _onClickPropertyChange: function (event) {
            var self = this;
            event.preventDefault();
            $("#status").toggle();
            $("#preloader").toggle();
            $(".active").not($(this)).removeClass("active");
            let urlParams = new URLSearchParams(window.location.search);
            let selected_date = false;
            let parameters =
                "?selected_property=" +
                event.currentTarget.getAttribute("data-sl-property");
            if (urlParams.has("selected_date")) {
                selected_date = urlParams.get("selected_date");
                parameters = parameters + "&selected_date=" + selected_date;
            }
            $(this).addClass("active");
            $("#reduced_calendar_table").load(
                "/calendar/reduced" + parameters + " #reduced_calendar_table>*"
            );
            $("#preloader").fadeOut(2500);
        },
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
            "click .open_changeValues": "_onClickChangeValues",
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
            //     self._launchLines(this);
            // }).get();
            return this._super.apply(this, arguments);
        },
        convertDay: function (day_to_convert) {
            console.log("day_to_convert --->", day_to_convert);
            var self = this;
            if (document.documentElement.lang === "es-ES") {
                try {
                    let parts_of_date = day_to_convert.split("/");

                    let new_date =
                        parts_of_date[0] +
                        "/" +
                        parts_of_date[1] +
                        "/" +
                        parts_of_date[2];

                    day_to_convert = new_date;
                } catch (error) {
                    console.error("Invalid format date", error);
                    return false;
                }
            } else {
                try {
                    let parts_of_date = day_to_convert.split("/");
                    let new_date =
                        parts_of_date[1] +
                        "-" +
                        parts_of_date[0] +
                        "-" +
                        parts_of_date[2];

                    day_to_convert = new_date;
                } catch (error) {
                    console.error("Invalid format date", error);
                    return false;
                }
            }
            return day_to_convert;
        },
        closestEdge: function (mouse, elem) {
            var self = this;
            var elemBounding = elem.getBoundingClientRect();
            var elementLeftEdge = elemBounding.left;
            var elementTopEdge = elemBounding.top + 100;
            var elementRightEdge = elemBounding.right;
            var elementBottomEdge = elemBounding.bottom + 100;

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

        _launchLines: function (event, pms_property_id = false) {
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
                // Esto hace que funcione el colorear de la tabla
                $("table.o_pms_pwa_reduced_reservation_list_table").tableHover({
                    colClass: "hover",
                });
                // ESTO PARA CREAR EL DRAG
                $(
                    "table.o_pms_pwa_reduced_reservation_list_table td.o_pms_pwa_reduced_calendar_reservation"
                ).draggable({
                    containment: "table.o_pms_pwa_reduced_reservation_list_table",
                    revert: "invalid",
                    axis: "y",
                    cursor: "pointer",
                    scroll: false,
                    iframeFix: true,
                    forceFallback: true,
                    animation: 0,
                });
                // ESTO PARA VER DONDE IR Y DROP PARA CONOCER DONDE SE SUELTA
                $(
                    "table.o_pms_pwa_reduced_reservation_list_table td.o_pms_pwa_line_cell_content"
                ).droppable({
                    // CLASES PARA MOSTRAR CUADROS ACTIVOS Y COLOR DE HOVER
                    classes: {
                        "ui-droppable-active": "ui-state-active",
                        "ui-droppable-hover": "ui-state-hover",
                    },
                    drop: function (event, ui) {
                        event.preventDefault();
                        console.log("hola drop_function", drop_function);
                        //if (drop_function) {
                            // console.log("drop_function --->", drop_function);
                            ajax.jsonRpc("/calendar/reduced-change", "call", {
                                id: ui.draggable.data("id"),
                                date: ui.draggable.data("date"),
                                room: event.target.dataset.calendarRoom,
                                // selected_display: selected_display,
                            }).then(function (data) {
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
                                    // $(".o_pms_pwa_line_cell_content").draggable("destroy");
                                    // $(".o_pms_pwa_line_cell_content").draggable();
                                    // console.log("elimino las clases de draggable de los tds")
                                    // $("table.o_pms_pwa_reduced_reservation_list_table td.o_pms_pwa_free_day").removeClass(
                                    //     "ui-draggable ui-draggable-handle"
                                    // ); //we reset
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
                                    // $(".o_pms_pwa_line_cell_content").removeAttr("style");

                                    // Destroy original draggable and create new one
                                    // $(".o_pms_pwa_line_cell_content").draggable("destroy");
                                    // $(".o_pms_pwa_line_cell_content").draggable();
                                    // console.log("elimino las clases de draggable de los tds")
                                    // $("table.o_pms_pwa_reduced_reservation_list_table td.o_pms_pwa_free_day").removeClass(
                                    //     "ui-draggable ui-draggable-handle"
                                    // ); //we reset
                                    $(this).effect("highlight", {}, 1500);
                                    drop_function = false;
                                }
                            });
                        //}
                    },
                });
                // Arrastras para crear reserva
                $(
                    "table.o_pms_pwa_reduced_reservation_list_table td.o_pms_pwa_free_day"
                ).mousedown(function (e) {
                    //Mouse Down
                    e.preventDefault();
                    mouseDown = true;
                    mouseUp = false;
                    doneSelecting = false;
                    drop_function = false;
                    elemMousedowned = $(e.target);
                    initial_day = elemMousedowned.data("date");
                    calendar_room = elemMousedowned.data("calendar-room");
                    //we are selecting in this row
                    $("tr.o_pms_pwa_reduced_calendar_line").removeClass(
                        "o_pms_pwa_range_days_selecting"
                    ); //we reset
                    elemMousedowned
                        .parent("tr.o_pms_pwa_reduced_calendar_line")
                        .addClass("o_pms_pwa_range_days_selecting");
                    // console.log("mouseDown o_pms_pwa_range_days_selecting")
                    $("table.o_pms_pwa_reduced_reservation_list_table ")
                        .removeClass(
                            "o_pms_pwa_range_days_selected o_pms_pwa_range_days_first o_pms_pwa_range_days_end o_pms_pwa_range_days_start"
                        )
                        .attr("unselectable", "on"); //we reset
                    elemMousedowned.addClass(
                        "o_pms_pwa_range_days_selected o_pms_pwa_range_days_start"
                    ); // we started
                });

                $("table.o_pms_pwa_reduced_reservation_list_table").mouseup(function (
                    e
                ) {
                    //Mouse Up
                    e.preventDefault();
                    mouseDown = false;
                    mouseUp = true;
                    elemMouseuped = $(e.target);
                    // console.log("drop_function ->", drop_function);
                    // console.log("doneSelecting --->", doneSelecting);

                    if (!drop_function) {
                        if (
                            elemMouseuped
                                .parent("tr.o_pms_pwa_reduced_calendar_line")
                                .hasClass("o_pms_pwa_range_days_selecting")
                        ) {
                            $(
                                ".o_pms_pwa_range_days_selecting .o_pms_pwa_range_days_end"
                            ).removeClass("o_pms_pwa_range_days_end");
                            //the end one
                            elemMouseuped.addClass(
                                "o_pms_pwa_range_days_selected o_pms_pwa_range_days_end"
                            );
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
                                // console.log("checkin_date ----> ", checkin_date);
                                // console.log("checkout_date ----> ", checkout_date);
                                if (initial_day > last_day) {
                                    console.log("Cambio las fechas");
                                    let change_date = checkin_date;
                                    checkin_date = checkout_date;
                                    checkout_date = change_date;
                                }

                                let range_date = checkin_date + " - " + checkout_date;
                                // console.log("Range date -> ", range_date);
                                $("#bookengine_table > tr").remove();
                                $("#booking_engine_form")
                                    .find(
                                        "input:text, input:password, input:file, select, textarea"
                                    )
                                    .val("");
                                $(
                                    "div#o_pms_pwa_new_reservation_modal #segmentation_ids"
                                ).select2("destroy");
                                $(
                                    "div#o_pms_pwa_new_reservation_modal #amenity_ids"
                                ).select2("destroy");
                                $(
                                    'form#booking_engine_form input[name="calendar_room"]'
                                ).val(calendar_room);
                                $(
                                    'form#booking_engine_form select[name="pricelist"]'
                                ).val(pricelist);
                                $(
                                    'form#booking_engine_form input[name="new_reservation_date_modal_reservation"]'
                                ).val(range_date);
                                $('form#booking_engine_form input[name="checkin"]').val(
                                    checkin_date
                                );
                                $(
                                    'form#booking_engine_form input[name="checkout"]'
                                ).val(checkout_date);
                                $("form#booking_engine_form")
                                    .find(
                                        "input[name='new_reservation_date_modal_reservation']"
                                    )
                                    .trigger("change");
                                $(".open-calendar-modalDialog").attr(
                                    "data-range_days",
                                    true
                                );
                                $(".open-calendar-modalDialog").click();
                                $(".open-calendar-modalDialog").attr(
                                    "data-range_days",
                                    false
                                );
                            }
                        }
                    }
                });

                $(
                    "table.o_pms_pwa_reduced_reservation_list_table td.o_pms_pwa_free_day"
                ).hover(
                    function (e) {
                        // console.log("--->", doneSelecting);
                        // Esta función se ejecuta cuando el puntero del ratón entra en el elemento tr
                        $(this)
                            .parent("tr.o_pms_pwa_reduced_calendar_line")
                            .hasClass("o_pms_pwa_range_days_selecting");
                        if (!doneSelecting) {
                            // console.log("hover");
                            if (
                                $(this)
                                    .parent("tr.o_pms_pwa_reduced_calendar_line")
                                    .hasClass("o_pms_pwa_range_days_selecting") &&
                                mouseDown
                            ) {
                                //only in the selected row
                                // console.log("selectingToTheRight -> ", selectingToTheRight);
                                if (selectingToTheRight) {
                                    $("td.o_pms_pwa_range_days_end").removeClass(
                                        "o_pms_pwa_range_days_end"
                                    ); //we reset any end TD
                                    $(this).addClass(
                                        "o_pms_pwa_range_days_selected o_pms_pwa_range_days_end"
                                    );
                                }

                                if (selectingToTheLeft) {
                                    $(this).addClass(
                                        "o_pms_pwa_range_days_selected o_pms_pwa_range_days_start"
                                    );
                                }
                                $(this).addClass(
                                    "o_pms_pwa_range_days_selected o_pms_pwa_range_days_start"
                                );
                            }
                        }
                    },
                    function (e) {
                        // console.log("doneSelecting ----> ", doneSelecting);
                        // Esta función se ejecuta cuando el puntero del ratón sale del elemento tr
                        if (!doneSelecting) {
                            if (
                                $(this)
                                    .parent("tr.o_pms_pwa_reduced_calendar_line")
                                    .hasClass("o_pms_pwa_range_days_selecting") &&
                                mouseDown
                            ) {
                                try {
                                    var went = self.closestEdge(e, $(this)[0]);
                                    // console.log("mouseDown entro")
                                    if (went == "top" || went == "bottom") {
                                        // console.log("donde? ->", went);
                                        // console.log("this ->", $(this));
                                        $(
                                            ".o_pms_pwa_range_days_selecting .o_pms_pwa_range_days_end"
                                        ).removeClass("o_pms_pwa_range_days_end");
                                        $(this).addClass(
                                            "o_pms_pwa_range_days_selected o_pms_pwa_range_days_end"
                                        );
                                        // $(this).closest('td').next('td').addClass("o_pms_pwa_range_days_selected o_pms_pwa_range_days_end");
                                        doneSelecting = true;
                                        // console.log("top/bottom ->", doneSelecting);
                                    }

                                    if (went == "right") {
                                        console.log("Right");
                                        if (
                                            $(this).hasClass(
                                                "o_pms_pwa_range_days_start"
                                            )
                                        ) {
                                            selectingToTheLeft = false;
                                            selectingToTheRight = true;
                                        } else {
                                            $(this).removeClass(
                                                "o_pms_pwa_range_days_selected o_pms_pwa_range_days_end"
                                            );
                                            $(this).addClass(
                                                "o_pms_pwa_range_days_selected"
                                            );
                                        }
                                    }
                                    if (went == "left") {
                                        console.log("left");
                                        if (
                                            $(this).hasClass(
                                                "o_pms_pwa_range_days_start"
                                            )
                                        ) {
                                            selectingToTheLeft = true;
                                            selectingToTheRight = false;
                                            $(this).removeClass(
                                                "o_pms_pwa_range_days_selected o_pms_pwa_range_days_start"
                                            );
                                            $(this).addClass(
                                                "o_pms_pwa_range_days_selected o_pms_pwa_range_days_end"
                                            );
                                        } else {
                                            $(this).removeClass(
                                                "o_pms_pwa_range_days_selected o_pms_pwa_range_days_end"
                                            );
                                        }
                                    }
                                } catch {
                                    console.log("error");
                                    // $(".o_pms_pwa_range_days_selecting .o_pms_pwa_range_days_end").removeClass("o_pms_pwa_range_days_end");
                                    // $(this).addClass("o_pms_pwa_range_days_selected o_pms_pwa_range_days_end");
                                    // // $(this).closest('td').next('td').addClass("o_pms_pwa_range_days_selected o_pms_pwa_range_days_end");
                                    // doneSelecting = true;
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
            console.log("reinicio el calendario", event);
            $(
                "table.o_pms_pwa_reduced_reservation_list_table td.o_pms_pwa_reduced_calendar_line_event"
            ).removeClass(
                "o_pms_pwa_range_days_selected o_pms_pwa_range_days_start o_pms_pwa_range_days_end o_pms_pwa_range_days_first"
            );
            $(
                "table.o_pms_pwa_reduced_reservation_list_table tr.o_pms_pwa_reduced_calendar_line"
            ).removeClass("o_pms_pwa_range_days_selecting");
            let modal_property_id = $("input[name='modal_property_id']").val();
            // $(".o_pms_pwa_line_cell_content").removeAttr("style");
            // Destroy original draggable and create new one
            // $(".o_pms_pwa_line_cell_content").draggable();
            // $(".o_pms_pwa_line_cell_content").draggable("destroy");
            // $("table.o_pms_pwa_reduced_reservation_list_table td.o_pms_pwa_reduced_calendar_reservation").draggable({
            //     containment: "table.o_pms_pwa_reduced_reservation_list_table",
            //     axis: "y",
            //     // start: function (event, ui) {
            //     //     //event.preventDefault();
            //     //     console.log("creo de nuevo el dragabble");
            //     //     $(event.currentTarget).addClass("z-index-all");
            //     //     $(".o_pms_pwa_line_cell_content").removeAttr("style");
            //     //     $(".o_pms_pwa_line_cell_content").draggable();
            //     //     drop_function = true;
            //     //     event.preventDefault();
            //     // },
            // });

            // console.log("elimino las clases de draggable de los tds _onClickCloseModal")
            // $("table.o_pms_pwa_reduced_reservation_list_table td.o_pms_pwa_free_day").removeClass(
            //     "ui-draggable ui-draggable-handle"
            // ); //we reset

            drop_function = false;
            self._launchLines(event.currentTarget, modal_property_id);
        },

        _onClickGetCalendarLine: function (event) {
            var self = this;
            event.preventDefault();

            self._launchLines(event.currentTarget);
        },
        _onClickChangeValues: function (event) {
            var self = this;
            event.preventDefault();
            try {
                // Reset values
                $("input[type=checkbox]").each(function () {
                    this.checked = false;
                });
                $(".roomdoo_rules :input[type=text]").val("");
                $(".hidde_modal").attr("style", "display:none;");
                console.log("vacio todo");
            } catch (err) {
                console.log("ERROR: ", err);
            }
            // Add default values
            try {
                let date_select = event.currentTarget.getAttribute("data-date");
                $("input[name='modal_start_date']").val(date_select);
                $("input[name='modal_end_date']").val(date_select);
                $('input[type="date"]').datepicker();
                // $('select').selectpicker('deselectAll');
                var text = $(
                    "select#room_type_model[name=modal_room_type] option[value='" +
                        event.currentTarget.getAttribute("data-room_type") +
                        "']"
                ).text();
                $(".modal_room_type .bootstrap-select .filter-option").text(text);
                $("select#room_type_model[name=modal_room_type]").val(
                    event.currentTarget.getAttribute("data-room_type")
                );

                var text = $(
                    "select#modal_pricelist_id[name=modal_pricelist_id] option[value='" +
                        event.currentTarget.getAttribute("data-pricelist") +
                        "']"
                ).text();
                $(".modal_pricelist_id .bootstrap-select .filter-option").text(text);
                $("select#modal_pricelist_id[name=modal_pricelist_id]").val(
                    event.currentTarget.getAttribute("data-pricelist")
                );

                var text = $(
                    "select#select_availability_plan_id[name=modal_availability_plan_ids] option[value='" +
                        event.currentTarget.getAttribute("data-availability_plan") +
                        "']"
                ).text();
                $(".modal_availability_plan_ids .bootstrap-select .filter-option").text(
                    text
                );
                $(
                    "select#select_availability_plan_id[name=modal_availability_plan_ids]"
                ).val(event.currentTarget.getAttribute("data-availability_plan"));
            } catch (err) {
                console.log("ERROR: ", err);
            }

            $("#changesDaysValues").modal("show");
        },
        _onClickConfirmModal: function (event) {
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
                                var selected_id = updated_data.current_property_id;
                                $(this)
                                    .parents(
                                        "table.o_pms_pwa_reduced_reservation_list_table"
                                    )
                                    .remove();
                                // Destroy draggable
                                $(".o_pms_pwa_line_cell_content").draggable();
                                self._launchLines(this, selected_id);
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

    $(document).ready(function () {
        $("select#room_type_model").selectpicker();
        $(".hidde_show_price").click(function (event) {
            if ($(this).is(":checked")) {
                $(".hidde_price").show();
            } else {
                $(".hidde_price").hide();
            }
        });
        $(".hidde_show_cupo").click(function (event) {
            if ($(this).is(":checked")) {
                $(".hidde_cupo").show();
            } else {
                $(".hidde_cupo").hide();
            }
        });
        $(".hidde_show_estmin").click(function (event) {
            if ($(this).is(":checked")) {
                $(".hidde_estmin").show();
            } else {
                $(".hidde_estmin").hide();
            }
        });
        $(".hidde_show_closed").click(function (event) {
            if ($(this).is(":checked")) {
                $(".hidde_closed").show();
            } else {
                $(".hidde_closed").hide();
            }
        });
        $(".hidde_show_max_stay").click(function (event) {
            if ($(this).is(":checked")) {
                $(".hidde_max_stay").show();
            } else {
                $(".hidde_max_stay").hide();
            }
        });
        $(".hidde_show_max_dispo").click(function (event) {
            if ($(this).is(":checked")) {
                $(".hidde_max_dispo").show();
            } else {
                $(".hidde_max_dispo").hide();
            }
        });
        $(".hidde_show_max_stay_sa").click(function (event) {
            if ($(this).is(":checked")) {
                $(".hidde_max_stay_sa").show();
            } else {
                $(".hidde_max_stay_sa").hide();
            }
        });
        $(".hidde_show_max_stay_ll").click(function (event) {
            if ($(this).is(":checked")) {
                $(".hidde_max_stay_ll").show();
            } else {
                $(".hidde_max_stay_ll").hide();
            }
        });
        $(".hidde_show_closed_arrival").click(function (event) {
            if ($(this).is(":checked")) {
                $(".hidde_closed_arrival").show();
            } else {
                $(".hidde_closed_arrival").hide();
            }
        });
    });
    $("#reduced_calendar_table").on("change", "input[type='text']", function () {
        this.style.backgroundColor = "yellow";
        var element = document.getElementById("save");
        $(this).data("edit", true);
        element.classList.remove("d-none");
    });
    $("#multi_days_values input:checkbox").change(function () {
        if (this.name == "apply_on_all_week") {
            $("#multi_days_values input:checkbox").prop(
                "checked",
                $(this).prop("checked")
            );
        } else {
            $("#multi_days_values input[name='apply_on_all_week']:checkbox").prop(
                "checked",
                false
            );
        }
    });
    publicWidget.registry.ReducedCalendarModalChanges = publicWidget.Widget.extend({
        selector: "#changesDaysValues",
        events: {
            "click a.send_changesDaysValues": "_onClickSendModalChange",
        },
        /**
         * @override
         */
        start: function () {
            var self = this;
            return this._super.apply(this, arguments);
        },
        init: function () {
            var self = this;
            return this._super.apply(this, arguments);
        },
        _onClickSendModalChange: function (event) {
            var self = this;
            event.preventDefault();
            let send_values = {
                start_date: $("input[name=modal_start_date]").val(),
                end_date: $("input[name=modal_end_date]").val(),
                pms_property_id: $("input[name=modal_pms_property_id]").val(),
                availability_plan_ids: $(
                    "select[name=modal_availability_plan_ids]"
                ).val(),
                pricelist_id: $("select[name=modal_pricelist_id]").val(),
                room_type: $("select[name=modal_room_type]").val(),
                days: {
                    apply_on_monday: $("input[name=apply_on_monday]").prop("checked"),
                    apply_on_tuesday: $("input[name=apply_on_tuesday]").prop("checked"),
                    apply_on_wednesday: $("input[name=apply_on_wednesday]").prop(
                        "checked"
                    ),
                    apply_on_thursday: $("input[name=apply_on_thursday]").prop(
                        "checked"
                    ),
                    apply_on_friday: $("input[name=apply_on_friday]").prop("checked"),
                    apply_on_saturday: $("input[name=apply_on_saturday]").prop(
                        "checked"
                    ),
                    apply_on_sunday: $("input[name=apply_on_sunday]").prop("checked"),
                },
            };
            if ($("input[name=show_price]").prop("checked")) {
                send_values["price"] = $("input[name=modal_price]").val();
            }
            if ($("input[name=show_cupo]").prop("checked")) {
                send_values["cupo"] = $("input[name=modal_cupo]").val();
            }
            if ($("input[name=show_estmin]").prop("checked")) {
                send_values["estmin"] = $("input[name=modal_estmin]").val();
            }
            if ($("input[name=show_closed]").prop("checked")) {
                send_values["closed"] = $("input[name=modal_closed]").val();
            }
            if ($("input[name=show_max_dispo]").prop("checked")) {
                send_values["max_dispo"] = $("input[name=modal_max_dispo]").val();
            }
            if ($("input[name=show_max_stay]").prop("checked")) {
                send_values["max_stay"] = $("input[name=modal_max_stay]").val();
            }
            if ($("input[name=show_max_stay_sa]").prop("checked")) {
                send_values["max_stay_sa"] = $("input[name=modal_max_stay_sa]").val();
            }
            if ($("input[name=show_max_stay_ll]").prop("checked")) {
                send_values["max_stay_ll"] = $("input[name=modal_max_stay_ll]").val();
            }
            if ($("input[name=show_closed_arrival]").prop("checked")) {
                send_values["closed_arrival"] = $(
                    "input[name=modal_closed_arrival]"
                ).val();
            }

            ajax.jsonRpc("/calendar/modal", "call", {
                send_values,
            }).then(function (updated_data) {
                $("#changesDaysValues").modal("toggle");
            });
        },
    });
});
