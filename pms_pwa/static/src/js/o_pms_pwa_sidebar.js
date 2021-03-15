odoo.define("pms_pwa.sidebar", function () {
    "use strict";
    $("#menu-toggle").click(function (e) {
        e.preventDefault();
        $("body").toggleClass("toggled");
    });
    $("#menu-toggle2").click(function (e) {
        e.preventDefault();
        $("body").toggleClass("toggled");
    });
    // TOAST
    $(document).ready(function () {
        $(".toast").toast();
    });
    // DATE RANGE MODAL
    $(function () {
        $('input[name="range_check_date_modal"]').daterangepicker(
            {
                locale: {
                    direction: "ltr",
                    format: "DD/MM/YYYY",
                    separator: " - ",
                    applyLabel: "Aplicar",
                    cancelLabel: "Cancelar",
                    fromLabel: "Desde",
                    toLabel: "hasta",
                    customRangeLabel: "Custom",
                    daysOfWeek: ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"],
                    monthNames: [
                        "Enero",
                        "Febrero",
                        "Marzo",
                        "Abril",
                        "Mayo",
                        "Junio",
                        "Julio",
                        "Agosto",
                        "Septiembre",
                        "Octubre",
                        "Noviembre",
                        "Diciembre",
                    ],
                    firstDay: 1,
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
    });
});
