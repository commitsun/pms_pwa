odoo.define("pms_pwa.multi_reservation_modal", function (require) {
    "use strict";
    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    // var PortalSidebar = require('portal.PortalSidebar');
    var _t = core._t;
    var publicWidget = require("web.public.widget");
    var csrf_token = core.csrf_token;
    const date_options = {year: "numeric", month: "2-digit", day: "2-digit"};
    $("#multi_reservation_modal").on("change", "input, select", function (new_event) {
        var reservation_id = new_event.currentTarget.closest("tr").getAttribute("data-id");
        console.log(reservation_id);
        var values = {};
        // Set checkin & checkout separated
        if (
            new_event.currentTarget.name ==
                "range_check_date_modal"
        ) {
            let value_range_picker =
                new_event.currentTarget.value;
            values.checkin = value_range_picker.split(" - ")[0];
            values.checkout = value_range_picker.split(" - ")[1];
        } else {
            values[new_event.currentTarget.name] = new_event.currentTarget.value;
        }
        ajax.jsonRpc(
            "/reservation/" + reservation_id + "/onchange_data",
            "call",
            values
        ).then(function (new_data) {
            if (new_data) {
                if (!JSON.parse(new_data).result) {
                    self.displayDataAlert(new_data);
                }
            }
        });
    });
});
