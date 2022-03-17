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
            "click .o_pms_pwa_new_partner_modal_show": "_onClickNewPartnerModal",
            "change select#partner_type_change": "_onPartnerTypeChange",
            "click button.send_form_partner": "_submitForm",
        },

        init: function () {
            this._super.apply(this, arguments);
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
        _onClickNewPartnerModal: function (event) {
            event.preventDefault();
            var self = this;
            var partner_data = false;
            $('.modal').modal('hide');
            /* RPC call to get the reservation data */
            ajax.jsonRpc("/new_partner", "call", {
            }).then(function (partner_data) {
                setTimeout(function () {
                    if (partner_data) {
                        $("div.o_pms_pwa_reservation_modal").modal("toggle");
                        self.displayContent("pms_pwa.roomdoo_partner_modal", {
                            partner: partner_data,
                        });
                        if(partner_data.partner_type == "person"){

                            $(".is_agency").hide();
                            $(".is_company").hide();
                            $(".is_person").show();
                        }else{
                            if(partner_data.partner_type == "company"){
                                $(".is_person").hide();
                                $(".is_agency").hide();
                                $(".is_company").show();
                            }else{
                                $(".is_person").hide();
                                $(".is_company").show();
                                $(".is_agency").show();
                            }
                        }
                        self._dateRangeActive();
                        self._searchCountry();
                        self._searchState();
                    } else {
                        self.displayDataAlert(partner_data);
                    }
                }, 0);
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
                        $("div.o_pms_pwa_reservation_modal").modal("toggle");
                        self.displayContent("pms_pwa.roomdoo_partner_modal", {
                            partner: partner_data.partner,
                        });

                        if(partner_data.partner.partner_type == "person"){

                            $(".is_agency").hide();
                            $(".is_company").hide();
                            $(".is_person").show();
                        }else{
                            if(partner_data.partner.partner_type == "company"){
                                $(".is_person").hide();
                                $(".is_agency").hide();
                                $(".is_company").show();
                            }else{
                                $(".is_person").hide();
                                $(".is_company").show();
                                $(".is_agency").show();
                            }
                        }
                        self._dateRangeActive();
                        self._searchCountry();
                        self._searchState();
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
            /* RPC call to get the reservation data */
            if(values.partney_type != 'person'){
                values.firstname = values.company_name;
            }
            ajax.jsonRpc("/new_partner/", "call", values).then(function (partner_data) {
                setTimeout(function () {
                    if (partner_data.result == true) {
                        $("#o_pms_pwa_partner_modal").modal("toggle");
                    } else {
                        self.displayDataAlert(partner_data);
                    }
                }, 0);
            });
        },
        _dateRangeActive: function () {
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
                    const start_date = new Date(start);
                    var select_date = start_date.toLocaleDateString(
                        document.documentElement.lang,
                        {year: "numeric", month: "2-digit", day: "2-digit"}
                    );
                    this.element.val(select_date);
                }
            );
        },
        _searchCountry: function () {
            $(".o_pms_pwa_search_country_name").autocomplete({
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
                            .find('.country')
                            .val(term.item.id);
                    }
                },
                minLength: 1,
            });
        },
        _searchState: function(){
            $(".o_pms_pwa_search_state_name").autocomplete({
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
                            .find('.state')
                            .val(term.item.id);
                    }
                },
                minLength: 1,
            });
        },
        _onPartnerTypeChange: function (event) {
            event.preventDefault();
            var self = this;
            let select_value = $("select#partner_type_change").val();
            if(select_value  == "person"){
                $(".is_agency").hide();
                $(".is_company").hide();
                $(".is_person").show();
            }else{
                if(select_value == "company"){
                    $(".is_person").hide();
                    $(".is_agency").hide();
                    $(".is_company").show();
                }else{
                    $(".is_person").hide();
                    $(".is_company").show();
                    $(".is_agency").show();
                }
            }
        },
    });

    return publicWidget.registry.PartnerFormWidget;
});
