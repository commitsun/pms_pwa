odoo.define("pms_pwa.calendar_config", function () {
    "use strict";

    $(document).on("focusout", "input[type='text']", function () {
        console.log("Salgo");
    });
});
