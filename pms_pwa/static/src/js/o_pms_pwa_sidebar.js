odoo.define("pms_pwa.sidebar", function () {
    "use strict";
    $("#menu-toggle").click(function (e) {
        e.preventDefault();
        $("body").toggleClass("toggled");
    });
});
