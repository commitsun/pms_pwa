odoo.define("pms_pwa.reservation_table", function (require) {
    "use strict";
    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    require("web.ServicesMixin");
    // var PortalSidebar = require('portal.PortalSidebar');
    var _t = core._t;
    var publicWidget = require("web.public.widget");
    //var reduced_calendar = require("pms_pwa.reducedCalendarRoomdoo");

    var csrf_token = core.csrf_token;
    const date_options = {year: "numeric", month: "2-digit", day: "2-digit"};
    const relation_values = {
        allowed_agency_ids: "agency_id",
        allowed_board_service_room_ids: "board_service_room_id",
        allowed_board_services: "board_service_room_id",
        reservation_types: "reservation_type",
        allowed_channel_type_ids: "channel_type_id",
        allowed_pricelists: "pricelist_id",
        allowed_segmentations: "segmentation_ids",
        room_numbers: "preferred_room_id",
        room_types: "room_type_id",
        allowed_country_ids: "country_id",
        allowed_state_ids: "residence_state_id",
        allowed_sale_category_ids: "sale_category_id",
        allowed_amenity_ids: "amenity_ids",
    };
    const fields_to_avoid = ["primary_button", "secondary_buttons"];
    $("button.close > span.o_pms_pwa_tag_close").on("click", function (event) {
        event.preventDefault();
        var input = event.currentTarget.parentNode.getAttribute("data-tag");
        if (input === "search") {
            $("input[name='original_search']").val("");
        } else {
            $("input[name='" + input + "']").val("");
        }
        $("form").submit();
    });


    publicWidget.registry.ReservationTableWidget = publicWidget.Widget.extend({
        selector:
            "table.o_pms_pwa_reservation_list_table, #o_pms_detail_reservation, table.launch_modal, table.o_pms_pwa_reduced_reservation_list_table",
        xmlDependencies: [
            "/pms_pwa/static/src/xml/pms_pwa_roomdoo_reservation_modal.xml",
        ],
        events: {
            "click tr.o_pms_pwa_reservation:not(.accordion) > td:not(:last-child)":
                "_onClickReservationButton",
            "dblclick tr.o_pms_pwa_reservation:not(.accordion) > td:not(:last-child)":
                "_onDobleClickReservationButton",
            "click td.o_pms_pwa_calendar_reservation": "_onClickReservationButton",
            "dblclick td.o_pms_pwa_calendar_reservation":
                "_onDobleClickReservationButton",
            "click td.o_pms_pwa_reduced_calendar_reservation": "_onClickReservationButton",
            "dblclick td.o_pms_pwa_reduced_calendar_reservation":
                "_onDobleClickReservationButton",
            "click a.launch_for_notification": "_onClickReservationButton",
            "click td.launch_modal": "_onClickReservationButton",
            "dblclick td.launch_modal": "_onDobleClickReservationButton",
            "click .o_pms_pwa_button_asignar": "_onClickAssingButton",
            "click tbody > tr > td:not(:last-child) a": "_onClickNotLastChildA",
            "click .o_pms_pwa_button_checkins": "_onClickCheckinButton",
            "click .o_pms_pwa_button_cancelar": "_onClickCancelButton",
            "click .o_pms_pwa_button_checkout": "_onClickCheckoutButton",
            "click .o_pms_pwa_button_pagar": "_onClickPaymentButton",
            "click .o_pms_pwa_button_refund": "_onClickRefundButton",
            "click .o_pms_pwa_button_facturar": "_onClickInvoiceButton",
            "click .o_pms_pwa_button_new_reservation": "_onClickNewReservation",
        },
        /**
         * @override
         */

        start: function () {
            var self = this;
            self.reservation_text = _t("Reservation");
            self.info_text = _t("More info");
            self.unread_text = _t("unread message(s)");
            self.room_type_text = _t("Room type");
            self.room_number_text = _t("Room nº");
            self.nights_number_text = _t("Nights nº");
            self.adults_number_text = _t("Adults nº");
            self.check_in_text = _t("Check in");
            self.check_in_time_text = _t("Check in time");
            self.check_out_text = _t("Check out");
            self.check_out_time_text = _t("Check out time");
            self.room_price_text = _t("Room price");
            self.sales_channel_text = _t("Sales channel");
            self.extras_text = _t("Extras");
            self.card_text = _t("Reservation card number");
            self.total_nights_text = _t("Total nights price");
            self.total_text = _t("Total reservation price");
            self.outstanding_text = _t("Outstanding");
            self.pay_text = _t("Pay");
            self.notes_text = _t("Notes");
            return this._super.apply(this, arguments);
        },
        displayContent: function (xmlid, render_values) {
            var self = this;
            var html = core.qweb.render(xmlid, render_values);
            $("div.o_pms_pwa_roomdoo_reservation_modal").html(html);
            $("div.o_pms_pwa_reservation_modal").modal();
            let modal = $("div.o_pms_pwa_reservation_modal");
            $('input[name="date"]').val(moment().format('DD/MM/YYYY'));
            $(".o_pms_pwa_payment_modal_daterangepicker").daterangepicker(
                {
                    locale: {
                        direction: "ltr",
                        format: "DD/MM/YYYY",
                        applyLabel: "Aplicar",
                        cancelLabel: "Cancelar",
                    },
                    singleDatePicker: true,
                    showDropdowns: true,
                    autoUpdateInput: false,
                    minYear: 1901,
                    maxYear: parseInt(moment().format("YYYY"), 10),
                },
                function (start) {
                    console.log(start);
                    let start_date = moment(start).format('DD/MM/YYYY');
                    modal.find('input[name="modal_date"]').val(start_date)
                    this.element.val(start_date);
                }
            );
        },
        modalButtonsOnChange: function () {
            var self = this;
            $("div.o_pms_pwa_modal_buttons button.o_pms_pwa_button_asignar").on(
                "click",
                function (event) {
                    event.preventDefault();
                    var reservation_id = $(
                        "#o_pms_pwa_reservation_modal"
                    )[0].getAttribute("data-id");

                    ajax.jsonRpc(
                        "/reservation/" + reservation_id + "/assign",
                        "call",
                        {}
                    ).then(function (res) {
                        if (res) {
                            if (JSON.parse(res).result) {
                                self.displayDataAlert(res);
                                $(
                                    "div.o_pms_pwa_modal_buttons button.o_pms_pwa_button_asignar"
                                ).hide();
                            }
                        }
                    });
                }
            );

            $(
                "div.o_pms_pwa_modal_buttons button.o_pms_pwa_button_checkins, a.o_pms_pwa_button_checkins"
            ).on("click", function (event) {
                event.preventDefault();
                self._onClickCheckinButton(event);
            });

            $("div.o_pms_pwa_modal_buttons button.o_pms_pwa_button_checkout").on(
                "click",
                function (event) {
                    event.preventDefault();
                    self._onClickCheckoutButton(event);
                }
            );

            $("div.o_pms_pwa_modal_buttons button.o_pms_pwa_button_pagar").on(
                "click",
                function (event) {
                    event.preventDefault();
                    self._onClickPaymentButton(event);
                }
            );

            $("div.o_pms_pwa_modal_buttons button.o_pms_pwa_button_refund").on(
                "click",
                function (event) {
                    event.preventDefault();
                    self._onClickRefundButton(event);
                }
            );

            $("div.o_pms_pwa_modal_buttons button.o_pms_pwa_button_facturar").on(
                "click",
                function (event) {
                    event.preventDefault();
                    self._onClickInvoiceButton(event);
                }
            );

            $("div.o_pms_pwa_modal_buttons button.o_pms_pwa_button_cancelar").on(
                "click",
                function (event) {
                    event.preventDefault();
                    self._onClickCancelButton(event);
                }
            );

            $("div.o_pms_pwa_modal_buttons button.o_pms_pwa_button_new_reservation").on(
                "click",
                function (event) {
                    event.preventDefault();
                    self._onClickNewReservation(event);
                }
            );
        },
        reloadReservationInfo: function (data_id = false) {
            var self = this;
            if (String(window.location.href).includes(String("/reservation/list"))) {
                ajax.jsonRpc("/reservation/json_data", "call", {
                    reservation_id: data_id,
                }).then(function (updated_data) {
                    setTimeout(function () {
                        if (updated_data) {
                            try {
                                $(String("#reservation_" + data_id)).find(
                                    "td"
                                )[2].innerHTML =
                                    updated_data.preferred_room_id.name +
                                    "<br/> <span class='o_pms_pwa_wler'>" +
                                    updated_data.room_type_id.default_code +
                                    "</span>";
                                $(String("#reservation_" + data_id)).find(
                                    "td"
                                )[3].innerHTML =
                                    updated_data.checkin +
                                    "<br/> <span class='o_pms_pwa_wler'>" +
                                    updated_data.arrival_hour +
                                    "</span>";
                                $(String("#reservation_" + data_id)).find(
                                    "td"
                                )[4].innerHTML =
                                    updated_data.checkout +
                                    "<br/> <span class='o_pms_pwa_wler'>" +
                                    updated_data.departure_hour +
                                    "</span>";
                                if (
                                    updated_data.agency_id &&
                                    updated_data.agency_id.url
                                ) {
                                    $(String("#reservation_" + data_id)).find(
                                        "td"
                                    )[5].innerHTML =
                                        "<img src=" +
                                        updated_data.agency_id.url +
                                        " width='80' title='" +
                                        updated_data.agency_id.name +
                                        "' alt='" +
                                        updated_data.agency_id.name +
                                        "'/>";
                                } else {
                                    if (
                                        updated_data.channel_type_id &&
                                        updated_data.user_name
                                    ) {
                                        var chan_name = "";
                                        if (updated_data.channel_type_id.name) {
                                            var chan_name =
                                                updated_data.channel_type_id.name;
                                        }
                                        $(String("#reservation_" + data_id)).find(
                                            "td"
                                        )[5].innerHTML =
                                            chan_name +
                                            "<br/> <span class='o_pms_pwa_wler'>" +
                                            updated_data.user_name +
                                            "</span>";
                                    }
                                }
                                $(String("#reservation_" + data_id)).find(
                                    "td"
                                )[6].innerHTML =
                                    Math.round(
                                        (updated_data.folio_id.amount_total +
                                            Number.EPSILON) *
                                            100
                                    ) / 100;
                                $(String("#reservation_" + data_id)).find(
                                    "td"
                                )[7].innerHTML =
                                    Math.round(
                                        (updated_data.folio_id.outstanding_vat +
                                            Number.EPSILON) *
                                            100
                                    ) / 100;
                                if (updated_data.partner_requests) {
                                    $(String("#reservation_" + data_id)).find(
                                        "td"
                                    )[8].innerHTML = updated_data.partner_requests.substring(
                                        0,
                                        25
                                    );
                                }
                                if (
                                    updated_data.board_service_room_id &&
                                    updated_data.board_service_room_id.name
                                ) {
                                    $(String("#reservation_" + data_id)).find(
                                        "td"
                                    )[9].innerHTML =
                                        updated_data.board_service_room_id.name;
                                }
                                $(String("#reservation_" + data_id)).find(
                                    "td"
                                )[10].firstElementChild.outerHTML =
                                    updated_data.primary_button;
                                $(String("#reservation_" + data_id)).find(
                                    "td"
                                )[10].lastElementChild.lastElementChild.innerHTML =
                                    updated_data.secondary_buttons;
                            } catch (error) {
                                console.log(error);
                            }
                        }
                    });
                });
            } else if (String(window.location.href).includes(String("/dashboard"))) {
                console.log("No se puede hacer reload en dashboard");
                // Mirar si hay que borrar de la campanita el aviso.
            } else {
                //let modal_property_id = $("input[name='modal_property_id']").val();
                //new reduced_calendar(this)._launchLines(false, modal_property_id);
                $("span#o_pms_pwa_close_modal_otf button.close_confirmChange").click();
            }
        },
        displayDataAlert: function (result, data_id = false) {
            var self = this;
            try {
                var data = JSON.parse(result);
            } catch (error) {
                var data = result;
            }

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
        },
        refreshMultiModal: function (result, data_id = false) {
            var self = this;
            var allowed_fields = ["room_numbers"];
            var folio_reservation_data = JSON.parse(result).reservation
                .folio_reservations;

            for (let i = 0; i < folio_reservation_data.length; i++) {
                var allowed_fields = ["room_numbers"];
                $.each(allowed_fields, function (key, value) {
                    try {
                        var select = $(
                            'table#multi_reservation_modal tr[data-id="' +
                                folio_reservation_data[i]["id"] +
                                '"] [data-select="' +
                                value +
                                '"]'
                        );
                    } catch (error) {
                        console.log(error);
                    }

                    if (select.length != 0) {
                        select.empty();
                        // if (
                        //     !folio_reservation_data[i][
                        //         relation_values[value]
                        //     ] &
                        //     (folio_reservation_data[i][
                        //         relation_values[value]
                        //     ] ==
                        //         0)
                        // ) {
                        //     select.append(
                        //         '<option value="" selected></option>'
                        //     );
                        // }
                        $.each(folio_reservation_data[i][value], function (
                            subkey,
                            subvalue
                        ) {
                            if (
                                subvalue["id"] ==
                                folio_reservation_data[i][relation_values[value]].id
                            ) {
                                var option = new Option(
                                    subvalue["name"],
                                    subvalue["id"],
                                    false,
                                    true
                                );
                            } else {
                                var option = new Option(
                                    subvalue["name"],
                                    subvalue["id"],
                                    false,
                                    false
                                );
                            }
                            $(option).html(subvalue["name"]);
                            select.append(option);
                        });
                    }
                    delete folio_reservation_data[i][value];
                });
                $.each(folio_reservation_data[i], function (key, value) {
                    // console.log("multimodal, cambio valores", key);
                    var input = $(
                        "table#multi_reservation_modal tr[data-id='" +
                            folio_reservation_data[i]["id"] +
                            "'] input[name='" +
                            key +
                            "']"
                    );
                    if (input.length > 0) {
                        input.val(value);
                    }
                });
            }
        },
        _openModalFromExternal: function (event) {
            var self = this;
            try {
                var reservation_id = event.currentTarget.getAttribute("data-id");

                var new_selector = $(
                    "<td class='launch_modal' data-id='" +
                        reservation_id +
                        "'>Pincha aqui</td>"
                );
                new_selector.appendTo("table.launch_modal");
                setTimeout(function () {
                    $(new_selector).click();
                    $(new_selector).remove();
                }, 100);
            } catch (error) {
                console.log(error);
            }
        },
        /* DobleClick event control */
        _onDobleClickReservationButton: function (event) {
            var self = this;
            event.stopImmediatePropagation();
            event.preventDefault();
            // console.log("Double click");
            var target = $(event.currentTarget);
            /* Disable button for 0.5 seconds */
            target.prop("disabled", true);

            // console.log("Button disabled");

            setTimeout(function () {
                target.prop("disabled", false);
                // console.log("Button enabled");
            }, 500);
        },
        /* OnClick events */
        _onClickReservationButton: function (event) {
            var self = this;
            var target = $(event.currentTarget);
            target.prop("disabled", true);
            event.stopImmediatePropagation();
            event.preventDefault();
            var self = this;
            var reservation_id = event.currentTarget.parentNode.getAttribute("data-id");
            /* Añadido para que sea válido en calendario */
            if (!reservation_id) {
                reservation_id = event.currentTarget.getAttribute("data-id");
            }
            var reservation_data = false;
            /* RPC call to get the reservation data */
            ajax.jsonRpc("/reservation/json_data", "call", {
                reservation_id: reservation_id,
            }).then(function (reservation_data) {
                setTimeout(function () {
                    if (reservation_data) {
                        /* End missin data */

                        self.displayContent("pms_pwa.roomdoo_reservation_modal", {
                            reservation: reservation_data,
                            payment_methods: reservation_data.payment_methods,
                            texts: {
                                reservation_text: this.reservation_text,
                                info_text: this.info_text,
                                unread_text: this.unread_text,
                                room_type_text: this.room_type_text,
                                room_number_text: this.room_number_text,
                                nights_number_text: this.nights_number_text,
                                adults_number_text: this.adults_number_text,
                                check_in_text: this.check_in_text,
                                check_in_time_text: this.check_in_time_text,
                                check_out_text: this.check_out_text,
                                check_out_time_text: this.check_out_time_text,
                                room_price_text: this.room_price_text,
                                sales_channel_text: this.sales_channel_text,
                                extras_text: this.extras_text,
                                card_text: this.card_text,
                                total_text: this.total_text,
                                outstanding_text: this.outstanding_text,
                                pay_text: this.pay_text,
                                notes_text: this.notes_text,
                            },
                        });

                        self.modalButtonsOnChange();

                        $("#o_pms_pwa_reservation_modal").on(
                            "hidden.bs.modal",
                            function () {
                                // console.log("Cierro modal");
                                try {
                                    var data_id = $("#o_pms_pwa_reservation_modal")[0]
                                        .dataset.id;
                                    // console.log("--->", data_id);
                                    if (data_id) {
                                        self.reloadReservationInfo(data_id);
                                    }
                                } catch (error) {
                                    console.log("Error ---", error);
                                }
                            }
                        );
                        // Show more // less
                        try {
                            $("input[name^='o_pms_pwa_service_line_']").map(
                                function () {
                                    var element_id = $(this).val();
                                    if (
                                        $(
                                            ".o_roomdoo_hide_show_service_" +
                                                element_id +
                                                ""
                                        ).length > 3
                                    ) {
                                        $(
                                            ".o_roomdoo_hide_show_service_" +
                                                element_id +
                                                ":gt(2)"
                                        ).hide();
                                        $(".o_roomdoo_hide_show-more2").show();
                                    }
                                    return false;
                                }
                            );
                            $(".o_roomdoo_hide_show-services-more").on(
                                "click",
                                function () {
                                    var service_id = $(this).attr("data-service-id");
                                    $(
                                        ".o_roomdoo_hide_show_service_" +
                                            service_id +
                                            ":gt(2)"
                                    ).toggle();
                                    // Change text of show more element just for demonstration purposes to this demo
                                    if ($(this).text() === "Ver más") {
                                        $(this).text("Ver menos");
                                    } else {
                                        $(this).text("Ver más");
                                    }
                                }
                            );
                        } catch (error) {
                            console.log("Error ---", error);
                        }
                        // On change inputs reservation modal
                        $("form.o_pms_pwa_reservation_form").on(
                            "change",
                            "select, input[type='checkbox'], input[type='radio'], input[type='number'].o_pms_pwa_num-control, input[type='text'][name='range_check_date_modal']",
                            function (new_event) {
                                var values = {};
                                // Set checkin & checkout separated
                                if (
                                    new_event.currentTarget.name ==
                                    "range_check_date_modal"
                                ) {
                                    let value_range_picker =
                                        new_event.currentTarget.value;
                                    values.checkin = value_range_picker.split(" - ")[0];
                                    values.checkout = value_range_picker.split(
                                        " - "
                                    )[1];
                                } else {
                                    if (new_event.currentTarget.dataset.service_id) {
                                        var service_key = "add_service";
                                        if (!new_event.currentTarget.checked) {
                                            service_key = "del_service";
                                        }
                                        values[service_key] =
                                            new_event.currentTarget.dataset.service_id;
                                    } else {
                                        if (
                                            new_event.currentTarget.dataset.main_field
                                        ) {
                                            var main_field =
                                                new_event.currentTarget.dataset
                                                    .main_field;
                                            var field_id =
                                                new_event.currentTarget.dataset
                                                    .field_id;
                                            values[main_field] = {};
                                            values[main_field][field_id] = {};
                                            if (
                                                new_event.currentTarget.dataset
                                                    .subservice_name
                                            ) {
                                                var subservice_name =
                                                    new_event.currentTarget.dataset
                                                        .subservice_name;
                                                var subservice_field_id =
                                                    new_event.currentTarget.dataset
                                                        .subservice_field_id;
                                                values[main_field][field_id][
                                                    subservice_name
                                                ] = {};
                                                values[main_field][field_id][
                                                    subservice_name
                                                ][subservice_field_id] = {};
                                                values[main_field][field_id][
                                                    subservice_name
                                                ][subservice_field_id][
                                                    new_event.currentTarget.name
                                                ] = new_event.currentTarget.value;
                                            } else {
                                                values[main_field][field_id][
                                                    new_event.currentTarget.name
                                                ] = new_event.currentTarget.value;
                                            }
                                        } else {
                                            values[new_event.currentTarget.name] =
                                                new_event.currentTarget.value;
                                        }
                                    }
                                }

                                // Call to set the new values

                                ajax.jsonRpc(
                                    "/reservation/" + reservation_id + "/onchange_data",
                                    "call",
                                    values
                                ).then(function (new_data) {
                                    setTimeout(function () {
                                        if (new_data) {
                                            if (!JSON.parse(new_data).result) {
                                                self.displayDataAlert(new_data);
                                            }
                                            var reservation_data = JSON.parse(new_data)
                                                .reservation;
                                            if (
                                                values &&
                                                ("add_service" in values ||
                                                    "board_service_room_id" in values)
                                            ) {
                                                self.displayDataAlert(new_data);
                                                // cierra modal
                                                $(
                                                    "div.o_pms_pwa_reservation_modal"
                                                ).modal("toggle");
                                                try {
                                                    var selector =
                                                        "tr[data-id=" +
                                                        reservation_data["id"] +
                                                        "]";
                                                    var test = $(selector).find(
                                                        "td.first-col"
                                                    );
                                                    if (test.length != 0) {
                                                        test.click();
                                                    } else {
                                                        // abre modal
                                                        var selector =
                                                            "td[data-id=" +
                                                            reservation_data["id"] +
                                                            "]";
                                                        if ($(selector).length > 0) {
                                                            $(selector).click();
                                                        } else {
                                                            var new_selector = $(
                                                                "<td class='launch_modal' data-id='" +
                                                                    modal_reservation_id +
                                                                    "'>Pincha aqui</td>"
                                                            );
                                                            new_selector.appendTo(
                                                                "table.launch_modal"
                                                            );
                                                            setTimeout(function () {
                                                                $(new_selector).click();
                                                                $(
                                                                    new_selector
                                                                ).remove();
                                                            }, 100);
                                                        }
                                                    }
                                                } catch (error) {
                                                    console.log(error);
                                                }
                                            }

                                            // Refresh reservation modal values and sync with new data
                                            var allowed_fields = [
                                                "allowed_agency_ids",
                                                "allowed_board_service_room_ids",
                                                "reservation_types",
                                                "allowed_channel_type_ids",
                                                "allowed_pricelists",
                                                "allowed_segmentations",
                                                "room_types",
                                                "room_numbers",
                                            ];
                                            $.each(allowed_fields, function (
                                                key,
                                                value
                                            ) {
                                                try {
                                                    var select = $(
                                                        'form.o_pms_pwa_reservation_form [data-select="' +
                                                            value +
                                                            '"]'
                                                    );
                                                } catch (error) {
                                                    console.log(error);
                                                }
                                                if (select.length != 0) {
                                                    select.empty();
                                                    if (
                                                        !reservation_data[
                                                            relation_values[value]
                                                        ] &
                                                        (reservation_data[
                                                            relation_values[value]
                                                        ] ==
                                                            0)
                                                    ) {
                                                        select.append(
                                                            '<option value="" selected></option>'
                                                        );
                                                    }
                                                    $.each(
                                                        reservation_data[value],
                                                        function (subkey, subvalue) {
                                                            if (
                                                                subvalue["id"] ==
                                                                reservation_data[
                                                                    relation_values[
                                                                        value
                                                                    ]
                                                                ].id
                                                            ) {
                                                                var option = new Option(
                                                                    subvalue["name"],
                                                                    subvalue["id"],
                                                                    false,
                                                                    true
                                                                );
                                                            } else {
                                                                var option = new Option(
                                                                    subvalue["name"],
                                                                    subvalue["id"],
                                                                    false,
                                                                    false
                                                                );
                                                            }
                                                            $(option).html(
                                                                subvalue["name"]
                                                            );
                                                            select.append(option);
                                                        }
                                                    );
                                                }
                                                delete reservation_data[value];
                                            });
                                            $.each(reservation_data, function (
                                                key,
                                                value
                                            ) {
                                                var input = $(
                                                    "form.o_pms_pwa_reservation_form input[name='" +
                                                        key +
                                                        "']"
                                                );
                                                if (input.length != 0) {
                                                    input.val(value);
                                                } else {
                                                    if (
                                                        !fields_to_avoid.includes(key)
                                                    ) {
                                                        $(
                                                            "form.o_pms_pwa_reservation_form select[name='" +
                                                                key +
                                                                "'] option[value='" +
                                                                value +
                                                                "']"
                                                        ).prop("selected", true);
                                                    }
                                                }
                                            });
                                            // refresh total
                                            let a = $(
                                                "form.o_pms_pwa_reservation_form .price_total"
                                            );
                                            a[0].innerHTML = JSON.parse(
                                                new_data
                                            ).reservation.price_total;
                                            // refresh pending amount
                                            try {
                                                let b = $(
                                                    "form.o_pms_pwa_reservation_form .pending_amount"
                                                );
                                                b[0].innerHTML = JSON.parse(
                                                    new_data
                                                ).reservation.folio_pending_amount;
                                            } catch (error) {
                                                console.log(error);
                                            }
                                            //refresh multimodal data
                                            if (
                                                reservation_data.folio_reservations
                                                    .length > 1
                                            ) {
                                                self.refreshMultiModal(new_data);
                                            }
                                        }
                                    }, 10);
                                });
                            }
                        );

                        $("form.o_pms_pwa_reservation_form").on(
                            "focusout",
                            "input[type='text'][name!='range_check_date_modal'], input[type='number'], input[type='radio'], input[type='tel'], input[type='email'], input[type='time']",
                            function (new_event) {
                                var values = {};
                                if (new_event.currentTarget.dataset.main_field) {
                                    var main_field =
                                        new_event.currentTarget.dataset.main_field;
                                    var field_id =
                                        new_event.currentTarget.dataset.field_id;
                                    values[main_field] = {};
                                    values[main_field][field_id] = {};
                                    if (
                                        new_event.currentTarget.dataset.subservice_name
                                    ) {
                                        var subservice_name =
                                            new_event.currentTarget.dataset
                                                .subservice_name;
                                        var subservice_field_id =
                                            new_event.currentTarget.dataset
                                                .subservice_field_id;
                                        values[main_field][field_id][
                                            subservice_name
                                        ] = {};
                                        values[main_field][field_id][subservice_name][
                                            subservice_field_id
                                        ] = {};
                                        values[main_field][field_id][subservice_name][
                                            subservice_field_id
                                        ][new_event.currentTarget.name] =
                                            new_event.currentTarget.value;
                                    } else {
                                        values[main_field][field_id][
                                            new_event.currentTarget.name
                                        ] = new_event.currentTarget.value;
                                    }
                                } else {
                                    values[new_event.currentTarget.name] =
                                        new_event.currentTarget.value;
                                }
                                // Call to set the new values
                                ajax.jsonRpc(
                                    "/reservation/" + reservation_id + "/onchange_data",
                                    "call",
                                    values
                                ).then(function (new_data) {
                                    setTimeout(function () {
                                        if (new_data) {
                                            if (!JSON.parse(new_data).result) {
                                                self.displayDataAlert(new_data);
                                            }
                                            // Refresh reservation modal values and sync with new data
                                            var allowed_fields = [
                                                "allowed_agency_ids",
                                                "allowed_board_service_room_ids",
                                                "reservation_types",
                                                "allowed_channel_type_ids",
                                                "allowed_pricelists",
                                                "allowed_segmentations",
                                                "room_types",
                                                "room_numbers",
                                            ];
                                            var reservation_data = JSON.parse(new_data)
                                                .reservation;
                                            $.each(allowed_fields, function (
                                                key,
                                                value
                                            ) {
                                                try {
                                                    var select = $(
                                                        'form.o_pms_pwa_reservation_form [data-select="' +
                                                            value +
                                                            '"]'
                                                    );
                                                } catch (error) {
                                                    console.log(error);
                                                }
                                                if (select.length != 0) {
                                                    select.empty();
                                                    if (
                                                        !reservation_data[
                                                            relation_values[value]
                                                        ] &
                                                        (reservation_data[
                                                            relation_values[value]
                                                        ] ==
                                                            0)
                                                    ) {
                                                        select.append(
                                                            '<option value="" selected></option>'
                                                        );
                                                    }
                                                    $.each(
                                                        reservation_data[value],
                                                        function (subkey, subvalue) {
                                                            if (
                                                                subvalue["id"] ==
                                                                reservation_data[
                                                                    relation_values[
                                                                        value
                                                                    ]
                                                                ].id
                                                            ) {
                                                                var option = new Option(
                                                                    subvalue["name"],
                                                                    subvalue["id"],
                                                                    false,
                                                                    true
                                                                );
                                                            } else {
                                                                var option = new Option(
                                                                    subvalue["name"],
                                                                    subvalue["id"],
                                                                    false,
                                                                    false
                                                                );
                                                            }
                                                            $(option).html(
                                                                subvalue["name"]
                                                            );
                                                            select.append(option);
                                                        }
                                                    );
                                                }
                                                delete reservation_data[value];
                                            });
                                            $.each(reservation_data, function (
                                                key,
                                                value
                                            ) {
                                                var input = $(
                                                    "form.o_pms_pwa_reservation_form input[name='" +
                                                        key +
                                                        "']"
                                                );
                                                if (input.length != 0) {
                                                    input.val(value);
                                                } else {
                                                    if (
                                                        !fields_to_avoid.includes(key)
                                                    ) {
                                                        $(
                                                            "form.o_pms_pwa_reservation_form select[name='" +
                                                                key +
                                                                "'] option[value='" +
                                                                value +
                                                                "']"
                                                        ).prop("selected", true);
                                                    }
                                                }
                                            });

                                            // refresh total
                                            let a = $(
                                                "form.o_pms_pwa_reservation_form .price_total"
                                            );
                                            a[0].innerHTML = JSON.parse(
                                                new_data
                                            ).reservation.price_total;
                                            // refresh pending amount
                                            try {
                                                let b = $(
                                                    "form.o_pms_pwa_reservation_form .pending_amount"
                                                );
                                                b[0].innerHTML = JSON.parse(
                                                    new_data
                                                ).reservation.folio_pending_amount;
                                            } catch (error) {
                                                console.log(error);
                                            }
                                            //refresh multimodal data
                                            if (
                                                reservation_data.folio_reservations
                                                    .length > 1
                                            ) {
                                                self.refreshMultiModal(new_data);
                                            }
                                        }
                                    }, 0);
                                });
                            }
                        );

                        // On confirm assign
                        $(".o_pms_pwa_button_assign_confirm").on("click", function (
                            new_event
                        ) {
                            new_event.preventDefault();
                            var button = new_event.currentTarget;
                            ajax.jsonRpc(button.attributes.url.value, "call", {}).then(
                                function (new_data) {
                                    $(".o_pms_pwa_reservation_modal").modal("toggle");
                                    self.displayDataAlert(
                                        new_data,
                                        reservation_data.id
                                    );
                                }
                            );
                        });

                        // On click to change adults or kids
                        $(".btn-o_pms_pwa_min_max").on("click", function (new_event) {
                            new_event.preventDefault();
                            $('input[type="number"].o_pms_pwa_num-control').trigger(
                                "change"
                            );
                        });

                        // DATE RANGE MODAL
                        $(function () {
                            if (document.documentElement.lang == "es-ES") {
                                $(
                                    'input[name="range_check_date_modal"]'
                                ).daterangepicker(
                                    {
                                        locale: {
                                            direction: "ltr",
                                            format: "DD/MM/YYYY",
                                            separator: " - ",
                                            applyLabel: "Aplicar",
                                            cancelLabel: "Cancelar",
                                        },
                                        opens: "left",
                                        showCustomRangeLabel: false,
                                        startDate: reservation_data.checkin,
                                        endDate: reservation_data.checkout,
                                    },
                                    function (start, end, label) {
                                        $('input[name="checkin"]').val(start);
                                        $('input[name="checkout"]').val(end);
                                        let nights = 1;
                                        // Hours*minutes*seconds*milliseconds
                                        const oneDay = 24 * 60 * 60 * 1000;
                                        const firstDate = new Date(start);
                                        const secondDate = new Date(end);
                                        const diffDays = Math.round(
                                            Math.abs((firstDate - secondDate) / oneDay)
                                        );
                                        nights = diffDays - 1;
                                        $('input[name="nights"]').val(nights);
                                        // $("form#reservation_detail").submit();
                                    }
                                );
                            } else {
                                $(
                                    'input[name="range_check_date_modal"]'
                                ).daterangepicker(
                                    {
                                        locale: {
                                            direction: "ltr",
                                            format: "MM/DD/YYYY",
                                            separator: " - ",
                                        },
                                        opens: "left",
                                        showCustomRangeLabel: false,
                                        startDate: reservation_data.checkin,
                                        endDate: reservation_data.checkout,
                                    },
                                    function (start, end, label) {
                                        $('input[name="checkin"]').val(start);
                                        $('input[name="checkout"]').val(end);
                                        let nights = 1;
                                        // Hours*minutes*seconds*milliseconds
                                        const oneDay = 24 * 60 * 60 * 1000;
                                        const firstDate = new Date(start);
                                        const secondDate = new Date(end);
                                        const diffDays = Math.round(
                                            Math.abs((firstDate - secondDate) / oneDay)
                                        );
                                        nights = diffDays - 1;
                                        $('input[name="nights"]').val(nights);
                                        // $("form#reservation_detail").submit();
                                    }
                                );
                            }
                        });
                        // CHANGES IN MULTI MODAL RESERVATIONS
                        $("#multi_reservation_modal").on("click", "a", function (
                            new_event
                        ) {
                            var modal_reservation_id = new_event.currentTarget
                                .closest("tr")
                                .getAttribute("data-id");
                            // Cierra modal
                            $("div.o_pms_pwa_reservation_modal").modal("toggle");
                            // abre modal
                            try {
                                var selector =
                                    "td[data-id=" + modal_reservation_id + "]";
                                var selector_list =
                                    "table#o_pms_pwa_reservation_list_table tr[data-id=" +
                                    modal_reservation_id +
                                    "]";
                                if ($(selector).length != 0) {
                                    $(selector).click();
                                } else if ($(selector_list).length != 0) {
                                    $(selector_list).find("td.first-col").click();
                                } else {
                                    var new_selector = $(
                                        "<td class='launch_modal' data-id='" +
                                            modal_reservation_id +
                                            "'>Pincha aqui</td>"
                                    );
                                    new_selector.appendTo("table.launch_modal");
                                    setTimeout(function () {
                                        $(new_selector).click();
                                        $(new_selector).remove();
                                    }, 100);
                                }
                            } catch (error) {
                                // console.log(error);
                                location.href = "/reservation/" + modal_reservation_id;
                            }
                        });
                        $("#multi_reservation_modal").on(
                            "change",
                            "input, select",
                            function (new_event) {
                                var modal_reservation_id = new_event.currentTarget
                                    .closest("tr")
                                    .getAttribute("data-id");
                                // console.log(modal_reservation_id);
                                var values = {};
                                // Set checkin & checkout separated
                                if (
                                    new_event.currentTarget.name == "checkin" ||
                                    new_event.currentTarget.name == "checkout"
                                ) {
                                    let value_range_picker = new_event.currentTarget.getAttribute(
                                        "data-range"
                                    );
                                    if (new_event.currentTarget.name == "checkin") {
                                        values.checkin = new_event.currentTarget.value;
                                        values.checkout = value_range_picker.split(
                                            " - "
                                        )[1];
                                    } else {
                                        values.checkin = value_range_picker.split(
                                            " - "
                                        )[0];
                                        values.checkout = new_event.currentTarget.value;
                                    }
                                } else {
                                    values[new_event.currentTarget.name] =
                                        new_event.currentTarget.value;
                                }
                                // si es el mismo id, cambios en modal, sino, llamo función
                                if (reservation_id == modal_reservation_id) {
                                    // Esto debería cambiar la fecha de la modal de reserva
                                    values.range_check_date_modal =
                                        values.checkin + " - " + values.checkout;
                                    try {
                                        if (
                                            new_event.currentTarget.name ==
                                            "preferred_room_id"
                                        ) {
                                            var select = $(
                                                'form.o_pms_pwa_reservation_form [data-select="room_numbers"]'
                                            );
                                            select.val(new_event.currentTarget.value);
                                            select.trigger("change");
                                        } else {
                                            let input = $(
                                                "form.o_pms_pwa_reservation_form input[name='" +
                                                    new_event.currentTarget.name +
                                                    "']"
                                            );

                                            input.val(new_event.currentTarget.value);

                                            input.trigger("change");
                                        }
                                    } catch {
                                        console.log("ERROR");
                                    }
                                } else {
                                    var values = {};
                                    values["folio_reservations"] = {};
                                    values["folio_reservations"][
                                        "id"
                                    ] = modal_reservation_id;

                                    // Set checkin & checkout separated
                                    if (
                                        new_event.currentTarget.name == "checkin" ||
                                        new_event.currentTarget.name == "checkout"
                                    ) {
                                        let value_range_picker = new_event.currentTarget.getAttribute(
                                            "data-range"
                                        );
                                        if (new_event.currentTarget.name == "checkin") {
                                            values["folio_reservations"]["checkin"] =
                                                new_event.currentTarget.value;
                                            values["folio_reservations"][
                                                "checkout"
                                            ] = value_range_picker.split(" - ")[1];
                                        } else {
                                            values["folio_reservations"][
                                                "checkin"
                                            ] = value_range_picker.split(" - ")[0];
                                            values["folio_reservations"]["checkout"] =
                                                new_event.currentTarget.value;
                                        }
                                    } else {
                                        values["folio_reservations"][
                                            new_event.currentTarget.name
                                        ] = new_event.currentTarget.value;
                                    }
                                    ajax.jsonRpc(
                                        "/reservation/" +
                                            modal_reservation_id +
                                            "/onchange_data",
                                        "call",
                                        values
                                    ).then(function (new_data) {
                                        //console.log("NNN --->", new_data);
                                        if (new_data) {
                                            if (!JSON.parse(new_data).result) {
                                                self.displayDataAlert(new_data);
                                            }
                                        }
                                        self.refreshMultiModal(new_data);
                                    });
                                }
                            }
                        );
                        // Llamas a multiaction en modal
                        $("a.call_to_action_modal").on("click", function (modal_event) {
                            modal_event.preventDefault();
                            var button = modal_event.currentTarget;
                            var checkedValues = $("input:checkbox:checked")
                                .map(function () {
                                    return this.value;
                                })
                                .get();
                            if (checkedValues) {
                                ajax.jsonRpc(button.attributes.url.value, "call", {
                                    reservation_ids: checkedValues,
                                }).then(function (new_data) {
                                    self.displayDataAlert(new_data);
                                });
                            }
                        });

                        // Check all
                        $("#multi_reservation_modal #checkAll").change(function () {
                            $("input:checkbox").prop(
                                "checked",
                                $(this).prop("checked")
                            );
                        });

                        // Modal multi cambios
                        // input change color
                        $("#multiChangeModal").on(
                            "change",
                            "input[type='number']",
                            function () {
                                this.style.backgroundColor = "yellow";
                            }
                        );
                        $("#multiChangeModal input:checkbox").change(function () {
                            if (this.name == "apply_on_all_week") {
                                $("#multiChangeModal input:checkbox").prop(
                                    "checked",
                                    $(this).prop("checked")
                                );
                            } else {
                                $(
                                    "#multiChangeModal input[name='apply_on_all_week']:checkbox"
                                ).prop("checked", false);
                            }
                        });
                        $("#multiChangeModal button.send_form_multi_change").on(
                            "click",
                            function (modal_event) {
                                modal_event.preventDefault();
                                var button = modal_event.currentTarget;
                                var checkedValues = $(
                                    "#multi_reservation_modal input[name='reservation_ids']:checkbox:checked"
                                )
                                    .map(function () {
                                        return this.value;
                                    })
                                    .get();
                                var days_week = {};
                                var apply_on_all_week = false;
                                $("#multi_days_values input:checkbox:checked")
                                    .map(function () {
                                        if (this.name != "apply_on_all_week") {
                                            if (this.value == "on") {
                                                days_week[this.name] = true;
                                            }
                                        } else {
                                            apply_on_all_week = this.value;
                                        }
                                    })
                                    .get();
                                if (checkedValues) {
                                    ajax.jsonRpc(button.attributes.url.value, "call", {
                                        reservation_ids: checkedValues,
                                        apply_on_all_week: apply_on_all_week,
                                        days_week: days_week,
                                        new_price: $(
                                            "#multiChangeModal input[name='new_price']"
                                        ).val(),
                                        new_discount: $(
                                            "#multiChangeModal input[name='new_discount']"
                                        ).val(),
                                    }).then(function (new_data) {
                                        self.displayDataAlert(new_data);
                                    });
                                }
                            }
                        );
                    } else {
                        reservation_data = false;
                    }
                }, 0);
                target.prop("disabled", false);
                // console.log("Button enabled");
            });
        },
        _onClickAssingButton: function (event) {
            var self = this;
            // console.log("-->", event);
            event.preventDefault();
            var button = event.currentTarget;
            var tr = button.closest("tr");
            var selector =
                ".o_pms_pwa_reservation[data-id=" + tr.getAttribute("data-id") + "]";
            if (!selector) {
                selector = button.getAttribute("data-id");
                // console.log("selector", selector);
                $(selector).click();
            } else {
                $(selector).find("td.first-col").click();
            }
        },
        _onClickNotLastChildA: function (event) {
            event.stopPropagation();
            var self = this;
        },
        _onClickCheckinButton: function (event) {
            event.preventDefault();
            var self = this;
            var button = event.currentTarget;
            var reservation_id = false;
            try {
                reservation_id = button.closest("tr").getAttribute("data-id");
            } catch (error) {
                reservation_id = button.getAttribute("data-id");
            }
            ajax.jsonRpc("/reservation/json_data", "call", {
                reservation_id: reservation_id,
            }).then(function (data) {
                setTimeout(function () {
                    if (data) {
                        self.displayContent("pms_pwa.reservation_checkin_modal", {
                            reservation: data,
                        });

                        if (document.documentElement.lang === "es-ES") {
                            $(".o_pms_pwa_daterangepicker").daterangepicker(
                                {
                                    locale: {
                                        direction: "ltr",
                                        format: "DD/MM/YYYY",
                                        applyLabel: "Aplicar",
                                        cancelLabel: "Cancelar",
                                    },
                                    opens: "left",
                                    showCustomRangeLabel: false,
                                    singleDatePicker: true,
                                    showDropdowns: true,
                                    autoUpdateInput: false,
                                    minYear: 1901,
                                    maxYear: parseInt(moment().format("YYYY"), 10),
                                },
                                function (start) {
                                    const start_date = new Date(start);
                                    var select_date = start_date.toLocaleDateString(
                                        document.documentElement.lang,
                                        date_options
                                    );
                                    this.element.val(select_date);
                                    // this.element.trigger("change");
                                }
                            );
                        } else {
                            $(".o_pms_pwa_daterangepicker").daterangepicker(
                                {
                                    locale: {
                                        direction: "ltr",
                                        format: "MM/DD/YYYY",
                                    },
                                    opens: "left",
                                    showCustomRangeLabel: false,
                                    singleDatePicker: true,
                                    showDropdowns: true,
                                    autoUpdateInput: false,
                                    minYear: 1901,
                                    maxYear: parseInt(moment().format("YYYY"), 10),
                                },
                                function (start) {
                                    const start_date = new Date(start);
                                    var select_date = start_date.toLocaleDateString(
                                        document.documentElement.lang,
                                        date_options
                                    );
                                    this.element.val(select_date);
                                    // this.element.trigger("change");
                                }
                            );
                        }

                        /* eslint-disable no-alert, no-console */
                        new Stepper($(".bs-stepper")[0], {
                            linear: false,
                            animation: true,
                            selectors: {
                                steps: ".step",
                                trigger: ".step-trigger",
                                stepper: ".bs-stepper",
                            },
                        });
                        $(".bs-stepper-content").on(
                            "change",
                            "input, select",
                            function (new_event) {
                                new_event.preventDefault(reservation_id);
                                var guest_list = [];
                                var selector =
                                    "div.bs-stepper[guest-data-id=" +
                                    reservation_id +
                                    "] .content";
                                var contents = $(selector);

                                for (var i = 1; i <= contents.length; i++) {
                                    var element = $(
                                        "#" + contents[i - 1].getAttribute("id")
                                    );
                                    guest_list.push({
                                        id: element
                                            .find("input[name='guest_id']")
                                            .val(),
                                        firstname: element
                                            .find("input[name='firstname']")
                                            .val(),
                                        lastname: element
                                            .find("input[name='lastname']")
                                            .val(),
                                        lastname2: element
                                            .find("input[name='lastname2']")
                                            .val(),
                                        birthdate_date: element
                                            .find("input[name='birthdate_date']")
                                            .val(),
                                        document_number: element
                                            .find("input[name='document_number']")
                                            .val(),
                                        document_type: element
                                            .find("select[name='document_type'] option")
                                            .filter(":selected")
                                            .val(),
                                        document_expedition_date: element
                                            .find(
                                                "input[name='document_expedition_date']"
                                            )
                                            .val(),
                                        gender: element
                                            .find("select[name='gender'] option")
                                            .filter(":selected")
                                            .val(),
                                        mobile: element
                                            .find("input[name='mobile']")
                                            .val(),
                                        email: element
                                            .find("input[name='email']")
                                            .val(),
                                        pms_property_id: element
                                            .find("input[name='pms_property_id']")
                                            .val(),
                                        address: element
                                            .find("input[name='address']")
                                            .val(),
                                        zip: element
                                            .find("input[name='zip']")
                                            .val(),
                                        city: element
                                            .find("input[name='city']")
                                            .val(),
                                        country_id: element
                                            .find("input[name='country_id']")
                                            .val(),
                                        residence_state_id: element
                                            .find("input[name='residence_state_id']")
                                            .val(),
                                    });
                                }

                                ajax.jsonRpc(
                                    "/reservation/" + reservation_id + "/checkin",
                                    "call",
                                    {
                                        guests_list: guest_list,
                                        action_on_board: false,
                                    }
                                ).then(function (new_data) {
                                    try {
                                        new_data = JSON.parse(new_data);
                                    } catch (err) {
                                        new_data = new_data;
                                    }
                                    try {
                                        var checkin_persons =
                                            new_data.checkin_partner_ids;

                                        $.each(checkin_persons, function (key, value) {
                                            var check_partner_id =
                                                "#checkin_partner_" + key;

                                            $.each(value, function (key2, value2) {
                                                if (
                                                    key2 != "gender" &&
                                                    key2 != "document_type" &&
                                                    key2 != "state"
                                                ) {
                                                    var input = $(
                                                        check_partner_id +
                                                            " input[name='" +
                                                            key2 +
                                                            "']"
                                                    );
                                                    if (
                                                        value2 &&
                                                        typeof value2 == "object" &&
                                                        "id" in value2
                                                    ) {
                                                        input.val(value2["id"]);
                                                    } else if (value2) {
                                                        input.val(value2);
                                                    }
                                                } else {
                                                    if (key2 == "state") {
                                                        var button = $(
                                                            check_partner_id +
                                                                " .o_pms_pwa_checkin_confirm_button"
                                                        );
                                                        if (value2 == "precheckin") {
                                                            button.prop(
                                                                "disabled",
                                                                false
                                                            );
                                                            button
                                                                .addClass("btn-message")
                                                                .removeClass(
                                                                    "o_pms_pwa_disabled btn-grey-300"
                                                                );
                                                        } else {
                                                            button.prop(
                                                                "disabled",
                                                                true
                                                            );
                                                            button
                                                                .addClass(
                                                                    "o_pms_pwa_disabled btn-grey-300"
                                                                )
                                                                .removeClass(
                                                                    "btn-message"
                                                                );
                                                        }
                                                    } else {
                                                        if (value2 && value2["id"]) {
                                                            $(
                                                                check_partner_id +
                                                                    " select[name='" +
                                                                    key2 +
                                                                    "'] option[value='" +
                                                                    value2["id"] +
                                                                    "']"
                                                            ).prop("selected", true);
                                                        } else {
                                                            $(
                                                                check_partner_id +
                                                                    " select[name='" +
                                                                    key2 +
                                                                    "'] option[value='" +
                                                                    value2 +
                                                                    "']"
                                                            ).prop("selected", true);
                                                        }
                                                    }
                                                }
                                            });
                                        });
                                    } catch (err) {
                                        console.log(err);
                                    }
                                    //self.displayDataAlert(new_data, data.id);
                                });
                            }
                        );
                        /* eslint-enable no-alert */
                        $(".o_pms_pwa_button_checkin_confirm").on("click", function (
                            new_event
                        ) {
                            new_event.preventDefault();
                            new_event.stopPropagation();
                            var guest_list = [];
                            var selector =
                                "div.bs-stepper[guest-data-id=" +
                                reservation_id +
                                "] .content";

                            var contents = $(selector);

                            for (var i = 1; i <= contents.length; i++) {
                                var element = $(
                                    "#" + contents[i - 1].getAttribute("id")
                                );
                                guest_list.push({
                                    id: element.find("input[name='guest_id']").val(),
                                    firstname: element
                                        .find("input[name='firstname']")
                                        .val(),
                                    lastname: element
                                        .find("input[name='lastname']")
                                        .val(),
                                    lastname2: element
                                        .find("input[name='lastname2']")
                                        .val(),
                                    birthdate_date: element
                                        .find("input[name='birthdate_date']")
                                        .val(),
                                    document_number: element
                                        .find("input[name='document_number']")
                                        .val(),
                                    document_type: element
                                        .find("select[name='document_type'] option")
                                        .filter(":selected")
                                        .val(),
                                    document_expedition_date: element
                                        .find("input[name='document_expedition_date']")
                                        .val(),
                                    gender: element
                                        .find("select[name='gender'] option")
                                        .filter(":selected")
                                        .val(),
                                    mobile: element.find("input[name='mobile']").val(),
                                    email: element.find("input[name='email']").val(),
                                    pms_property_id: element
                                        .find("input[name='pms_property_id']")
                                        .val(),
                                    address: element
                                        .find("input[name='address']")
                                        .val(),
                                    zip: element
                                        .find("input[name='zip']")
                                        .val(),
                                    city: element
                                        .find("input[name='city']")
                                        .val(),
                                    country_id: element
                                        .find("input[name='country_id']")
                                        .val(),
                                    residence_state_id: element
                                        .find("input[name='residence_state_id']")
                                        .val(),
                                });
                            }
                            ajax.jsonRpc(button.attributes.url.value, "call", {
                                guests_list: guest_list,
                                action_on_board: true,
                            }).then(function (new_data) {
                                try {
                                    new_data = JSON.parse(new_data);
                                } catch (error) {
                                    new_data = new_data;
                                }

                                try {
                                    if (new_data.reservation) {
                                        var checkin_persons =
                                            new_data.reservation.checkin_partner_ids;
                                    } else {
                                        var checkin_persons =
                                            new_data.checkin_partner_ids;
                                    }

                                    $.each(checkin_persons, function (key, value) {
                                        var partner_id_button =
                                            "button#checkin_partner_" +
                                            key +
                                            "-trigger";

                                        if (
                                            ("state" in value &&
                                                value["state"] == "onboard") ||
                                            value["state"] == "done"
                                        ) {
                                            $(partner_id_button)
                                                .find("span.bs-stepper-circle")
                                                .addClass("o_pms_pwa_done_circle");
                                        }
                                    });
                                } catch (error) {
                                    console.log(error);
                                }

                                self.displayDataAlert(new_data);
                            });
                        });
                        $(".o_pms_pwa_button_print_checkin").on("click", function (
                            new_event
                        ) {
                            new_event.preventDefault();
                            var self = this;
                            var button = new_event.currentTarget;
                            var reservation_id = false;
                            // var reservation_ids = {};
                            try {
                                reservation_id = button
                                    .closest("tr")
                                    .getAttribute("data-id");
                            } catch (error) {
                                try {
                                    reservation_id = button.getAttribute("data-id");
                                } catch (error) {
                                    reservation_id = $("input[name='id']").val();
                                }
                            }
                            let url = "/checkins/pdf/" + reservation_id;
                            // Open the window
                            let printWindow = window.open(
                                url,
                                "Print",
                                "left=200, top=200, width=950, height=500, toolbar=0, resizable=0"
                            );
                            printWindow.addEventListener(
                                "load",
                                function () {
                                    printWindow.print();
                                },
                                true
                            );
                        });
                        $(
                            "table#multi_reservation_modal_checkin, a.o_pms_pwa_button_checkin_multi_modal"
                        ).on("click", function (modal_event) {
                            modal_event.preventDefault();
                            var button = modal_event.currentTarget;
                            var reservation_id = false;
                            try {
                                reservation_id = button.getAttribute("data-id");
                            } catch (error) {
                                reservation_id = false;
                            }
                            if (reservation_id) {
                                $("div.o_pms_pwa_reservation_modal").modal("toggle");
                                self._onClickCheckinButton(modal_event);
                            }
                        });

                        // Autocomplete country
                        $(
                            ".bs-stepper-content .o_pms_pwa_search_country_name"
                        ).autocomplete({
                            source: function (request, response) {
                                var checkin_partner = $(
                                    ".bs-stepper-content .o_pms_pwa_search_country_name"
                                ).data("id");
                                $.ajax({
                                    url: "/pms_checkin_partner/search",
                                    method: "GET",
                                    dataType: "json",
                                    data: {
                                        keywords: request.term,
                                        model: "res.country",
                                        id: checkin_partner,
                                    },
                                    success: function (data) {
                                        // console.log("data => ", data);
                                        response(
                                            $.map(data, function (item) {
                                                return {
                                                    label:
                                                        (item.type === "c"
                                                            ? "Category: "
                                                            : "") + item.name,
                                                    value: item.name,
                                                    id: item.id,
                                                };
                                            })
                                        );
                                    },
                                    error: function (error) {
                                        console.error(error);
                                    },
                                });
                            },
                            select: function (suggestion, term, item) {
                                // console.log("suggestion", suggestion, term, item);
                                if (term && term.item) {
                                    $(suggestion.target.parentElement)
                                        .find('input[name="country_id"]')
                                        .val(term.item.id);
                                }
                            },
                            minLength: 1,
                        });

                        // Autocomplete state
                        $(
                            ".bs-stepper-content .o_pms_pwa_search_state_name"
                        ).autocomplete({
                            source: function (request, response) {
                                var checkin_partner = $(
                                    ".bs-stepper-content .o_pms_pwa_search_state_name"
                                ).data("id");
                                $.ajax({
                                    url: "/pms_checkin_partner/search",
                                    method: "GET",
                                    dataType: "json",
                                    data: {
                                        keywords: request.term,
                                        model: "res.country.state",
                                        id: checkin_partner,
                                    },
                                    success: function (data) {
                                        response(
                                            $.map(data, function (item) {
                                                return {
                                                    label:
                                                        (item.type === "c"
                                                            ? "Category: "
                                                            : "") + item.name,
                                                    value: item.name,
                                                    id: item.id,
                                                };
                                            })
                                        );
                                    },
                                    error: function (error) {
                                        console.error(error);
                                    },
                                });
                            },
                            select: function (suggestion, term, item) {
                                // console.log("suggestion", suggestion, term, item);
                                if (term && term.item) {
                                    $(suggestion.target.parentElement)
                                        .find('input[name="residence_state_id"]')
                                        .val(term.item.id);
                                }
                            },
                            minLength: 1,
                        });

                        // Autocomplete partner
                        $(".bs-stepper-content .o_pms_pwa_search_partner").autocomplete(
                            {
                                source: function (request, response) {
                                    $.ajax({
                                        url: "/partner/search",
                                        method: "GET",
                                        dataType: "json",
                                        data: {keywords: request.term, category: false},
                                        success: function (data) {
                                            response(
                                                $.map(data, function (item) {
                                                    return {
                                                        label:
                                                            (item.type === "c"
                                                                ? "Category: "
                                                                : "") + item.name,
                                                        value: item.name,
                                                        id: item.id,
                                                    };
                                                })
                                            );
                                        },
                                        error: function (error) {
                                            console.error(error);
                                        },
                                    });
                                },
                                select: function (suggestion, term, item) {
                                    // console.log("suggestion", suggestion, term, item);
                                    if (term && term.item) {
                                        $(suggestion.target.parentElement)
                                            .find('input[name="partner_id"]')
                                            .val(term.item.id);
                                    }
                                },
                                minLength: 1,
                            }
                        );
                    }
                });
            });
        },
        _onClickCancelButton: function (event) {
            event.preventDefault();
            var self = this;
            var button = event.currentTarget;
            var reservation_id = false;
            try {
                reservation_id = button.closest("tr").getAttribute("data-id");
            } catch (error) {
                reservation_id = button.getAttribute("data-id");
            }
            ajax.jsonRpc("/reservation/json_data", "call", {
                reservation_id: reservation_id,
            }).then(function (data) {
                setTimeout(function () {
                    if (data) {
                        self.displayContent("pms_pwa.reservation_cancel_modal", {
                            reservation: data,
                        });
                        $(".o_pms_pwa_button_cancel_confirm").on("click", function (
                            new_event
                        ) {
                            new_event.preventDefault();
                            var cur_button = new_event.currentTarget;
                            ajax.jsonRpc(
                                cur_button.attributes.url.value,
                                "call",
                                {}
                            ).then(function (new_data) {
                                self.displayDataAlert(new_data, data.id);
                            });
                        });
                    }
                });
            });
        },
        _onClickCheckoutButton: function (event) {
            event.preventDefault();
            var self = this;
            var button = event.currentTarget;
            var reservation_id = false;
            try {
                reservation_id = button.closest("tr").getAttribute("data-id");
            } catch (error) {
                reservation_id = button.getAttribute("data-id");
            }
            ajax.jsonRpc("/reservation/json_data", "call", {
                reservation_id: reservation_id,
            }).then(function (data) {
                setTimeout(function () {
                    if (data) {
                        self.displayContent("pms_pwa.reservation_checkout_modal", {
                            reservation: data,
                        });
                        $(".o_pms_pwa_button_checkout_confirm").on("click", function (
                            new_event
                        ) {
                            new_event.preventDefault();
                            var cur_button = event.currentTarget;
                            ajax.jsonRpc(
                                cur_button.attributes.url.value,
                                "call",
                                {}
                            ).then(function (new_data) {
                                self.displayDataAlert(new_data, data.id);
                            });
                        });
                    }
                });
            });
        },
        _onClickPaymentButton: function (event) {
            event.preventDefault();
            var self = this;
            let modal = $("div#o_pms_pwa_new_cash_register_payment");
            var button = event.currentTarget;
            var reservation_id = false;
            try {
                reservation_id = button.closest("tr").getAttribute("data-id");
            } catch (error) {
                try {
                    reservation_id = button.getAttribute("data-id");
                } catch (error) {
                    reservation_id = $("input[name='id']").val();
                }
            }

            ajax.jsonRpc("/reservation/json_data", "call", {
                reservation_id: reservation_id,
            }).then(function (data) {
                if (data) {
                    self.displayContent("pms_pwa.reservation_payment_modal", {
                        reservation: data,
                    });

                    $(".o_pms_pwa_button_payment_confirm").on("click", function (
                        new_event
                    ) {
                        new_event.preventDefault();
                        var selector =
                            "div.modal-dialog[payment-data-id=" + reservation_id + "]";
                        var div = $(selector);
                        var payment_method = div
                            .find("select[name='payment_method'] option")
                            .filter(":selected")
                            .val();
                        var payment_amount = div.find("input[name='amount']").val();
                        var payment_date = div.find("input[name='date']").val();
                        if(!payment_date){
                            payment_date = moment().format('DD/MM/YYYY');
                        }
                        ajax.jsonRpc(button.attributes.url.value, "call", {
                            payment_method: payment_method,
                            amount: payment_amount,
                            date: payment_date,
                        }).then(function (new_data) {
                            self.displayDataAlert(new_data, data.id);
                        });
                    });
                }
            });
        },
        _onClickRefundButton: function (event) {
            event.preventDefault();
            var self = this;
            var button = event.currentTarget;
            var reservation_id = false;
            try {
                reservation_id = button.closest("tr").getAttribute("data-id");
            } catch (error) {
                try {
                    reservation_id = button.getAttribute("data-id");
                } catch (error) {
                    reservation_id = $("input[name='id']").val();
                }
            }
            ajax.jsonRpc("/reservation/json_data", "call", {
                reservation_id: reservation_id,
            }).then(function (data) {
                if (data) {
                    self.displayContent("pms_pwa.reservation_refund_modal", {
                        reservation: data,
                    });
                    $(".o_pms_pwa_button_refund_confirm").on("click", function (
                        new_event
                    ) {
                        new_event.preventDefault();
                        var selector =
                            "div.modal-dialog[refund-data-id=" + reservation_id + "]";
                        var div = $(selector);
                        var payment_method = div
                            .find("select[name='payment_method'] option")
                            .filter(":selected")
                            .val();
                        var payment_amount = div.find("input[name='amount']").val();
                        var payment_date = div.find("input[name='date']").val();
                        if(!payment_date){
                            payment_date = moment().format("dd/mm/YYYY");
                        }

                        ajax.jsonRpc(button.attributes.url.value, "call", {
                            payment_method: payment_method,
                            amount: payment_amount,
                            date: payment_date,
                        }).then(function (new_data) {
                            self.displayDataAlert(new_data, data.id);
                        });
                    });
                }
            });
        },
        _onClickInvoiceButton: function (event) {
            event.preventDefault();
            var button = event.currentTarget;
            var reservation_id = false;
            try {
                reservation_id = button.closest("tr").getAttribute("data-id");
            } catch (error) {
                try {
                    reservation_id = button.getAttribute("data-id");
                } catch (error) {
                    reservation_id = $("input[name='id']").val();
                }
            }
            location.href = "/reservation/" + reservation_id;
        },
        _onClickNewReservation: function (event) {
            event.preventDefault();
            var button = event.currentTarget;
            var folio_id = false;
            $(".o_pms_pwa_reservation_modal").modal("toggle");
            try {
                folio_id = button.getAttribute("data-folio_id");
            } catch (error) {
                console.log("error => ", error);
            }

            if (folio_id) {
                $("#o_pms_pwa_new_reservation_modal input[name='folio_id']").val(
                    folio_id
                );
                $("button#button_reservation_modal").click();
            }
        },

    });

    return publicWidget.registry.ReservationTableWidget;
});
