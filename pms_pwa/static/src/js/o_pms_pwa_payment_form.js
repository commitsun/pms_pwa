odoo.define("pms_pwa.payment_form", function (require) {
    "use strict";
    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    var publicWidget = require("web.public.widget");
    var csrf_token = core.csrf_token;
    const date_options = {year: "numeric", month: "2-digit", day: "2-digit"};

    publicWidget.registry.PaymentFormWidget = publicWidget.Widget.extend({
        selector: ".o_pms_pwa_modal_buttons",
        xmlDependencies: ["/pms_pwa/static/src/xml/pms_pwa_roomdoo_payment_form.xml"],
        events: {
            "click button.o_pms_pwa_button_facturar": "_onClickOpenPaymentForm",
        },
        _onClickOpenPaymentForm: function (event) {
            event.preventDefault();
            var button = event.currentTarget;
            var reservation_id = button.getAttribute("data-reservation_id");
            $(".o_pms_pwa_reservation_modal").modal("toggle");
            if(reservation_id){
                ajax.jsonRpc("/reservation/" + reservation_id + "/invoice", "call", {
                    reservation_id: reservation_id,
                }).then(function (data) {
                    console.log("recibo->>", data);
                    console.log("Abrir modal");
                });
            }else{
                console.log("ERROR, no hay reservation_id")
            }
        },
    });
    return publicWidget.registry.PaymentFormWidget;
});
