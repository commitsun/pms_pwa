odoo.define("pms_pwa.calendar_config", function () {
    "use strict";

    $(document).on("focusout", "input[type='text']", function () {
        this.style.backgroundColor = "yellow";
        var element = document.getElementById("save");
        element.classList.remove("d-none");
    });
});
