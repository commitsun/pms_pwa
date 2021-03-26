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
    });
});
