odoo.define("pms_pwa.calendar", function () {
    "use strict";
    $(".collapse").on("show.bs.collapse", function () {
        $(".collapse.in").collapse("hide");
    });
});
