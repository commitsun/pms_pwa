odoo.define("pms_pwa.partner_form", function (require) {
    "use strict";

    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    var _t = core._t;
    var publicWidget = require("web.public.widget");

    publicWidget.registry.PartnerFormWidget = publicWidget.Widget.extend({
        selector: "#wrapwrap",
        xmlDependencies: ["/pms_pwa/static/src/xml/pms_pwa_roomdoo_partner_modal.xml"],
        events: {
            "click div.o_pms_pwa_partner_modal_show": "_onClickOpenPartnerModal",
            "change select[name=country_id]": "_onChangeCountryId",
            "click button.send_form_partner": "_submitForm",
        },

        init: function () {
            this._super.apply(this, arguments);
            this.allowed_fields = ["allowed_country_ids", "allowed_states"];
            this.m2o_fields = ["country_id", "state_id", "nationality_id"];
        },

        start: function () {
            var self = this;
            return this._super.apply(this, arguments);
        },

        displayContent: function (xmlid, render_values) {
            var html = core.qweb.render(xmlid, render_values);
            $("div.o_pms_pwa_roomdoo_partner_modal").html(html);
            $("div.o_pms_pwa_partner_modal").modal();
        },

        displayDataAlert: function (data) {
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

        formToJson: function (formData) {
            var form_object = {};
            $.each(formData, function (i, v) {
                if (v.value != "false") {
                    form_object[v.name] = v.value;
                }
            });
            return form_object;
        },

        _updateFormFields: function (form_fields) {
            var self = this;

            // Allowed fields
            $.each(self.allowed_fields, function (key, value) {
                try {
                    var select = $('form#partner_form [data-select="' + value + '"]');
                } catch (error) {
                    console.log(error);
                }
                if (select.length != 0) {
                    select.empty();
                    $.each(form_fields[value], function (subkey, subvalue) {
                        var option = new Option(
                            subvalue.name,
                            subvalue.id,
                            false,
                            false
                        );
                        $(option).html(subvalue.name);
                        select.append(option);
                    });

                    delete form_fields[value];
                }
            });

            // Regular fields
            $.each(form_fields, function (key, value) {
                var input = $("form#partner_form input[name='" + key + "']");
                if (input.length != 0) {
                    input.val(value);
                } else if (self.m2o_fields.includes(key)) {
                    $(
                        "form#partner_form select[name='" +
                            key +
                            "'] option[value='" +
                            value.id +
                            "']"
                    ).prop("selected", true);
                } else {
                    $(
                        "form#partner_form select[name='" +
                            key +
                            "'] option[value='" +
                            value +
                            "']"
                    ).prop("selected", true);
                }
            });
        },

        _onClickOpenPartnerModal: function (event) {
            event.preventDefault();
            var self = this;
            var partner_id = event.currentTarget.getAttribute("data-partner-id");
            var reservation_id = event.currentTarget.getAttribute(
                "data-reservation-id"
            );

            var partner_data = false;
            /* RPC call to get the reservation data */
            ajax.jsonRpc("/partner/" + partner_id, "call", {
                reservation_id: reservation_id,
            }).then(function (partner_data) {
                setTimeout(function () {
                    if (partner_data.result == true) {
                        console.log("partner_data.result ---------> ", partner_data.partner);
                        $("div.o_pms_pwa_reservation_modal").modal("toggle");
                        self.displayContent("pms_pwa.roomdoo_partner_modal", {
                            partner: partner_data.partner,
                        });
                        self._dateRangeActive();
                    } else {
                        self.displayDataAlert(partner_data);
                    }
                }, 0);
            });
        },

        _submitForm: function (event) {
            event.preventDefault();
            var self = this;
            var values = $("form#partner_form").serializeArray();
            values = this.formToJson(values);
            values.submit = true;
            console.log("values --->", values);
            /* RPC call to get the reservation data */
            ajax.jsonRpc("/new_partner/", "call", values).then(function (partner_data) {
                setTimeout(function () {
                    if (partner_data.result == true) {
                        console.log("partner_data.result ---------> ", partner_data.partner);
                        self._updateFormFields(partner_data.partner);
                    } else {
                        self.displayDataAlert(partner_data);
                    }
                }, 0);
            });
        },

        _onChangeCountryId: function (event) {
            event.preventDefault();
            var self = this;
            var values = $("form#partner_form").serializeArray();
            values = this.formToJson(values);

            ajax.jsonRpc("/new_partner/", "call", values).then(function (partner_data) {
                partner_data = JSON.parse(partner_data);
                setTimeout(function () {
                    if (partner_data) {
                        self._updateFormFields(partner_data);
                    }
                }, 0);
            });
        },

        _dateRangeActive: function () {
            $("form#partner_form input.o_pms_pwa_datepicker").datepicker({
                format: "dd/mm/yyyy",
            });
        },
    });

    return publicWidget.registry.PartnerFormWidget;
});
