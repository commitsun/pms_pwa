// DATE RANGE MODAL
$(function () {
    $('input[name="range_check_date_modal"]').daterangepicker(
        {
            if(document.documentElement.lang == "es-ES") {
                locale: {
                    direction: "ltr",
                    format: "DD/MM/YYYY",
                    separator: " - ",
                    applyLabel: "Aplicar",
                    cancelLabel: "Cancelar",
                }
            }else{
                locale: {
                    direction: "ltr",
                    format: "MM/DD/YYYY",
                    separator: " - ",
                }
            }
            // locale: {
            //     direction: "ltr",
            //     format: "DD/MM/YYYY",
            //     separator: " - ",
            //     applyLabel: "Aplicar",
            //     cancelLabel: "Cancelar",
            //     fromLabel: "Desde",
            //     toLabel: "hasta",
            //     customRangeLabel: "Custom",
            //     daysOfWeek: ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"],
            //     monthNames: [
            //         "Enero",
            //         "Febrero",
            //         "Marzo",
            //         "Abril",
            //         "Mayo",
            //         "Junio",
            //         "Julio",
            //         "Agosto",
            //         "Septiembre",
            //         "Octubre",
            //         "Noviembre",
            //         "Diciembre",
            //     ],
            //     firstDay: 1,
            // },

            opens: "left",
            showCustomRangeLabel: false,
        },
        function (start, end, label) {
            console.log("ER PEPEP 2");
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
