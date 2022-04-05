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
            "click input.o_pms_pwa_search_partner": "_initPartnerAutocomplete",
            "click input.o_pms_pwa_search_country_name": "_initCountryAutocomplete",
            "change input": "_onChangeInput",
            "click .o_pms_pwa_return": "_onClickReturn",
        },

        init: function () {
            this._super.apply(this, arguments);
        },

        start: function () {
            var self = this;
            return this._super.apply(this, arguments);
        },

        _getPartnerValues: function () {
            var form = $("form.o_pms_pwa_payment_form");
            var partner_id = false;
            var invoice_country_id = false;
            var invoice_state_id = false;
            if(form.find("input[name='partner']")[0].value) {
                partner_id = parseInt(form.find("input[name='partner']")[0].value);
            }
            if(form.find("input[name='partner_invoice_country_id']")[0].value) {
                invoice_country_id = parseInt(form.find("input[name='partner_invoice_country_id']")[0].value);
            }
            if(form.find("input[name='partner_invoice_state_id']")[0].value) {
                invoice_state_id = parseInt(form.find("input[name='partner_invoice_state_id']")[0].value);
            }
            
            var partner = {
                id: partner_id,
                partner_type: form.find("select#partner_type_change")[0].value,
                vat: form.find("input[name='vat']")[0].value,
                name: form.find("input[name='partner_name']")[0].value,
                invoice_street: form.find("input[name='partner_invoice_street']")[0].value,
                invoice_zip: form.find("input[name='partner_invoice_zip']")[0].value,
                invoice_country_id: invoice_country_id,
                invoice_country_name: form.find("input[name='partner_invoice_country_name']")[0].value,
                invoice_state_id: invoice_state_id,
                invoice_city: form.find("input[name='partner_invoice_city']")[0].value,
                email: form.find("input[name='partner_email']")[0].value,
                mobile: form.find("input[name='partner_mobile']")[0].value,
                mobile: form.find("input[name='partner_mobile']")[0].value, 
            }
            return partner;
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
                    var data = JSON.parse(data);
                    var html = core.qweb.render("pms_pwa.pms_pwa_roomdoo_payment_form", {
                        data: data.wizard_invoice,
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
            var values = {};
            var reservation_id = $("form.o_pms_pwa_payment_form").find("input[name='reservation_id']")[0].value
            values.partner = self._getPartnerValues();
            var lines_to_invoice = $(".o_pms_pwa_lines_to_invoice");
            var lines = [];
            $.each(lines_to_invoice, function (i, v) {
                lines.push({
                    id: $(v).data("id"),
                    description: $(v).find("span.o_pms_pwa_description")[0].innerText,
                    qty_to_invoice: parseFloat($(v).find("span.o_pms_pwa_qty_to_invoice")[0].innerText),
                    included: $(v).find("input.o_pms_pwa_included")[0].checked,
                    max_qty: parseFloat($(v).find("span.o_pms_pwa_max_qty")[0].innerText),
                    amount: parseFloat($(v).find("span.o_pms_pwa_amount")[0].innerText),
                })
            });
            values.lines = lines;
            values.submit = true;

            ajax.jsonRpc("/reservation/"+ reservation_id +"/invoice", "call", {new_invoice: values}).then(function (reservation_data) {
                var reservation = JSON.parse(reservation_data);
                setTimeout(function () {
                    if (reservation.result == true) {
                        self._reloadModal();
                    } else {
                        self.displayDataAlert(reservation);
                    }
                }, 0);
            });
        },

        _initPartnerAutocomplete: function () {
            $("form.o_pms_pwa_payment_form .o_pms_pwa_search_partner").autocomplete({
                source: function (request, response) {
                    let supplier = false;
                    let input = $("input[name=partner_name]");
                    try{
                        if(input[1].attributes["data-supplier"]){
                            supplier = true;
                        }
                    }catch{
                        supplier = false;
                    }
                    $.ajax({
                        url: "/partner/search",
                        method: "GET",
                        dataType: "json",
                        data: {keywords: request.term, category: false, supplier: supplier},
                        success: function (data) {
                            response(
                                $.map(data, function (item) {
                                    return {
                                        label:
                                            (item.type === "c" ? "Category: " : "") +
                                            item.name,
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
                    if (term && term.item) {
                        $(suggestion.target.parentElement)
                            .find('input[name="partner"]')
                            .val(term.item.id);
                        setTimeout(function () {
                            $(suggestion.target.parentElement)
                                .find('input[name="partner"]')
                                .trigger("change");
                        }, 100);
                    }
                },
                minLength: 1,
            });
        },

        _initCountryAutocomplete: function () {
            $("form.o_pms_pwa_payment_form input.o_pms_pwa_search_country_name").autocomplete({
                source: function (request, response) {
                    $.ajax({
                        url: "/pms_checkin_partner/search",
                        method: "GET",
                        dataType: "json",
                        data: {keywords: request.term, model: "res.country", id: null},
                        success: function (data) {
                            response(
                                $.map(data, function (item) {
                                    return {
                                        label:
                                            (item.type === "c" ? "Category: " : "") +
                                            item.name,
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
                    if (term && term.item) {
                        $(suggestion.target.parentElement)
                            .find('input[name="partner_invoice_country_id"]')
                            .val(term.item.id);
                    }
                },
                minLength: 1,
            });
        },

        _onChangeInput: function (event) {
            event.preventDefault();
            var self = this;
            var reservation_id = $("form.o_pms_pwa_payment_form").find("input[name='reservation_id']")[0].value;
            var values = {};
            values.partner = self._getPartnerValues();
            var lines_to_invoice = $(".o_pms_pwa_lines_to_invoice");
            var lines = [];
            $.each(lines_to_invoice, function (i, v) {
                lines.push({
                    id: $(v).data("id"),
                    description: $(v).find("span.o_pms_pwa_description")[0].innerText,
                    qty_to_invoice: parseFloat($(v).find("span.o_pms_pwa_qty_to_invoice")[0].innerText),
                    included: $(v).find("input.o_pms_pwa_included")[0].checked,
                    max_qty: parseFloat($(v).find("span.o_pms_pwa_max_qty")[0].innerText),
                    amount: parseFloat($(v).find("span.o_pms_pwa_amount")[0].innerText),
                })
            });
            values.lines = lines;

            ajax.jsonRpc("/reservation/"+ reservation_id +"/invoice", "call", {new_invoice: values}).then(function (reservation_data) {
                setTimeout(function () {
                    var reservation = JSON.parse(reservation_data);
                    if (reservation.result == true) {
                        if (reservation && reservation.wizard_invoice && reservation.wizard_invoice.partner) {
                            this._updateFields(reservation.wizard_invoice.partner);
                        }
                    } else {
                        self.displayDataAlert(reservation);
                    }
                }, 0);
            });
        },

        _reloadModal: function () {
            console.log("reload");
            var self = this;
            $(".pms_pwa_roomdoo_payment_form").modal("toggle");
            
            var reservation_id = parseInt($("form.o_pms_pwa_payment_form input[name='reservation_id']")[0].value);

            if (reservation_id) {
                ajax.jsonRpc("/reservation/" + reservation_id + "/invoice", "call", {
                    reservation_id: reservation_id,
                }).then(function (data) {
                    var data = JSON.parse(data);
                    var html = core.qweb.render("pms_pwa.pms_pwa_roomdoo_payment_form", {
                        data: data.wizard_invoice,
                    });
                    $("div.pms_pwa_roomdoo_payment_form").html(html);
                    $("div.pms_pwa_roomdoo_payment_form").modal();
                });
            } else {
                console.log("ERROR, no hay reservation_id");
            }
        },

        _onClickReturn: function (event) {
            console.log("return");
            $("div.pms_pwa_roomdoo_payment_form").modal("toggle");
            try {
                var reservation_id = event.currentTarget.getAttribute("data-id");
                var selector =
                    "tr[data-id=" +reservation_id +"]";
                var test = $(selector).find(
                    "td.first-col"
                );
                if (test.length != 0) {
                    test.click();
                } else {
                    // abre modal
                    var selector =
                        "td[data-id=" +reservation_id +"]";
                    if ($(selector).length > 0) {
                        $(selector).click();
                    } else {
                        var new_selector = $(
                            "<td class='launch_modal' data-id='" +
                            reservation_id +
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
        },

        _updateFields: function(data) {
            console.log("data => ", data);
            $.each(new_data, function (key, value) {
                var input = $("form.o_pms_pwa_payment_form input[name='" + key + "']");
                if (input.length > 0) {
                    input.val(value);
                } else {
                    try {
                        $(
                            "form.o_pms_pwa_payment_form select[name='" +
                                key +
                                "'] option[value='" +
                                value +
                                "']"
                        ).prop("selected", true);
                    } catch (error) {
                        console.log(error);
                    }
                }
                delete new_data[value];
            });
        },

    });

    return publicWidget.registry.PMSPWAPaymentFormWidget;
});
