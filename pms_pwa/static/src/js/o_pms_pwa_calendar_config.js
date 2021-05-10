odoo.define("pms_pwa.calendar_config", function () {
    "use strict";
    $("#calendar_config_table").on("change", "input[type='text']", function () {
        this.style.backgroundColor = "yellow";
        var element = document.getElementById("save");
        console.log("-->¿?");
        element.classList.remove("d-none");
    });
});
