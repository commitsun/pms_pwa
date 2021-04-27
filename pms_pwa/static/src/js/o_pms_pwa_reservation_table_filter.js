odoo.define("pms_pwa.reservation_table", function (require) {
    "use strict";
    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    var _t = core._t;
    var publicWidget = require("web.public.widget");
    var csrf_token = core.csrf_token;

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

    /* Single reservation form */

    $("form#single_reservation_form").on("change", "input, select", function (event) {
        var values = {};
        var allowed_fields = [
            "allowed_agency_ids",
            "allowed_board_service_room_ids",
            "allowed_channel_type_ids",
            "allowed_pricelists",
        ];
        if (event.currentTarget.name == "range_check_date_modal") {
            let value_range_picker = event.currentTarget.value;

            values.checkin = value_range_picker.substr(
                0,
                value_range_picker.indexOf(" - ")
            );
            values.checkout = value_range_picker.substr(
                value_range_picker.indexOf(" - ") + 2
            );
        } else {
            values[event.currentTarget.name] = event.currentTarget.value;
        }
        if (($("#o_pms_pwa_new_reservation_modal").data("bs.modal") || {})._isShown) {
            ajax.jsonRpc("/reservation/single_reservation_new", "call", values).then(
                function (new_data) {
                    setTimeout(function () {
                        if (new_data) {
                            $.each(new_data, function (key, value) {
                                if (allowed_fields.includes(key)) {
                                    try {
                                        var select = $('[data-select="' + key + '"]');
                                    } catch (error) {
                                        console.log(error);
                                    }
                                    if (select) {
                                        select.empty();
                                        $.each(value, function (subkey, subvalue) {
                                            var option = new Option(
                                                subvalue["name"],
                                                subvalue["id"]
                                            );
                                            $(option).html(subvalue["name"]);
                                            select.append(option);
                                        });
                                    }
                                } else {
                                    var input = $(
                                        "form#single_reservation_form input[name='" +
                                            key +
                                            "']"
                                    );
                                    if (input) {
                                        input.val(value);
                                    } else {
                                        var select = $(
                                            "form#single_reservation_form select[name='" +
                                                key +
                                                "'"
                                        );
                                        $(
                                            "form#single_reservation_form select[name='" +
                                                key +
                                                "'] option[value='" +
                                                value +
                                                "']"
                                        ).prop("selected", true);
                                    }
                                }
                            });
                        }
                    });
                }
            );
        }
    });

    $("form#single_reservation_form").on("submit", function (event) {
        event.preventDefault();
        var values = $("form#single_reservation_form").serializeArray();
        if (event.currentTarget.name == "range_check_date_modal") {
            let value_range_picker = event.currentTarget.value;

            values.checkin = value_range_picker.substr(
                0,
                value_range_picker.indexOf(" - ")
            );
            values.checkout = value_range_picker.substr(
                value_range_picker.indexOf(" - ") + 2
            );
        }
        ajax.jsonRpc("/reservation/single_reservation_new", "call", values).then(
            function (new_data) {
                setTimeout(function () {
                    if (new_data) {
                        var data = JSON.parse(new_data);
                        if (data && data.result === true) {
                            /* We need to integrate this into the public widget */
                            location.href = "/reservation/" + data.id;
                        } else {
                            data.type = "warning";
                            data.message = _t(
                                "An undefined error has ocurred, please try again later."
                            );
                            var alert_div = $(".o_pms_pwa_roomdoo_alerts");
                            var alert = core.qweb.render("pms_pwa.reservation_alerts", {
                                alert: data,
                            });
                            alert_div.append(alert);
                        }
                    }
                });
            }
        );
    });

    /* Multiple reservation form */

    $("form#multiple_reservation_form").on("change", "input, select", function (event) {
        var values = {};
        var allowed_fields = [
            "allowed_agency_ids",
            "allowed_board_service_room_ids",
            "allowed_channel_type_ids",
            "allowed_pricelists",
        ];
        try {
            var id = $("#multiple_reservation_form input[name='id']").val();
            values["id"] = id;
        } catch (error) {
            console.log(error);
        }
        if (event.currentTarget.name == "range_check_date_modal") {
            let value_range_picker = event.currentTarget.value;

            values.checkin = value_range_picker.substr(
                0,
                value_range_picker.indexOf(" - ")
            );
            values.checkout = value_range_picker.substr(
                value_range_picker.indexOf(" - ") + 2
            );
        }
        if (event.currentTarget.dataset.main_field) {
            var main_field = event.currentTarget.dataset.main_field;
            var field_id = event.currentTarget.dataset.field_id;
            values[main_field] = {};
            values[main_field][field_id] = {};
            values[main_field][field_id][event.currentTarget.name] =
                event.currentTarget.value;
        } else {
            values[event.currentTarget.name] = event.currentTarget.value;
        }
        if (($("#o_pms_pwa_new_reservation_modal").data("bs.modal") || {})._isShown) {
            ajax.jsonRpc(
                "/reservation/multiple_reservation_onchange",
                "call",
                values
            ).then(function (new_data) {
                setTimeout(function () {
                    if (new_data) {
                        $.each(new_data, function (key, value) {
                            if (allowed_fields.includes(key)) {
                                try {
                                    var select = $('[data-select="' + key + '"]');
                                } catch (error) {
                                    console.log(error);
                                }
                                if (select) {
                                    select.empty();
                                    $.each(value, function (subkey, subvalue) {
                                        var option = new Option(
                                            subvalue["name"],
                                            subvalue["id"]
                                        );
                                        $(option).html(subvalue["name"]);
                                        select.append(option);
                                    });
                                }
                            } else {
                                if (key == "lines") {
                                    try {
                                        var table_tbody_trs = $(
                                            "#table_lines tbody tr"
                                        );
                                        table_tbody_trs.remove();
                                    } catch (error) {
                                        console.log(error);
                                    }
                                    $.each(value, function (linekey, linevalues) {
                                        var tr =
                                            "<tr><td>" +
                                            linevalues["room_type_id"] +
                                            " (" +
                                            +linevalues["num_rooms_available"] +
                                            ")" +
                                            "</td><td><input type='number' data-main_field='lines' data-field_id='" +
                                            linekey +
                                            "' name='value_num_rooms_selected' value='" +
                                            linevalues["value_num_rooms_selected"] +
                                            "' class='form-control o_pms_pwa_modal_number'/></td><td>" +
                                            linevalues["price_per_room"] +
                                            "</td></tr>";
                                        $("#table_lines tbody").append(tr);
                                    });
                                } else {
                                    var input = $(
                                        "form#multiple_reservation_form input[name='" +
                                            key +
                                            "']"
                                    );
                                    if (input) {
                                        input.val(value);
                                    } else {
                                        $(
                                            "form#multiple_reservation_form select[name='" +
                                                key +
                                                "'] option[value='" +
                                                value +
                                                "']"
                                        ).prop("selected", true);
                                    }
                                }
                            }
                        });
                    }
                });
            });
        }
    });

    $("form#multiple_reservation_form").on("submit", function (event) {
        event.preventDefault();
        var values = $("form#multiple_reservation_form").serializeArray();
        ajax.jsonRpc("/reservation/multiple_reservation_new", "call", values).then(
            function (new_data) {
                setTimeout(function () {
                    if (new_data) {
                        var data = JSON.parse(new_data);
                        if (data && data.result === true) {
                            /* We need to integrate this into the public widget */
                            location.href = "/reservation/" + data.id;
                        } else {
                            data.type = "warning";
                            var alert_div = $(".o_pms_pwa_roomdoo_alerts");
                            var alert = core.qweb.render("pms_pwa.reservation_alerts", {
                                alert: data,
                            });
                            alert_div.append(alert);
                        }
                    }
                });
            }
        );
    });

    publicWidget.registry.ReservationTableWidget = publicWidget.Widget.extend({
        selector: "table.o_pms_pwa_reservation_list_table, #o_pms_detail_reservation",
        xmlDependencies: [
            "/pms_pwa/static/src/xml/pms_pwa_roomdoo_reservation_modal.xml",
        ],
        events: {
            "click tr.o_pms_pwa_reservation:not(.accordion) > td:not(:last-child)":
                "_onClickReservationButton",
            "click div.o_pms_pwa_calendar_reservation": "_onClickReservationButton",
            "click .o_pms_pwa_button_assign": "_onClickAssingButton",
            "click tbody > tr > td:not(:last-child) a": "_onClickNotLastChildA",
            "click .o_pms_pwa_button_checkin": "_onClickCheckinButton",
            "click .o_pms_pwa_button_cancel": "_onClickCancelButton",
            "click .o_pms_pwa_button_checkout": "_onClickCheckoutButton",
            "click .o_pms_pwa_button_payment": "_onClickPaymentButton",
            "click .o_pms_pwa_button_invoice": "_onClickInvoiceButton",
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
            var html = core.qweb.render(xmlid, render_values);
            $("div.o_pms_pwa_roomdoo_reservation_modal").html(html);
            $("div.o_pms_pwa_reservation_modal").modal();
        },
        reloadReservationInfo: function (data_id = false) {
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
                                updated_data.room_type_id.name +
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
                            $(String("#reservation_" + data_id)).find(
                                "td"
                            )[7].innerHTML = updated_data.folio_id.amount_total;
                            $(String("#reservation_" + data_id)).find(
                                "td"
                            )[7].innerHTML = updated_data.folio_id.outstanding_vat;
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
        },
        displayDataAlert: function (result, data_id = false) {
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
        },
        /* OnClick events */
        _onClickReservationButton: function (event) {
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
                        // Console.log(reservation_data)
                        /* Adding missing data */
                        // reservation_data.image = "/web/static/src/img/placeholder.png";
                        reservation_data.unread_msg = 2;
                        reservation_data.messages = [
                            ["25-12-2020", "Lorem ipsum"],
                            ["25-12-2020", "Unread short message"],
                        ];
                        reservation_data.extra = ["Breakfast", "Cradle"];
                        reservation_data.notes = "Lorem ipsum.";
                        reservation_data.card_number = "1253 5212 5214 1256 2145";
                        reservation_data.room_number = 2;
                        reservation_data.nights_number = 2;
                        reservation_data.total = reservation_data.price_total.value;
                        reservation_data.total_vat =
                            (reservation_data.price_total.value * 21) / 100;
                        reservation_data.outstanding_vat =
                            (reservation_data.folio_pending_amount.value * 21) / 100;

                        /* End missin data */
                        var room_types = [];
                        var room_numbers = [];
                        var payment_methods = ["Credit card", "Cash"];

                        ajax.jsonRpc("/room_types", "call", {
                            pms_property_id: reservation_data.pms_property_id,
                            pricelist_id: reservation_data.pricelist_id,
                            checkin: reservation_data.checkin,
                            checkout: reservation_data.checkout,
                            reservation_id: reservation_id,
                        }).then(function (room_types_data) {
                            setTimeout(function () {
                                room_types = room_types_data;
                                ajax.jsonRpc("/rooms", "call", {
                                    pms_property_id: reservation_data.pms_property_id,
                                    pricelist_id: reservation_data.pricelist_id,
                                    checkin: reservation_data.checkin,
                                    checkout: reservation_data.checkout,
                                    reservation_id: reservation_id,
                                }).then(function (rooms_data) {
                                    setTimeout(function () {
                                        room_numbers = rooms_data;
                                        self.displayContent(
                                            "pms_pwa.roomdoo_reservation_modal",
                                            {
                                                reservation: reservation_data,
                                                room_types: room_types,
                                                payment_methods: payment_methods,
                                                room_numbers: room_numbers,
                                                texts: {
                                                    reservation_text: this
                                                        .reservation_text,
                                                    info_text: this.info_text,
                                                    unread_text: this.unread_text,
                                                    room_type_text: this.room_type_text,
                                                    room_number_text: this
                                                        .room_number_text,
                                                    nights_number_text: this
                                                        .nights_number_text,
                                                    adults_number_text: this
                                                        .adults_number_text,
                                                    check_in_text: this.check_in_text,
                                                    check_in_time_text: this
                                                        .check_in_time_text,
                                                    check_out_text: this.check_out_text,
                                                    check_out_time_text: this
                                                        .check_out_time_text,
                                                    room_price_text: this
                                                        .room_price_text,
                                                    sales_channel_text: this
                                                        .sales_channel_text,
                                                    extras_text: this.extras_text,
                                                    card_text: this.card_text,
                                                    total_text: this.total_text,
                                                    outstanding_text: this
                                                        .outstanding_text,
                                                    pay_text: this.pay_text,
                                                    notes_text: this.notes_text,
                                                },
                                            }
                                        );

                                        $("#o_pms_pwa_reservation_modal").on(
                                            "hidden.bs.modal",
                                            function () {
                                                try {
                                                    var data_id = $(
                                                        "#o_pms_pwa_reservation_modal"
                                                    )[0].dataset.id;
                                                    if (data_id) {
                                                        self.reloadReservationInfo(
                                                            data_id
                                                        );
                                                    }
                                                } catch (error) {
                                                    console.log("Error ---", error);
                                                }
                                            }
                                        );
                                        // Show more // less
                                        try {
                                            $(
                                                "input[name^='o_pms_pwa_service_line_']"
                                            ).map(function () {
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
                                                    $(
                                                        ".o_roomdoo_hide_show-more2"
                                                    ).show();
                                                }
                                                return false;
                                            });
                                            $(".o_roomdoo_hide_show-services-more").on(
                                                "click",
                                                function () {
                                                    var service_id = $(this).attr(
                                                        "data-service-id"
                                                    );
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
                                            "select, input[type='checkbox'], input[type='radio'], input[type='text'][name='range_check_date_modal']",
                                            function (new_event) {
                                                var values = {};
                                                // Set checkin & checkout separated
                                                if (
                                                    new_event.currentTarget.name ==
                                                    "range_check_date_modal"
                                                ) {
                                                    let value_range_picker =
                                                        new_event.currentTarget.value;

                                                    values.checkin = value_range_picker.substr(
                                                        0,
                                                        value_range_picker.indexOf(":")
                                                    );
                                                    values.checkout = value_range_picker.substr(
                                                        value_range_picker.indexOf(
                                                            ":"
                                                        ) + 2
                                                    );
                                                } else {
                                                    if (
                                                        new_event.currentTarget.dataset
                                                            .service_id
                                                    ) {
                                                        var service_key = "add_service";
                                                        if (
                                                            !new_event.currentTarget
                                                                .checked
                                                        ) {
                                                            service_key = "del_service";
                                                        }
                                                        values[service_key] =
                                                            new_event.currentTarget.dataset.service_id;
                                                    } else {
                                                        if (
                                                            new_event.currentTarget
                                                                .dataset.main_field
                                                        ) {
                                                            var main_field =
                                                                new_event.currentTarget
                                                                    .dataset.main_field;
                                                            var field_id =
                                                                new_event.currentTarget
                                                                    .dataset.field_id;
                                                            values[main_field] = {};
                                                            values[main_field][
                                                                field_id
                                                            ] = {};
                                                            values[main_field][
                                                                field_id
                                                            ][
                                                                new_event.currentTarget.name
                                                            ] =
                                                                new_event.currentTarget.value;
                                                        } else {
                                                            values[
                                                                new_event.currentTarget.name
                                                            ] =
                                                                new_event.currentTarget.value;
                                                        }
                                                    }
                                                }
                                                // Call to set the new values
                                                ajax.jsonRpc(
                                                    "/reservation/" +
                                                        reservation_id +
                                                        "/onchange_data",
                                                    "call",
                                                    values
                                                ).then(function (new_data) {
                                                    setTimeout(function () {
                                                        if (new_data) {
                                                            if (
                                                                !JSON.parse(new_data)
                                                                    .result
                                                            ) {
                                                                self.displayDataAlert(
                                                                    new_data
                                                                );
                                                            }
                                                            // Refresh reservation modal values and sync with new data
                                                            $.each(
                                                                JSON.parse(new_data)
                                                                    .reservation,
                                                                function (key, value) {
                                                                    console.log(
                                                                        "-----"
                                                                    );
                                                                    console.log(key);
                                                                    console.log(
                                                                        "-----"
                                                                    );
                                                                    //                                                                if (key !== '')
                                                                    var input = $(
                                                                        "form.o_pms_pwa_reservation_form input[name='" +
                                                                            key +
                                                                            "']"
                                                                    );
                                                                    if (input) {
                                                                        input.val(
                                                                            value
                                                                        );
                                                                    } else {
                                                                        $(
                                                                            "form.o_pms_pwa_reservation_form select[name='" +
                                                                                key +
                                                                                "'] option[value='" +
                                                                                value +
                                                                                "']"
                                                                        ).prop(
                                                                            "selected",
                                                                            true
                                                                        );
                                                                    }
                                                                }
                                                            );
                                                            // refresh total
                                                            let a = document.getElementsByClassName(
                                                                "price_total"
                                                            );
                                                            console.log(a);
                                                            a[0].innerText = JSON.parse(
                                                                new_data
                                                            ).reservation.price_total;
                                                            //.value(JSON.parse(new_data).reservation.price_total)
                                                        }
                                                    });
                                                });
                                            }
                                        );

                                        $("form.o_pms_pwa_reservation_form").on(
                                            "focusout",
                                            "input[type='text'][name!='range_check_date_modal'], input[type='number'], input[type='radio'], input[type='tel'], input[type='email'], input[type='time']",
                                            function (new_event) {
                                                var values = {};
                                                if (
                                                    new_event.currentTarget.dataset
                                                        .main_field
                                                ) {
                                                    var main_field =
                                                        new_event.currentTarget.dataset
                                                            .main_field;
                                                    var field_id =
                                                        new_event.currentTarget.dataset
                                                            .field_id;
                                                    values[main_field] = {};
                                                    values[main_field][field_id] = {};
                                                    values[main_field][field_id][
                                                        new_event.currentTarget.name
                                                    ] = new_event.currentTarget.value;
                                                } else {
                                                    values[
                                                        new_event.currentTarget.name
                                                    ] = new_event.currentTarget.value;
                                                }
                                                // Call to set the new values
                                                ajax.jsonRpc(
                                                    "/reservation/" +
                                                        reservation_id +
                                                        "/onchange_data",
                                                    "call",
                                                    values
                                                ).then(function (new_data) {
                                                    setTimeout(function () {
                                                        if (new_data) {
                                                            if (
                                                                !JSON.parse(new_data)
                                                                    .result
                                                            ) {
                                                                self.displayDataAlert(
                                                                    new_data
                                                                );
                                                            }
                                                            // Refresh reservation modal values and sync with new data
                                                            $.each(
                                                                JSON.parse(new_data)
                                                                    .reservation,
                                                                function (key, value) {
                                                                    console.log(
                                                                        "-----"
                                                                    );
                                                                    console.log(key);
                                                                    console.log(
                                                                        "-----"
                                                                    );
                                                                    //                                                                if (key !== '')
                                                                    var input = $(
                                                                        "form.o_pms_pwa_reservation_form input[name='" +
                                                                            key +
                                                                            "']"
                                                                    );
                                                                    if (input) {
                                                                        input.val(
                                                                            value
                                                                        );
                                                                    } else {
                                                                        $(
                                                                            "form.o_pms_pwa_reservation_form select[name='" +
                                                                                key +
                                                                                "'] option[value='" +
                                                                                value +
                                                                                "']"
                                                                        ).prop(
                                                                            "selected",
                                                                            true
                                                                        );
                                                                    }
                                                                }
                                                            );
                                                            // refresh total
                                                            let a = document.getElementsByClassName(
                                                                "price_total"
                                                            );
                                                            console.log(a);
                                                            a[0].innerText = JSON.parse(
                                                                new_data
                                                            ).reservation.price_total;
                                                            //.value(JSON.parse(new_data).reservation.price_total)
                                                        }
                                                    });
                                                });
                                            }
                                        );

                                        // On change qty on services
                                        // $(
                                        //     "form.o_pms_pwa_reservation_form .o_pms_pwa_rb_tab"
                                        // ).click(function () {
                                        //     // Spot switcher:
                                        //     const selectors = [].slice.call(
                                        //         this.parentElement.children
                                        //     );
                                        //     selectors.forEach((el) =>
                                        //         el.classList.remove(
                                        //             "o_pms_pwa_rb_tab_active"
                                        //         )
                                        //     );
                                        //     this.classList.add(
                                        //         "o_pms_pwa_rb_tab_active"
                                        //     );
                                        //     ajax.jsonRpc(
                                        //         "/reservation/" +
                                        //             reservation_id +
                                        //             "/onchange_data",
                                        //         "call",
                                        //         {
                                        //             services_line_id: {
                                        //                 service_id: this.dataset
                                        //                     .serviceid,
                                        //                 service_line_id: this.dataset
                                        //                     .servicelineid,
                                        //                 qty: this.dataset.value,
                                        //                 price: this.dataset.value,
                                        //             },
                                        //         }
                                        //     );
                                        // });

                                        // On confirm assign
                                        $(".o_pms_pwa_button_assign_confirm").on(
                                            "click",
                                            function (new_event) {
                                                new_event.preventDefault();
                                                var button = new_event.currentTarget;
                                                ajax.jsonRpc(
                                                    button.attributes.url.value,
                                                    "call",
                                                    {}
                                                ).then(function (new_data) {
                                                    $(
                                                        ".o_pms_pwa_reservation_modal"
                                                    ).modal("toggle");
                                                    self.displayDataAlert(
                                                        new_data,
                                                        reservation_data.id
                                                    );
                                                });
                                            }
                                        );

                                        // DATE RANGE MODAL
                                        $(function () {
                                            $(
                                                'input[name="range_check_date_modal"]'
                                            ).daterangepicker(
                                                {
                                                    locale: {
                                                        direction: "ltr",
                                                        format: "YYYY-MM-DD",
                                                        separator: " : ",
                                                        applyLabel: "Aplicar",
                                                        cancelLabel: "Cancelar",
                                                        fromLabel: "Desde",
                                                        toLabel: "hasta",
                                                        customRangeLabel: "Custom",
                                                        daysOfWeek: [
                                                            "Do",
                                                            "Lu",
                                                            "Ma",
                                                            "Mi",
                                                            "Ju",
                                                            "Vi",
                                                            "Sa",
                                                        ],
                                                        monthNames: [
                                                            "Enero",
                                                            "Febrero",
                                                            "Marzo",
                                                            "Abril",
                                                            "Mayo",
                                                            "Junio",
                                                            "Julio",
                                                            "Agosto",
                                                            "Septiembre",
                                                            "Octubre",
                                                            "Noviembre",
                                                            "Diciembre",
                                                        ],
                                                        firstDay: 1,
                                                    },
                                                    startDate: reservation_data.checkin,
                                                    endDate: reservation_data.checkout,

                                                    opens: "left",
                                                    showCustomRangeLabel: false,
                                                },
                                                function (start, end) {
                                                    $(
                                                        'input[name="check_in_date"]'
                                                    ).val(start);
                                                    $(
                                                        'input[name="check_out_date"]'
                                                    ).val(end);
                                                    let nights = 1;
                                                    // Hours*minutes*seconds*milliseconds
                                                    const oneDay = 24 * 60 * 60 * 1000;
                                                    const firstDate = new Date(start);
                                                    const secondDate = new Date(end);
                                                    const diffDays = Math.round(
                                                        Math.abs(
                                                            (firstDate - secondDate) /
                                                                oneDay
                                                        )
                                                    );
                                                    nights = diffDays - 1;
                                                    $('input[name="nights"]').val(
                                                        nights
                                                    );
                                                    // $("form#reservation_detail").submit();
                                                }
                                            );
                                        });
                                    }, 0);
                                });
                            }, 0);
                        });
                    } else {
                        reservation_data = false;
                    }
                }, 0);
            });
        },
        _onClickAssingButton: function (event) {
            event.preventDefault();
            var button = event.currentTarget;
            var tr = button.closest("tr");
            var selector =
                ".o_pms_pwa_reservation[data-id=" + tr.getAttribute("data-id") + "]";
            $(selector).find("td.first-col").click();
        },
        _onClickNotLastChildA: function (event) {
            event.stopPropagation();
        },
        _onClickCheckinButton: function (event) {
            event.preventDefault();
            var self = this;
            var button = event.currentTarget;
            var reservation_id = false;
            try {
                reservation_id = button.closest("tr").getAttribute("data-id");
            } catch (error) {
                reservation_id = $("input[name='id']").val();
            }
            ajax.jsonRpc("/reservation/json_data", "call", {
                reservation_id: reservation_id,
            }).then(function (data) {
                setTimeout(function () {
                    if (data) {
                        self.displayContent("pms_pwa.reservation_checkin_modal", {
                            reservation: data,
                        });
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
                        /* eslint-enable no-alert */
                        $(".o_pms_pwa_button_checkin_confirm").on("click", function (
                            new_event
                        ) {
                            new_event.preventDefault();
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
                                });
                            }
                            ajax.jsonRpc(button.attributes.url.value, "call", {
                                guests_list: guest_list,
                            }).then(function (new_data) {
                                self.displayDataAlert(new_data, data.id);
                            });
                        });
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
                reservation_id = $("input[name='id']").val();
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
                reservation_id = $("input[name='id']").val();
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
            var button = event.currentTarget;
            var reservation_id = false;
            try {
                reservation_id = button.closest("tr").getAttribute("data-id");
            } catch (error) {
                reservation_id = $("input[name='id']").val();
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
                        ajax.jsonRpc(button.attributes.url.value, "call", {
                            payment_method: payment_method,
                            amount: payment_amount,
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
                reservation_id = $("input[name='id']").val();
            }
            location.href = "/reservation/" + reservation_id;
        },
    });

    return publicWidget.registry.ReservationTableWidget;
});
