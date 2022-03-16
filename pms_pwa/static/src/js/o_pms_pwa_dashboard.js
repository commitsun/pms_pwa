odoo.define("pms_pwa.dashboard", function (require) {
    "use strict";
    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    var _t = core._t;
    var csrf_token = core.csrf_token;
    var publicWidget = require("web.public.widget");

    publicWidget.registry.PMSPWADashboardWidget = publicWidget.Widget.extend({
        selector: "div.o_pms_pwa_dashboard",
        events: {
            "click a.o_pms_pwa_accept_tasks": "_onClickAceptAllTask",
            "change input[name='arrival_date']": "_onChangeArrivalFormSubmit",
            "change input[name='departure_date']": "_onChangeDepartureFormSubmit",
            "change input[name='rooms_date']": "_onChangeRoomFormSubmit",
            "click a.o_pms_pwa_cash_register_close": "_onClickCashRegisterCloseButton",
            "click button.o_pms_pwa_cash_register_confirm":
                "_onClickCashRegisterConfirmButton",
            "click a.o_pms_pwa_modal_cash_register_close": "_onClickModalCashRegiste",
            "click a.o_pms_pwa_edit_payment_modal": "_onClickModalCashEdit",
            "click button.o_pms_pwa_edit_payment": "_onClickModalEditPayment",
            "click button.o_pms_pwa_cash_register": "_onClickCashPayment",
            "click button.o_pms_pwa_cash_internal": "_onClickCashInternal",
            "click a.o_pms_pwa_modal_cash_payment": "_onClickModalCashPayment",
            "click button.o_pms_pwa_modal_bank_payment": "_onClickBankPayment",
            "click a.o_pms_pwa_send_cash_filters": "_onClickCashFilter",
            "click a.o_pms_pwa_send_bank_filters": "_onClickBankFilter",
        },
        pms_pwa_initiate_doughnuts: function () {
            $.each($(".o_pms_pwa_doughnut"), function (key, doughnut) {
                new Chart(doughnut, {
                    type: "doughnut",
                    data: {
                        labels: doughnut.dataset.labels.split(","),
                        datasets: [
                            {
                                label: doughnut.dataset.label,
                                data: doughnut.dataset.data.split(","),
                                backgroundColor:
                                    doughnut.dataset.background_color.split(","),
                                borderColor: doughnut.dataset.border_color.split(","),
                                borderWidth: 1,
                            },
                        ],
                    },
                    options: {
                        legend: {
                            display: false,
                        },
                    },
                });
            });
        },
        pms_pwa_initiate_lines: function () {
            $.each($(".o_pms_pwa_line"), function (key, line) {
                new Chart(line, {
                    type: "line",
                    data: {
                        labels: line.dataset.labels.split(","),
                        datasets: [
                            {
                                label: line.dataset.label_1,
                                data: line.dataset.data_1.split(","),
                                backgroundColor:
                                    line.dataset.background_color_1.split(","),
                                borderColor: line.dataset.border_color_1.split(","),
                                borderWidth: 1,
                            },
                            {
                                label: line.dataset.label_2,
                                data: line.dataset.data_2.split(","),
                                backgroundColor:
                                    line.dataset.background_color_2.split(","),
                                borderColor: line.dataset.border_color_2.split(","),
                                borderWidth: 1,
                            },
                        ],
                    },
                    options: {
                        legend: {
                            position: "bottom",
                            align: "end",
                        },
                    },
                });
            });
        },
        formToJson: function (formData) {
            var form_object = {};
            $.each(formData, function (i, v) {
                if (v.value != "false") {
                    form_object[v.name] = v.value;
                }
            });
            return form_object;
        },
        displayDataAlert: function (data) {
            var self = this;
            var data = JSON.parse(data);
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
        },
        init: function () {
            return this._super.apply(this, arguments);
        },
        start: function () {
            this.pms_pwa_initiate_doughnuts();
            // TO FIX
            // Error rendering this chat on start.
            // Doing it the old way at the bottom of the file.
            //this.pms_pwa_initiate_lines();
            return this._super.apply(this, arguments);
        },
        /* OnClick events */
        _onClickAceptAllTask: function (ev) {
            var self = this;
            ev.preventDefault();
            var form = $('form[name="tasks"]');
            var form_field = form.find('input[type="hidden"][name="task_ids"]');
            var task_ids = [];
            $.each(form.find('input[type="checkbox"]:checked'), function (key, input) {
                task_ids.push(input.dataset.taskId);
            });
            form_field.val(task_ids);
            form.submit();
        },
        _onChangeArrivalFormSubmit: function (event) {
            var form = $('form[name="arrival_form"]');
            form.submit();
        },
        _onChangeDepartureFormSubmit: function (e) {
            var form = $('form[name="departure_form"]');
            form.submit();
        },
        _onChangeRoomFormSubmit: function (event) {
            var form = $('form[name="rooms_form"]');
            form.submit();
        },
        _onClickCashRegisterCloseButton: function (ev) {
            var self = this;
            ev.preventDefault();
            ajax.jsonRpc("/cash_register/close", "call", {}).then(function (data) {
                setTimeout(function () {
                    self.displayDataAlert(data);
                }, 0);
            });
        },
        _onClickCashRegisterConfirmButton: function (ev) {
            let force = false;
            if (ev.currentTarget.getAttribute("data-force")) {
                force = true;
            }
            var self = this;
            ev.preventDefault();
            var modal = $("div#o_pms_pwa_open_close_cash");
            var payment_method = modal
                .find("select[name='payment_method'] option")
                .filter(":selected")
                .val();
            var payment_amount = modal.find("input[name='amount']").val();
            var coins = {};
            $("input[type=number].coins").each(function () {
                coins[this.name] = this.value;
            });

            ajax.jsonRpc("/cash_register/open-close", "call", {
                payment_method: payment_method,
                amount: payment_amount,
                coins: coins,
                type: $("input[name=type]").val(),
                force: force,
            }).then(function (data) {
                let obj = JSON.parse(data);
                if (obj["result"] === true) {
                    $("#confirmaModal").modal("toggle");
                    $("#o_pms_pwa_open_close_cash").modal("toggle");
                    window.location = "/dashboard";
                } else {
                    if (obj["force"] === true) {
                        $("#confirmaModal").modal("show");
                        $("p.title_confirm").html(obj["message"]);
                    } else {
                        self.displayDataAlert(data);
                    }
                }
            });
        },
        _onClickCashPayment: function (ev) {
            var self = this;
            ev.preventDefault();
            let modal = $("div#o_pms_pwa_new_cash_register_payment");
            let payment_method = modal
                .find("select[name='payment_method'] option")
                .filter(":selected")
                .val();
            let partner_id = modal.find("input[name='partner_id']").val();
            let payment_amount = modal.find("input[name='amount']").val();
            let description = modal.find("input[name='description']").val();
            let date = modal.find("input[name='date']").val();
            ajax.jsonRpc("/cash_register/add", "call", {
                payment_method: payment_method,
                partner_id: partner_id,
                amount: payment_amount,
                description: description,
                date: date,
            }).then(function (data) {
                let obj = JSON.parse(data);
                self.displayDataAlert(data);
                $("section#cash_values").load("/dashboard section#cash_values>*");
            });
        },
        _onClickBankPayment: function (ev) {
            console.log("AQui _onClickBankPayment");
            var self = this;
            ev.preventDefault();
            let modal = $("div#o_pms_pwa_new_bank_register_payment");
            let payment_method = modal
                .find("select[name='payment_method'] option")
                .filter(":selected")
                .val();
            let partner_id = modal.find("input[name='partner_id']").val();
            let payment_amount = modal.find("input[name='amount']").val();
            let description = modal.find("input[name='description']").val();
            let date = modal.find("input[name='date']").val();
            ajax.jsonRpc("/cash_register/add", "call", {
                payment_method: payment_method,
                partner_id: partner_id,
                amount: payment_amount,
                description: description,
                date: date,
            }).then(function (data) {
                let obj = JSON.parse(data);
                self.displayDataAlert(data);
                $("section#cash_values").load("/dashboard section#cash_values>*");
            });
        },
        _onClickCashInternal: function (ev) {
            var self = this;
            ev.preventDefault();
            let modal = $("div#o_pms_pwa_internal_register_payment");
            let origin_payment_method = modal
                .find("select[name='origin_payment_method'] option")
                .filter(":selected")
                .val();
            let target_payment_method = modal
                .find("select[name='target_payment_method'] option")
                .filter(":selected")
                .val();
            let payment_amount = modal.find("input[name='amount']").val();
            let description = modal.find("textarea[name='description']").val();
            let date = modal.find("input[name='date']").val();
            ajax.jsonRpc("/cash_register/add", "call", {
                payment_method: origin_payment_method,
                target_payment_method: target_payment_method,
                amount: payment_amount,
                description: description,
                date: date,
            }).then(function (data) {
                let obj = JSON.parse(data);
                self.displayDataAlert(data);
                $("section#cash_values").load("/dashboard section#cash_values>*");
            });
        },
        _onClickModalCashPayment: function (e) {
            var self = this;
            e.preventDefault();
            let modal = $("div#o_pms_pwa_new_cash_register_payment");

            var dataTitle = e.currentTarget.getAttribute("data-title");
            if (dataTitle == "caja") {
                $(".modal-title").html("Movimiento caja");
            } else {
                if (dataTitle == "interno") {
                    $(".modal-title").html("Pago interno");
                    modal = $("div#o_pms_pwa_internal_register_payment");
                } else {
                    $(".modal-title").html("Movimiento banco");
                    modal = $("div#o_pms_pwa_new_bank_register_payment");
                }
            }
            modal.find('input[type="number"]').val(0);
            modal.find('input[type="text"]').val("");
            modal.find('textarea[name="description"]').val("");
            modal.find('input[name="date"]').val(moment().format('DD/MM/YYYY'));
            $(".o_pms_pwa_modal_daterangepicker").daterangepicker(
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
                    const start_date = new Date(start);
                    var select_date = start_date.toLocaleDateString(
                        document.documentElement.lang,
                        {year: "numeric", month: "2-digit", day: "2-digit"}
                    );
                    this.element.val(select_date);
                }
            );
        },
        _onClickModalCashRegiste: function (e) {
            var self = this;
            e.preventDefault();
            $('input[type="number"]').val(0);
            var dataTitle = e.currentTarget.getAttribute("data-title");

            if (dataTitle == "open") {
                $(".modal-title").html("Abrir caja");
                $(".modal-button-text").html("Abrir caja");
                $('input[name="type"]').val("open");
            } else {
                $(".modal-title").html("Cerrar caja");
                $(".modal-button-text").html("Cerrar caja");
                $('input[name="type"]').val("close");
            }
        },
        _onClickModalCashEdit: function (e) {
            var self = this;
            e.preventDefault();
            var id = e.currentTarget.getAttribute("data-id");
            var name = e.currentTarget.getAttribute("data-name");
            var amount = e.currentTarget.getAttribute("data-amount");
            var date = e.currentTarget.getAttribute("data-date");
            if(!date){
                date = moment().format('DD/MM/YYYY');
            }else{
                date = moment(date).format('DD/MM/YYYY');
            }
            $("input.payment_id").val(id);
            $("input.payment_name").val(name);
            $("input.payment_amount").val(amount);
            $("input[name=date]").val(date);
            $(".o_pms_pwa_modal_daterangepicker").daterangepicker(
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
                    const start_date = new Date(start);
                    var select_date = start_date.toLocaleDateString(
                        document.documentElement.lang,
                        {year: "numeric", month: "2-digit", day: "2-digit"}
                    );
                    this.element.val(select_date);
                }
            );
        },
        _onClickModalEditPayment: function (e) {
            var self = this;
            e.preventDefault();
            let modal = $("div#o_pms_pwa_edit_payment_modal");
            let payment_id = $("input.payment_id").val();
            let payment_amount = $("input.payment_amount").val();
            let payment_name = $("input.payment_name").val();
            let payment_date = $("input[name=date]").val();
            let payment_method = modal
                .find("select[name='payment_method'] option")
                .filter(":selected")
                .val();
            ajax.jsonRpc("/cash_register/edit", "call", {
                id: payment_id,
                amount: payment_amount,
                name: payment_name,
                journal_id: payment_method,
                date: payment_date,
            }).then(function (data) {
                self.displayDataAlert(data);
                $("section#cash_values").load("/dashboard section#cash_values>*");
            });
        },
        _onClickBankFilter: function (e) {
            var self = this;
            e.preventDefault();
            let journal_date = $('input[name="journal_date"]').val();
            let journal_selected = $("select[name='journal_selected'] option")
                .filter(":selected")
                .val();
            ajax.jsonRpc("/dashboard/bank_journals", "call", {
                journal_date: journal_date,
                journal_id: journal_selected,
            }).then(function (data) {
                let new_html = "";
                let payments = data["bank_journals"]["payments"];
                for (let val in payments) {
                    if(payments[val]["amount"] < 0){
                        new_html =
                            new_html +
                            '<div class="row"><div class="col-9"><a href="" type="button" class="o_pms_pwa_btn_border px-3 o_pms_pwa_edit_payment_modal" data-id="' +
                            payments[val]["id"] +
                            '" data-name="' +
                            payments[val]["simple_name"] +
                            '" data-amount="' +
                            payments[val]["amount"] +
                            '" data-toggle="modal" data-target="#o_pms_pwa_edit_payment_modal"><i class="fa fa-edit"></i></a><span>' +
                            payments[val]["name"] +
                            '</span></div><div class="col-3 text-right o_pms_pwa_db_dates" style="color:red;"><span>' +
                            payments[val]["amount"] +
                            "</span>€</div></div>";
                    }else{
                        new_html =
                            new_html +
                            '<div class="row"><div class="col-9"><a href="" type="button" class="o_pms_pwa_btn_border px-3 o_pms_pwa_edit_payment_modal" data-id="' +
                            payments[val]["id"] +
                            '" data-name="' +
                            payments[val]["simple_name"] +
                            '" data-amount="' +
                            payments[val]["amount"] +
                            '" data-toggle="modal" data-target="#o_pms_pwa_edit_payment_modal"><i class="fa fa-edit"></i></a><span>' +
                            payments[val]["name"] +
                            '</span></div><div class="col-3 text-right o_pms_pwa_db_dates"><span>' +
                            payments[val]["amount"] +
                            "</span>€</div></div>";
                    }
                }
                $("#o_pms_pwa_dashboard_bank_journals").html(new_html);
            });
        },
        _onClickCashFilter: function (e) {
            var self = this;
            e.preventDefault();
            let journal_date = $('input[name="cash_date"]').val();
            let journal_selected = $("select[name='payment_method'] option")
                .filter(":selected")
                .val();
            ajax.jsonRpc("/dashboard/cash_journal", "call", {
                journal_date: journal_date,
                journal_id: journal_selected,
            }).then(function (data) {
                let new_html = "";
                let payments = data["cash"]["payments"];
                for (let val in payments) {
                    if(payments[val]["amount"] < 0){
                        new_html =
                            new_html +
                            '<div class="row"><div class="col-9"><a href="" type="button" class="o_pms_pwa_btn_border px-3 o_pms_pwa_edit_payment_modal" data-id="' +
                            payments[val]["id"] +
                            '" data-name="' +
                            payments[val]["simple_name"] +
                            '" data-amount="' +
                            payments[val]["amount"] +
                            '" data-toggle="modal" data-target="#o_pms_pwa_edit_payment_modal"><i class="fa fa-edit"></i></a><span>' +
                            payments[val]["name"] +
                            '</span></div><div class="col-3 text-right o_pms_pwa_db_dates" style="color:red;"><span>' +
                            payments[val]["amount"] +
                            "</span>€</div></div>";
                    }else{
                        new_html =
                            new_html +
                            '<div class="row"><div class="col-9"><a href="" type="button" class="o_pms_pwa_btn_border px-3 o_pms_pwa_edit_payment_modal" data-id="' +
                            payments[val]["id"] +
                            '" data-name="' +
                            payments[val]["simple_name"] +
                            '" data-amount="' +
                            payments[val]["amount"] +
                            '" data-toggle="modal" data-target="#o_pms_pwa_edit_payment_modal"><i class="fa fa-edit"></i></a><span>' +
                            payments[val]["name"] +
                            '</span></div><div class="col-3 text-right o_pms_pwa_db_dates"><span>' +
                            payments[val]["amount"] +
                            "</span>€</div></div>";
                    }
                }
                $("#o_pms_pwa_dashboard_cash_journals").html(new_html);
            });
        },
    });

    $.each(document.getElementsByClassName("o_pms_pwa_line"), function (key, line) {
        new Chart(line, {
            type: "line",
            data: {
                labels: line.dataset.labels.split(","),
                datasets: [
                    {
                        label: line.dataset.label_1,
                        data: line.dataset.data_1.split(","),
                        backgroundColor: line.dataset.background_color_1.split(","),
                        borderColor: line.dataset.border_color_1.split(","),
                        borderWidth: 1,
                    },
                    {
                        label: line.dataset.label_2,
                        data: line.dataset.data_2.split(","),
                        backgroundColor: line.dataset.background_color_2.split(","),
                        borderColor: line.dataset.border_color_2.split(","),
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                legend: {
                    position: "bottom",
                    align: "end",
                },
            },
        });
    });

    return publicWidget.registry.PMSPWADashboardWidget;
});
