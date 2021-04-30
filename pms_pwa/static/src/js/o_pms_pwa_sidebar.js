odoo.define("pms_pwa.sidebar", function () {
    "use strict";
    // Var session = require("pms.session");

    $("#menu-toggle").click(function (e) {
        e.preventDefault();
        $("body").toggleClass("toggled");
    });
    $("#menu-toggle2").click(function (e) {
        e.preventDefault();
        $("body").toggleClass("toggled");
    });
    // TOAST
    $(document).on("click", ".o_pms_pwa_toast-close", function (event) {
        // Console.log("close toast");
        event.stopPropagation();
        event.stopImmediatePropagation();
        $(".toast").toast("hide");
    });

    // DATE RANGE MODAL
    $(function () {
        if (document.documentElement.lang === "es-ES") {
            $('input[name="range_check_date_modal_reservation"]').daterangepicker(
                {
                    locale: {
                        direction: "ltr",
                        format: "DD/MM/YYYY",
                        separator: " - ",
                        applyLabel: "Aplicar",
                        cancelLabel: "Cancelar",
                    },
                    opens: "left",
                    showCustomRangeLabel: false,
                },
                function (start, end, label) {
                    console.log(label);
                    $('input[name="check_in_date"]').val(start);
                    $('input[name="check_out_date"]').val(end);
                    let nights = 1;
                    // Hours*minutes*seconds*milliseconds
                    const oneDay = 24 * 60 * 60 * 1000;
                    const firstDate = new Date(start);
                    const secondDate = new Date(end);
                    const diffDays = Math.round(
                        Math.abs((firstDate - secondDate) / oneDay)
                    );
                    nights = diffDays - 1;
                    $('input[name="nights"]').val(nights);
                    // $("form#reservation_detail").submit();
                }
            );
            $('input[name="range_check_date_modal_reservation_multi"]').daterangepicker(
                {
                    locale: {
                        direction: "ltr",
                        format: "DD/MM/YYYY",
                        separator: " - ",
                        applyLabel: "Aplicar",
                        cancelLabel: "Cancelar",
                    },
                    opens: "left",
                    showCustomRangeLabel: false,
                },
                function (start, end, label) {
                    console.log(label);
                    $('input[name="check_in_date"]').val(start);
                    $('input[name="check_out_date"]').val(end);
                    let nights = 1;
                    // Hours*minutes*seconds*milliseconds
                    const oneDay = 24 * 60 * 60 * 1000;
                    const firstDate = new Date(start);
                    const secondDate = new Date(end);
                    const diffDays = Math.round(
                        Math.abs((firstDate - secondDate) / oneDay)
                    );
                    nights = diffDays - 1;
                    $('input[name="nights"]').val(nights);
                    // $("form#reservation_detail").submit();
                }
            );
        } else {
            $('input[name="range_check_date_modal_reservation"]').daterangepicker(
                {
                    locale: {
                        direction: "ltr",
                        format: "MM/DD/YYYY",
                        separator: " - ",
                    },
                    opens: "left",
                    showCustomRangeLabel: false,
                },
                function (start, end, label) {
                    console.log(label);
                    $('input[name="check_in_date"]').val(start);
                    $('input[name="check_out_date"]').val(end);
                    let nights = 1;
                    // Hours*minutes*seconds*milliseconds
                    const oneDay = 24 * 60 * 60 * 1000;
                    const firstDate = new Date(start);
                    const secondDate = new Date(end);
                    const diffDays = Math.round(
                        Math.abs((firstDate - secondDate) / oneDay)
                    );
                    nights = diffDays - 1;
                    $('input[name="nights"]').val(nights);
                    // $("form#reservation_detail").submit();
                }
            );
            $('input[name="range_check_date_modal_reservation_multi"]').daterangepicker(
                {
                    locale: {
                        direction: "ltr",
                        format: "DD/MM/YYYY",
                        separator: " - ",
                        applyLabel: "Aplicar",
                        cancelLabel: "Cancelar",
                    },
                    opens: "left",
                    showCustomRangeLabel: false,
                },
                function (start, end, label) {
                    console.log(label);
                    $('input[name="check_in_date"]').val(start);
                    $('input[name="check_out_date"]').val(end);
                    let nights = 1;
                    // Hours*minutes*seconds*milliseconds
                    const oneDay = 24 * 60 * 60 * 1000;
                    const firstDate = new Date(start);
                    const secondDate = new Date(end);
                    const diffDays = Math.round(
                        Math.abs((firstDate - secondDate) / oneDay)
                    );
                    nights = diffDays - 1;
                    $('input[name="nights"]').val(nights);
                    // $("form#reservation_detail").submit();
                }
            );
        }
    });

    $(document).on("change", "#o_pms_pwa_user_property", function () {
        // Console.log("AQUI CAMBIAR LAS COOKIES");
        const new_property = $(this).val();
        // Console.log(new_property);
        const allowed_pms_properties = $('input[name="allowed_properties"]').val();
        // Console.log(allowed_pms_properties);
        const pms_pids_array = allowed_pms_properties.split(",");
        const index = pms_pids_array.indexOf(new_property);
        if (index > -1) {
            pms_pids_array.splice(index, 1);
        }
        // Session.setPmsProperties(1, allowed_pms_property_ids);

        const new_pms_pids_order = new_property + "," + pms_pids_array.toString();
        // Console.log(new_pms_pids_order);
        document.cookie = "pms_pids=" + new_pms_pids_order;
        location.reload();
    });
});
