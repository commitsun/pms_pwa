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
        values[event.currentTarget.name] = event.currentTarget.value;
        ajax.jsonRpc("/reservation/single_reservation_onchange", "call", values).then(
            function (new_data) {
                setTimeout(function () {
                    if (new_data) {
                        console.log(new_data);
                        $.each(new_data, function (key, value) {
                            var input = $(
                                "form#single_reservation_form input[name='" + key + "']"
                            );
                            if (input) {
                                input.val(value);
                            } else {
                                $(
                                    "form#single_reservation_form select[name='" +
                                        key +
                                        "'] option[value='" +
                                        value +
                                        "']"
                                ).prop("selected", true);
                            }
                        });
                    }
                });
            }
        );
    });

    $("form#single_reservation_form").on("submit", function (event) {
        event.preventDefault();
        var values = $("form#single_reservation_form").serializeArray();
        ajax.jsonRpc("/reservation/single_reservation_new", "call", values).then(
            function (new_data) {
                setTimeout(function () {
                    if (new_data) {
                        console.log(new_data);
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
        values[event.currentTarget.name] = event.currentTarget.value;
        ajax.jsonRpc("/reservation/multiple_reservation_onchange", "call", values).then(
            function (new_data) {
                setTimeout(function () {
                    if (new_data) {
                        console.log(new_data);
                        $.each(new_data, function (key, value) {
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
                        });
                    }
                });
            }
        );
    });

    $("form#multiple_reservation_form").on("submit", function (event) {
        event.preventDefault();
        var values = $("form#multiple_reservation_form").serializeArray();
        ajax.jsonRpc("/reservation/multiple_reservation_new", "call", values).then(
            function (new_data) {
                setTimeout(function () {
                    if (new_data) {
                        console.log(new_data);
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
        displayDataAlert: function (result, data_id) {
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
            $(String("#reservation_" + data_id)).load(
                String(window.location.href + " #reservation_" + data_id + " td")
            );
        },
        /* OnClick events */
        _onClickReservationButton: function (event) {
            event.preventDefault();
            var self = this;
            var reservation_id = event.currentTarget.parentNode.getAttribute("data-id");
            var reservation_data = false;

            /* RPC call to get the reservation data */
            ajax.jsonRpc("/reservation/json_data", "call", {
                reservation_id: reservation_id,
            }).then(function (data) {
                setTimeout(function () {
                    if (data) {
                        reservation_data = data;
                        /* Adding missing data */
                        reservation_data.image = "/web/static/src/img/placeholder.png";
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
                        var room_types = [
                            "Triple",
                            "Económica",
                            "Estándar",
                            "Individual",
                            "Premium",
                            "Superior",
                        ];
                        var room_numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                        var extras = ["Breakfast", "Additional bed", "Cradle"];
                        var payment_methods = ["Credit card", "Cash"];
                        var reservation_types = ["Normal", "Staff", "Out of Service"];
                        self.displayContent("pms_pwa.roomdoo_reservation_modal", {
                            reservation: reservation_data,
                            room_types: room_types,
                            extras: extras,
                            payment_methods: payment_methods,
                            room_numbers: room_numbers,
                            reservation_types: reservation_types,
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
                            csrf_token: csrf_token,
                        });

                        var survey = [];
                        // Bidimensional array: [ [1,3], [2,4] ]
                        // Switcher function:
                        $("form.o_pms_pwa_reservation_form .o_pms_pwa_rb_tab").click(
                            function () {
                                // Spot switcher:
                                $(this)
                                    .parent()
                                    .find(".o_pms_pwa_rb_tab")
                                    .removeClass("o_pms_pwa_rb_tab_active");
                                $(this).addClass("o_pms_pwa_rb_tab_active");
                            }
                        );

                        $("form.o_pms_pwa_reservation_form").submit(function (
                            new_event
                        ) {
                            new_event.preventDefault();
                            // Empty array:
                            survey = [];
                            // Push data:
                            $(".o_pms_pwa_rb").each(function (i, element) {
                                var cur_element = $(element);
                                var data_id = cur_element.attr("data-id");
                                var rbValue = parseInt(
                                    cur_element
                                        .find(".o_pms_pwa_rb_tab_active")
                                        .attr("data-value"),
                                    10
                                );
                                survey.push([data_id, rbValue]);
                            });

                            $(this)
                                .find("input[name='reservation_extras']")
                                .val(survey);

                            new_event.currentTarget.submit();
                        });

                        $("form.o_pms_pwa_reservation_form").on(
                            "change",
                            "input, select",
                            function (new_event) {
                                var values = {reservation_id: reservation_id};
                                values[new_event.currentTarget.name] =
                                    new_event.currentTarget.value;
                                ajax.jsonRpc(
                                    "/reservation/onchange_data",
                                    "call",
                                    values
                                ).then(function (new_data) {
                                    setTimeout(function () {
                                        if (new_data) {
                                            $.each(new_data, function (key, value) {
                                                var input = $(
                                                    "form.o_pms_pwa_reservation_form input[name='" +
                                                        key +
                                                        "']"
                                                );
                                                if (input) {
                                                    input.val(value);
                                                } else {
                                                    $(
                                                        "form.o_pms_pwa_reservation_form select[name='" +
                                                            key +
                                                            "'] option[value='" +
                                                            value +
                                                            "']"
                                                    ).prop("selected", true);
                                                }
                                            });
                                        }
                                    });
                                });
                            }
                        );

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

                        // DATE RANGE MODAL
                        $(function () {
                            $('input[name="range_check_date_modal"]').daterangepicker(
                                {
                                    locale: {
                                        direction: "ltr",
                                        format: "DD/MM/YYYY",
                                        separator: " - ",
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

                                    opens: "left",
                                    showCustomRangeLabel: false,
                                },
                                function (start, end, label) {
                                    console.log(label);
                                    $('input[name="check_in_date"]').val(start);
                                    $('input[name="check_out_date"]').val(end);
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
                        });
                    } else {
                        reservation_data = false;
                    }
                }, 500);
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
                        new Stepper($(".bs-stepper")[0], {
                            linear: false,
                            animation: true,
                            selectors: {
                                steps: ".step",
                                trigger: ".step-trigger",
                                stepper: ".bs-stepper",
                            },
                        });
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
                        self.displayContent("pms_pwa.reservation_cancel_modal", {
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
