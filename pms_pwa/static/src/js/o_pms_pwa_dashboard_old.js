odoo.define("pms_pwa.dashboard", function () {
    "use strict";

    $(document).ready(function () {
        $.each(document.getElementsByClassName("o_pms_pwa_doughnut"), function (
            key,
            doughnut
        ) {
            new Chart(doughnut, {
                type: "doughnut",
                data: {
                    labels: doughnut.dataset.labels.split(","),
                    datasets: [
                        {
                            label: doughnut.dataset.label,
                            data: doughnut.dataset.data.split(","),
                            backgroundColor: doughnut.dataset.background_color.split(
                                ","
                            ),
                            borderColor: doughnut.dataset.border_color.split(","),
                            borderWidth: 1,
                        },
                    ],
                },
                options: {
                    legend: {
                        display: false,
                    },
                },
            });
        });

        $.each(document.getElementsByClassName("o_pms_pwa_line"), function (key, line) {
            new Chart(line, {
                type: "line",
                data: {
                    labels: line.dataset.labels.split(","),
                    datasets: [
                        {
                            label: line.dataset.label_1,
                            data: line.dataset.data_1.split(","),
                            backgroundColor: line.dataset.background_color_1.split(","),
                            borderColor: line.dataset.border_color_1.split(","),
                            borderWidth: 1,
                        },
                        {
                            label: line.dataset.label_2,
                            data: line.dataset.data_2.split(","),
                            backgroundColor: line.dataset.background_color_2.split(","),
                            borderColor: line.dataset.border_color_2.split(","),
                            borderWidth: 1,
                        },
                    ],
                },
                options: {
                    legend: {
                        position: "bottom",
                        align: "end",
                    },
                },
            });
        });

        $(document).on("click", "a.o_pms_pwa_accept_tasks", function (ev) {
            ev.preventDefault();
            var form = $('form[name="tasks"]');
            var form_field = form.find('input[type="hidden"]');
            var task_ids = [];
            $.each(form.find('input[type="checkbox"]:checked'), function (key, input) {
                task_ids.push(input.dataset.taskId);
            });
            form_field.val(task_ids);
            form.submit();
        });

        $(document).on("change", "input[name='arrival_date']", function () {
            var form = $('form[name="arrival_form"]');
            form.submit();
        });

        $(document).on("change", "input[name='departure_date']", function () {
            var form = $('form[name="departure_form"]');
            form.submit();
        });

        $(document).on("change", "input[name='rooms_date']", function () {
            var form = $('form[name="rooms_form"]');
            form.submit();
        });

        $("a.o_pms_pwa_clear_all").on("click", function (event) {
            event.preventDefault();
            console.log("Reloading...");
            location.reload();
        });
    });
});
