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
            "click button.o_pms_pwa_cash_register_confirm": "_onClickCashRegisterConfirmButton",
            "click a.o_pms_pwa_modal_cash_register_close": "_onClickModalCashRegiste",
        },
        pms_pwa_initiate_doughnuts: function () {
            $.each($(".o_pms_pwa_doughnut"), function (
                key,
                doughnut
            ) {
                new Chart(doughnut, {
                    type: "doughnut",
                    data: {
                        labels: doughnut.dataset.labels.split(","),
                        datasets: [
                            {
                                label: doughnut.dataset.label,
                                data: doughnut.dataset.data.split(","),
                                backgroundColor: doughnut.dataset.background_color.split(
                                    ","
                                ),
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
            console.log("_onClickCashRegisterConfirmButton");
            var self = this;
            ev.preventDefault();
            var modal = $("div#o_pms_pwa_new_cash_register_payment");
            var payment_method = modal
                .find("select[name='payment_method'] option")
                .filter(":selected")
                .val();
            var payment_amount = modal.find("input[name='amount']").val();
            var description = modal.find("input[name='description']").val();
            var coins = {};
            $("input[type=number].coins").each(function(){
                coins[this.name] = this.value;
            });
            console.log(coins);
            ajax.jsonRpc("/cash_register/add", "call", {
                payment_method: payment_method,
                amount: payment_amount,
                coins: coins,
                description: description,
            }).then(function (data) {
                setTimeout(function () {
                    self.displayDataAlert(data);
                    if(data.result === true){
                        $('#o_pms_pwa_open_close_cash').modal('toggle');
                    }
                }, 0);
            });
        },
        _onClickModalCashRegiste: function(e) {
            var self = this;
            e.preventDefault();
            $('input[type="number"]').val(0);
            var dataTitle = e.currentTarget.getAttribute("data-title")

            if(dataTitle=="open"){
                $(".modal-title").html("Abrir caja");
                $(".modal-button-text").html("Abrir caja");
            }else{
                $(".modal-title").html("Cerrar caja");
                $(".modal-button-text").html("Cerrar caja");
            }
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
