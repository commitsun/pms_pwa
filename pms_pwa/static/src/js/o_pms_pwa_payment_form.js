odoo.define("pms_pwa.payment_form", function (require) {
    "use strict";

    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    var qweb = core.qweb;
    var _t = core._t;
    var publicWidget = require("web.public.widget");

    ajax.loadXML("/pms_pwa/static/src/xml/pms_pwa_roomdoo_payment_form.xml", qweb);

    publicWidget.registry.PMSPWAPaymentFormWidget = publicWidget.Widget.extend({
        selector: ".pms_pwa_roomdoo_payment_form",
        events: {
            "click td > i.pms_pwa_payment_edit": "_onClickEditField",
            "click td > input.o_pms_pwa_included": "_onClickInputIncluded",
            "click a.o_pms_pwa_reset_form": "_onClickButtonReset",
            "click a.o_pms_pwa_send_form": "_onClickSubmitButton",
        },

        init: function () {
            this._super.apply(this, arguments);
        },

        start: function () {
            var self = this;
            return this._super.apply(this, arguments);
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
            console.log("data => ", data);
            var self = this;
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

        _onClickOpenPaymentForm: function (event) {
            var button = event.currentTarget;
            var reservation_id = button.getAttribute("data-id");
            $(".o_pms_pwa_reservation_modal").modal("toggle");
            if (reservation_id) {
                ajax.jsonRpc("/reservation/" + reservation_id + "/invoice", "call", {
                    reservation_id: reservation_id,
                }).then(function (data) {
                    var html = core.qweb.render("pms_pwa.pms_pwa_roomdoo_payment_form", {
                        data: data,
                    });
                    $("div.pms_pwa_roomdoo_payment_form").html(html);
                    $("div.pms_pwa_roomdoo_payment_form").modal();
                });
            } else {
                console.log("ERROR, no hay reservation_id");
            }
        },

        _onClickEditField: function (event) {
            event.stopPropagation();
            var target = $(event.currentTarget);
            var parent = target.parent();
            var field = parent.data("field");
            var value = parent.find(".o_pms_pwa_" + field)[0].innerText;
            var max_qty = false;
            var html = false;

            if (field == 'qty_to_invoice') {
                max_qty = parent.find(".o_pms_pwa_max_qty")[0].innerText;
                parent.html('<input class="o_pms_pwa_edit_in_line form-control" type="number" value="' + value +'"/>')
            } else {
                parent.html('<input class="o_pms_pwa_edit_in_line form-control" type="text" value="' + value +'"/>')
            }            

            $(".o_pms_pwa_edit_in_line").focus();
            $(".o_pms_pwa_edit_in_line").keyup(function (subEvent) {
                if (subEvent.keyCode === 13) {
                    html ='<span class="o_pms_pwa_' + field +'">' + $(".o_pms_pwa_edit_in_line").val().trim() + '</span><i class="pms_pwa_payment_edit fa fa-edit"></i>';
                    if (max_qty) {
                        html = html + '/<span class="o_pms_pwa_max_qty">'+ max_qty +'</span>';
                    }
                    parent.html(html);
                }
            });

            $(".o_pms_pwa_edit_in_line").focusout(function () {
                html = '<span class="o_pms_pwa_' + field +'">' + value + '</span><i class="pms_pwa_payment_edit fa fa-edit"></i>';
                if (max_qty) {
                    html = html + '/<span class="o_pms_pwa_max_qty">'+ max_qty +'</span>';
                }
                parent.html(html);
            });

            parent.find(".pms_pwa_payment_edit").on(
                "click",
                function (event) {
                    event.preventDefault();
                    this._onClickEditField(event);
                }
            );

        },

        _onClickInputIncluded: function (event) {
            var input = event.currentTarget;
            var tr = $(input).parent().parent();
            if(!input.checked) {
                tr.addClass("o_pms_pwa_disabled");
            } else {
                tr.removeClass("o_pms_pwa_disabled");
            }
        },

        _onClickButtonReset: function (event) {
            event.preventDefault();
            var a = event.currentTarget;
            var form = $(a).parent().parent().parent().parent();
            form.find("input").val('');
        },

        _onClickSubmitButton: function (event) {
            event.preventDefault();
            var self = this;
            var values = $("form.o_pms_pwa_payment_form").serializeArray();
            values = this.formToJson(values);
            var lines_to_invoice = $(".o_pms_pwa_lines_to_invoice");
            var lines = [];
            $.each(lines_to_invoice, function (i, v) {
                lines.push({
                    id: $(v).data("id"),
                    description: $(v).find("span.o_pms_pwa_description")[0].innerText,
                    qty_to_invoice: $(v).find("span.o_pms_pwa_qty_to_invoice")[0].innerText,
                    included: $(v).find("input.o_pms_pwa_included")[0].checked,
                })
            });
            values.lines = lines;
            values.submit = true;

            ajax.jsonRpc("/reservation/"+ values.reservation_id +"/invoice", "call", {new_invoice: values}).then(function (reservation_data) {
                var reservation = JSON.parse(reservation_data);
                setTimeout(function () {
                    if (reservation.result == true) {
                        //$("#o_pms_pwa_partner_modal").modal("toggle");
                    } else {
                        self.displayDataAlert(reservation);
                    }
                }, 0);
            });
        },

    });

    return publicWidget.registry.PMSPWAPaymentFormWidget;
});
