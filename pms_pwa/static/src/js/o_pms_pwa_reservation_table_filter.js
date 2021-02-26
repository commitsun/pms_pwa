odoo.define("pms_pwa.reservation_table", function(require) {
    var rpc = require("web.rpc");
    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    var _t = core._t;
    var QWeb = core.qweb;
    var publicWidget = require("web.public.widget");
    var core = require("web.core");
    var csrf_token = core.csrf_token;

    $(".o_pms_pwa_button_invoice").on("click", function(event) {
        event.preventDefault();
        var self = this;
        var button = event.currentTarget;
        var reservation_id = button.closest("tr").getAttribute("data-id");
        location.href = "/reservation/" + reservation_id;
    });

    $(".o_pms_pwa_button_payment").on("click", function(event) {
        event.preventDefault();
        var self = this;
        var button = event.currentTarget;
        var reservation_id = button.closest("tr").getAttribute("data-id");
        var modal = $(".o_pms_pwa_roomdoo_reservation_modal");
        ajax.jsonRpc("/reservation/json_data", "call", {
            reservation_id: reservation_id,
        }).then(function(data) {
            if (data) {
                console.log(data);
                var html = core.qweb.render("pms_pwa.reservation_payment_modal", {
                    reservation: data,
                });
                modal.html(html);
                $("div.o_pms_pwa_reservation_modal").modal();
                $(".o_pms_pwa_button_payment_confirm").on("click", function(event) {
                    event.preventDefault();
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
                    }).then(function(data) {
                        data = JSON.parse(data);
                        if (data && data["result"] == true) {
                            data["type"] = "success";
                        } else if (data && data["result"] == false) {
                            data["type"] = "warning";
                        } else {
                            data["type"] = "warning";
                            data["message"] = _t(
                                "An undefined error has ocurred, please try again later."
                            );
                        }
                        var alert_div = $(".o_pms_pwa_roomdoo_alerts");
                        var alert = core.qweb.render("pms_pwa.reservation_alerts", {
                            alert: data,
                        });
                        alert_div.append(alert);
                    });
                });
            }
        });
    });

    $(".o_pms_pwa_button_checkout").on("click", function(event) {
        event.preventDefault();
        var self = this;
        var button = event.currentTarget;
        var url = button.attributes.url.value;
        var modal = $(".o_pms_pwa_roomdoo_reservation_modal");
        if (modal) {
            var reservation_id = button.closest("tr").getAttribute("data-id");
            ajax.jsonRpc("/reservation/json_data", "call", {
                reservation_id: reservation_id,
            }).then(function(data) {
                setTimeout(function() {
                    if (data) {
                        console.log(data);
                        var html = core.qweb.render(
                            "pms_pwa.reservation_checkout_modal",
                            {reservation: data}
                        );
                        modal.html(html);
                        $("div.o_pms_pwa_reservation_modal").modal();
                        $(".o_pms_pwa_button_checkout_confirm").on("click", function(
                            event
                        ) {
                            event.preventDefault();
                            var button = event.currentTarget;
                            ajax.jsonRpc(button.attributes.url.value, "call", {}).then(
                                function(data) {
                                    data = JSON.parse(data);
                                    if (data && data["result"] == true) {
                                        data["type"] = "success";
                                    } else if (data && data["result"] == false) {
                                        data["type"] = "warning";
                                    } else {
                                        data["type"] = "warning";
                                        data["message"] = _t(
                                            "An undefined error has ocurred, please try again later."
                                        );
                                    }
                                    var alert_div = $(".o_pms_pwa_roomdoo_alerts");
                                    var alert = core.qweb.render(
                                        "pms_pwa.reservation_alerts",
                                        {alert: data}
                                    );
                                    alert_div.append(alert);
                                }
                            );
                        });
                    }
                });
            });
        }
    });

    $(".o_pms_pwa_button_cancel").on("click", function(event) {
        event.preventDefault();
        var self = this;
        var button = event.currentTarget;
        var url = button.attributes.url.value;
        var modal = $(".o_pms_pwa_roomdoo_reservation_modal");
        if (modal) {
            var reservation_id = button.closest("tr").getAttribute("data-id");
            ajax.jsonRpc("/reservation/json_data", "call", {
                reservation_id: reservation_id,
            }).then(function(data) {
                setTimeout(function() {
                    if (data) {
                        console.log(data);
                        var html = core.qweb.render(
                            "pms_pwa.reservation_cancel_modal",
                            {reservation: data}
                        );
                        modal.html(html);
                        $("div.o_pms_pwa_reservation_modal").modal();
                        $(".o_pms_pwa_button_cancel_confirm").on("click", function(
                            event
                        ) {
                            event.preventDefault();
                            var button = event.currentTarget;
                            ajax.jsonRpc(button.attributes.url.value, "call", {}).then(
                                function(data) {
                                    data = JSON.parse(data);
                                    if (data && data["result"] == true) {
                                        data["type"] = "success";
                                    } else if (data && data["result"] == false) {
                                        data["type"] = "warning";
                                    } else {
                                        data["type"] = "warning";
                                        data["message"] = _t(
                                            "An undefined error has ocurred, please try again later."
                                        );
                                    }
                                    var alert_div = $(".o_pms_pwa_roomdoo_alerts");
                                    var alert = core.qweb.render(
                                        "pms_pwa.reservation_alerts",
                                        {alert: data}
                                    );
                                    alert_div.append(alert);
                                }
                            );
                        });
                    }
                });
            });
        }
    });

    $(".o_pms_pwa_button_checkin").on("click", function(event) {
        event.preventDefault();
        var self = this;
        var button = event.currentTarget;
        var modal = $(".o_pms_pwa_roomdoo_reservation_modal");
        if (modal) {
            var reservation_id = button.closest("tr").getAttribute("data-id");
            ajax.jsonRpc("/reservation/json_data", "call", {
                reservation_id: reservation_id,
            }).then(function(data) {
                setTimeout(function() {
                    if (data) {
                        console.log(data);
                        var html = core.qweb.render(
                            "pms_pwa.reservation_checkin_modal",
                            {reservation: data}
                        );
                        modal.html(html);
                        $("div.o_pms_pwa_reservation_modal").modal();
                        var stepper = new Stepper($(".bs-stepper")[0], {
                            linear: false,
                            animation: true,
                            selectors: {
                                steps: ".step",
                                trigger: ".step-trigger",
                                stepper: ".bs-stepper",
                            },
                        });
                        $(".o_pms_pwa_button_checkin_confirm").on("click", function(
                            event
                        ) {
                            event.preventDefault();
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
                            }).then(function(data) {
                                data = JSON.parse(data);
                                if (data && data["result"] == true) {
                                    data["type"] = "success";
                                } else if (data && data["result"] == false) {
                                    data["type"] = "warning";
                                } else {
                                    data["type"] = "warning";
                                    data["message"] = _t(
                                        "An undefined error has ocurred, please try again later."
                                    );
                                }
                                var alert_div = $(".o_pms_pwa_roomdoo_alerts");
                                var alert = core.qweb.render(
                                    "pms_pwa.reservation_alerts",
                                    {alert: data}
                                );
                                alert_div.append(alert);
                            });
                        });
                    }
                });
            });
        }
    });

    $(".o_pms_pwa_button_assign").on("click", function(event) {
        event.preventDefault();
        var self = this;
        var button = event.currentTarget;
        var tr = button.closest("tr");
        var selector =
            ".o_pms_pwa_reservation[data-id=" + tr.getAttribute("data-id") + "]";
        $(selector)
            .find("td.first-col")
            .click();
    });

    $("button.close > span.o_pms_pwa_tag_close").on("click", function(event) {
        event.preventDefault();
        var self = this;
        var input = event.currentTarget.parentNode.getAttribute("data-tag");
        if (input == "search") {
            $("input[name='original_search']").val("");
        } else {
            $("input[name='" + input + "']").val("");
        }
        $("form").submit();
    });

    $("tbody > tr > td:not(:last-child) a").on("click", function(event) {
        event.stopPropagation();
    });

    publicWidget.registry.ReservationTableWidget = publicWidget.Widget.extend({
        selector: "table.o_pms_pwa_reservation_list_table",
        xmlDependencies: [
            "/pms_pwa/static/src/xml/pms_pwa_roomdoo_reservation_modal.xml",
        ],
        events: {
            "click tr.o_pms_pwa_reservation:not(.accordion) > td:not(:last-child)":
                "_onClickReservationButton",
        },
        /**
         * @override
         */
        start: function() {
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
        displayContent: function(xmlid, render_values) {
            var html = core.qweb.render(xmlid, render_values);
            $("div.o_pms_pwa_roomdoo_reservation_modal").html(html);
            $("div.o_pms_pwa_reservation_modal").modal();
            $(".o_pms_pwa_button_assign_confirm").on("click", function(event) {
                event.preventDefault();
                var button = event.currentTarget;
                ajax.jsonRpc(button.attributes.url.value, "call", {}).then(function(
                    data
                ) {
                    data = JSON.parse(data);
                    if (data && data["result"] == true) {
                        data["type"] = "success";
                    } else if (data && data["result"] == false) {
                        data["type"] = "warning";
                    } else {
                        data["type"] = "warning";
                        data["message"] = _t(
                            "An undefined error has ocurred, please try again later."
                        );
                    }
                    var alert_div = $(".o_pms_pwa_roomdoo_alerts");
                    var alert = core.qweb.render("pms_pwa.reservation_alerts", {
                        alert: data,
                    });
                    alert_div.append(alert);
                });
            });
        },
        _onClickReservationButton: function(event) {
            event.preventDefault();
            var self = this;
            var reservation_id = event.currentTarget.parentNode.getAttribute("data-id");

            /* RPC call to get the reservation data */
            ajax.jsonRpc("/reservation/json_data", "call", {
                reservation_id: reservation_id,
            }).then(function(data) {
                setTimeout(function() {
                    if (data) {
                        var reservation_data = data;
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
                                nights_number_text: this.adults_number_text,
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
                    } else {
                        var reservation_data = false;
                    }
                }, 500);
            });
        },
    });

    return publicWidget.registry.ReservationTableWidget;
});
