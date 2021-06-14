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
    const date_options = {year: "numeric", month: "2-digit", day: "2-digit"};
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
            $(".o_pms_pwa_daterangepicker").daterangepicker(
                {
                    singleDatePicker: true,
                    showDropdowns: true,
                    autoUpdateInput: false,
                    minYear: 1901,
                    maxYear: parseInt(moment().format("YYYY"), 10),
                },
                function (start) {
                    this.element.val(start.format("DD/MM/YYYY"));
                }
            );

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
                    const start_date = new Date(start);
                    var checkin_date = start_date.toLocaleDateString(
                        document.documentElement.lang,
                        date_options
                    );
                    const end_date = new Date(end);
                    var checkout_date = end_date.toLocaleDateString(
                        document.documentElement.lang,
                        date_options
                    );
                    $('input[name="check_in_date"]').val(checkin_date);
                    $('input[name="check_out_date"]').val(checkout_date);

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
                    const start_date = new Date(start);
                    var checkin_date = start_date.toLocaleDateString(
                        document.documentElement.lang,
                        date_options
                    );
                    const end_date = new Date(end);
                    var checkout_date = end_date.toLocaleDateString(
                        document.documentElement.lang,
                        date_options
                    );
                    $('input[name="check_in_date"]').val(checkin_date);
                    $('input[name="check_out_date"]').val(checkout_date);
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
            $(".o_pms_pwa_daterangepicker").daterangepicker(
                {
                    singleDatePicker: true,
                    showDropdowns: true,
                    autoUpdateInput: false,
                    minYear: 1901,
                    maxYear: parseInt(moment().format("YYYY"), 10),
                },
                function (start) {
                    const start_date = new Date(start);
                    var checkin_date = start_date.toLocaleDateString(
                        document.documentElement.lang,
                        date_options
                    );
                    this.element.val(checkin_date);
                }
            );

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

                    const start_date = new Date(start);
                    var checkin_date = start_date.toLocaleDateString(
                        document.documentElement.lang,
                        date_options
                    );
                    const end_date = new Date(end);
                    var checkout_date = end_date.toLocaleDateString(
                        document.documentElement.lang,
                        date_options
                    );
                    $('input[name="check_in_date"]').val(checkin_date);
                    $('input[name="check_out_date"]').val(checkout_date);
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
                        format: "MM/DD/YYYY",
                        separator: " - ",
                        applyLabel: "Aplicar",
                        cancelLabel: "Cancelar",
                    },
                    opens: "left",
                    showCustomRangeLabel: false,
                },
                function (start, end, label) {

                    const start_date = new Date(start);
                    var checkin_date = start_date.toLocaleDateString(
                        document.documentElement.lang,
                        date_options
                    );
                    const end_date = new Date(end);
                    var checkout_date = end_date.toLocaleDateString(
                        document.documentElement.lang,
                        date_options
                    );
                    $('input[name="check_in_date"]').val(checkin_date);
                    $('input[name="check_out_date"]').val(checkout_date);
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

        const new_property = $(this).val();

        const allowed_pms_properties = $('input[name="allowed_properties"]').val();

        const pms_pids_array = allowed_pms_properties.split(",");
        const index = pms_pids_array.indexOf(new_property);
        if (index > -1) {
            pms_pids_array.splice(index, 1);
        }
        // Session.setPmsProperties(1, allowed_pms_property_ids);

        const new_pms_pids_order = new_property + "," + pms_pids_array.toString();
        document.cookie = "pms_pids=" + new_pms_pids_order;
        location.reload();
    });
});
