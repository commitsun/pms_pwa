odoo.define("pms_pwa.reservation_detail", function (require) {
    "use strict";
    require("web.dom_ready");
    var ajax = require("web.ajax");
    var reservation_ids = [];
    var invoice_lines = [];
    var core = require("web.core");
    var _t = core._t;
    var folio_id = $(
        "form#reservation_detail input[name='reservation_folio_id']"
    ).val();
    var reservation_id = $(
        "form#reservation_detail input[name='reservation_reservation_id']"
    ).val();

    // Calendario
    function new_displayDataAlert(result, data_id = false) {
        var data = JSON.parse(result);
        if (data && data.result === true) {
            data.type = "success";
        } else if (data && data.result === false) {
            data.type = "warning";
        } else {
            data.type = "warning";
            data.message = _t(
                "An undefined error has ocurred, please try again later."
            );
        }
        var alert_div = $(".o_pms_pwa_roomdoo_alerts");
        var alert = core.qweb.render("pms_pwa.reservation_alerts", {
            alert: data,
        });
        alert_div.append(alert);
        if (data_id) {
            self.reloadReservationInfo(data_id);
        }

        /* $(String("#reservation_" + data_id)).load(
            String(window.location.href + " #reservation_" + data_id + " td")
        ); */
    }

    $(function () {

        const date_options = {year: "numeric", month: "2-digit", day: "2-digit"};
        if (document.documentElement.lang === "es-ES") {
            $('input[name="range_check_date_detail_reservation"]').daterangepicker(
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
                    $('input[name="checkin"]').val(checkin_date);
                    $('input[name="checkout"]').val(checkout_date);
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
                    $("form#reservation_detail")
                        .find("input[name='nights']")
                        .trigger("change");
                }
            );
        } else {
            $('input[name="range_check_date_detail_reservation"]').daterangepicker(
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
                    $('input[name="checkin"]').val(checkin_date);
                    $('input[name="checkout"]').val(checkout_date);
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
                    $("form#reservation_detail")
                        .find("input[name='nights']")
                        .trigger("change");
                }
            );
        }
    });

    // Editor cantidad lineas factura
    $(document).on("click", ".editable", function (e) {
        var currentEle = $(this).attr("id");
        var initial_qty = $(this).data("qty");

        e.stopPropagation();

        $("#" + currentEle).html(
            '<input class="thVal o_pms_pwa_editinline" type="number" width="20" min="1" max="10" />'
        );
        $(".thVal").focus();
        $(".thVal").keyup(function (event) {
            if (event.keyCode === 13) {
                $("#" + currentEle).html(
                    $(".thVal").val().trim() + '<i class="fa fa-edit"></i>'
                );
                // Window.location.href = window.location.href;
            }
        });

        $(".thVal").focusout(function () {
            $("#" + currentEle).html(initial_qty + '<i class="fa fa-edit"></i>');
        });
    });

    // Cambios en listado de reservas asociadas
    $(document).on("change", "input[name='reservation_ids']", function () {
        var checked = $(this).val();
        if ($(this).is(":checked")) {
            reservation_ids.push(parseInt(checked, 10));
        } else {
            reservation_ids.splice(
                $.inArray(parseInt(checked, 10), reservation_ids),
                1
            );
        }
        ajax.jsonRpc("/reservation/reservation_lines", "call", {
            reservation_ids: reservation_ids,
            invoice_lines: false,
            folio_id: folio_id,
        }).then(function (data) {
            var lines = data.reservation_lines;
            $("#total_amount").html(parseFloat(data.total_amount).toFixed(2));
            var html = "";
            invoice_lines = [];
            for (const i in lines) {
                invoice_lines.push(parseInt(lines[i].id, 10));
                html +=
                    '<tr class="o_roomdoo_hide_show2" id="line' +
                    lines[i].id +
                    '">' +
                    '<td><input type="checkbox" checked="checked" name="invoice_line" value="' +
                    lines[i].id +
                    '" /></td>' +
                    "<td>" +
                    lines[i].name +
                    "</td>" +
                    "<td id='my" +
                    lines[i].id +
                    "' class='text-right editable' data-qty='" +
                    lines[i].qty_to_invoice +
                    "'>" +
                    lines[i].qty_to_invoice +
                    "<i class='fa fa-edit'></i></td>" +
                    "<td class='text-right'>" +
                    lines[i].qty_invoiced +
                    "/" +
                    lines[i].product_uom_qty +
                    "</td>" +
                    "<td class='text-right'>" +
                    parseFloat(lines[i].price_total).toFixed(2) +
                    "</td>" +
                    "</tr>";
            }
            $("#reservation_list").html(html);
        });
    });

    // Cambio en líneas de factura
    $(document).on("change", "input[name='invoice_line']", function () {
        var checked = $(this).val();
        if ($(this).is(":checked")) {
            invoice_lines.push(parseInt(checked, 10));
        } else {
            invoice_lines.splice($.inArray(parseInt(checked, 10), invoice_lines), 1);
        }
        ajax.jsonRpc("/reservation/reservation_lines", "call", {
            reservation_ids: reservation_ids,
            invoice_lines: invoice_lines,
            folio_id: folio_id,
        }).then(function (data) {
            $("#total_amount").html(parseFloat(data.total_amount).toFixed(2));
        });
    });

    // Cambios en formulario
    $("form#reservation_detail").on("change", "input, select", function (new_event) {
        var values = {};
        if (
            !new_event.currentTarget.checked &&
            new_event.currentTarget.dataset.service_id
        ) {
            values = {};
            values.del_service = new_event.currentTarget.dataset.service_id;
        } else if (new_event.currentTarget.name === "nights") {
            values = {reservation_id: reservation_id};
            values.checkin = $('input[name="checkin"]').val();
            values.checkout = $('input[name="checkout"]').val();
        } else {
            if (new_event.currentTarget.dataset.main_field) {
                var main_field = new_event.currentTarget.dataset.main_field;
                var field_id = new_event.currentTarget.dataset.field_id;
                values[main_field] = {};
                values[main_field][field_id] = {};
                if (new_event.currentTarget.dataset.subservice_name) {
                    var subservice_name =
                        new_event.currentTarget.dataset.subservice_name;
                    var subservice_field_id =
                        new_event.currentTarget.dataset.subservice_field_id;
                    values[main_field][field_id][subservice_name] = {};
                    values[main_field][field_id][subservice_name][
                        subservice_field_id
                    ] = {};
                    values[main_field][field_id][subservice_name][subservice_field_id][
                        new_event.currentTarget.name
                    ] = new_event.currentTarget.value;
                } else {
                    values[main_field][field_id][new_event.currentTarget.name] =
                        new_event.currentTarget.value;
                }
            } else {
                values[new_event.currentTarget.name] = new_event.currentTarget.value;
            }
            // Values = {reservation_id: reservation_id};
            // values[new_event.currentTarget.name] = new_event.currentTarget.value;
        }
        // Console.log("--->", new_event);
        // console.log("VAlue --->", values);
        if (new_event.currentTarget.name !== "range_check_date_detail_reservation") {
            ajax.jsonRpc(
                "/reservation/" + reservation_id + "/onchange_data",
                "call",
                values
            ).then(function (new_data) {
                // Console.log(new_data);
                if (!JSON.parse(new_data).result) {
                    new_displayDataAlert(new_data);
                } else {
                    $("#status").toggle();
                    $("#preloader").toggle();
                    window.location = window.location.href;
                }
            });
        }
    });
    $(function () {
        setTimeout(function () {
            $(".selectpicker").selectpicker();
        }, 500);
    });
    // Cargamos la página y las líneas
    $(document).ready(function () {

        // Mark all the reservations as checked and trigger the change
        $("input[name='reservation_ids']").prop('checked', true);
        $("input[name='reservation_ids']").trigger("change");

        // Show/hide contact at start
        $("select#partner_to_invoice").trigger("change");

        if ($("input[name='reservation_ids']:checked").val()) {
            reservation_ids.push(
                parseInt($("input[name='reservation_ids']:checked").val(), 10)
            );
        } else {
            reservation_ids.push(parseInt(reservation_id, 10));
        }
        ajax.jsonRpc("/reservation/reservation_lines", "call", {
            reservation_ids: reservation_ids,
            invoice_lines: false,
            folio_id: folio_id,
        }).then(function (data) {
            if (data.reservation_lines) {
                var lines = data.reservation_lines;
                $("#total_amount").html(parseFloat(data.total_amount).toFixed(2));
                var html = "";
                invoice_lines = [];
                for (const i in lines) {
                    invoice_lines.push(parseInt(lines[i].id, 10));
                    html +=
                        '<tr class="o_roomdoo_hide_show2" id="line' +
                        lines[i].id +
                        '">' +
                        '<td><input type="checkbox" checked="checked" name="invoice_line" value="' +
                        lines[i].id +
                        '" /></td>' +
                        "<td>" +
                        lines[i].name +
                        "</td>" +
                        "<td id='my" +
                        lines[i].id +
                        "' class='text-right editable' data-qty='" +
                        lines[i].qty_to_invoice +
                        "'>" +
                        lines[i].qty_to_invoice +
                        "<i class='fa fa-edit' ></i></td>" +
                        "<td class='text-right'>" +
                        lines[i].qty_invoiced +
                        "/" +
                        lines[i].product_uom_qty +
                        "</td>" +
                        "<td class='text-right'>" +
                        parseFloat(lines[i].price_total).toFixed(2) +
                        "</td>" +
                        "</tr>";
                }
                $("#reservation_list").html(html);
            }
        });

        // Cargamos pagos

        ajax.jsonRpc("/reservation/reservation_payments", "call", {
            folio_id: folio_id,
        }).then(function (data) {
            var html = "";
            if (data.payment_lines) {

                var lines = data.payment_lines;
                for (const i in lines) {
                    var options = "";
                    $.each(data.payment_methods, function (index, v) {
                        if (v.id === lines[i].journal_id.id) {
                            options +=
                                '<option selected="selected" value=' +
                                v.id +
                                ">" +
                                v.name +
                                "</option>";
                        } else {
                            options +=
                                "<option value=" + v.id + ">" + v.name + "</option>";
                        }
                    });
                    html +=

                        '<tr class="o_roomdoo_hide_show2" data-id=' +
                        lines[i].id +
                        ">" +
                        '<td class="o_pms_pwa_payment_edit"><i class="fa fa-edit" ></i></td>' +
                        '<td><select disabled="disabled" class="form-control o_website_form_input o_domain_leaf_operator_select o_input" name="payment_method">' +
                        options +
                        "</td>" +
                        '<td class="text-right">'+
                        '<script>'+
                            'var format = "dd/mm/yy";'+
                            '$( function() {'+
                                '$( "#paymentdate'+lines[i].id+'" ).datepicker({ dateFormat: format}).datepicker("setDate", '+moment(lines[i].date).format("DD/MM/YYYY")+');'+
                            '} );'+
                        '</script>'+
                        '<input disabled="disabled" id="paymentdate'+lines[i].id+'" type="text" name="date" class="datepicker"/></td>' +
                        '<td class="text-right"><input size="6" disabled="disabled" type="number" step="0.01" name="amount" value="' +
                        parseFloat(lines[i].amount).toFixed(2) +
                        '" /></td>' +
                        "</tr>";
                }
            } else {
                html = "<tr> No hay pagos registrados. </tr>";
            }
            $("#payments_list").html(html);

            // Activar o desactivar edición

            $("td.o_pms_pwa_payment_edit").on("click", function (ev) {
                console.log($(ev.currentTarget).parent().find('input[name="date"]').val());
                var fa = $(ev.currentTarget).find(".fa");
                if (fa[0].classList.contains("fa-edit")) {
                    $(ev.currentTarget)
                        .find(".fa-edit")
                        .removeClass("fa-edit")
                        .addClass("fa-floppy-o");
                    $(ev.currentTarget).parent().find("select").prop("disabled", false);
                    $(ev.currentTarget).parent().find("input").prop("disabled", false);
                } else if (fa[0].classList.contains("fa-floppy-o")) {
                    $(ev.currentTarget)
                        .find(".fa-floppy-o")
                        .removeClass("fa-floppy-o")
                        .addClass("fa-edit");
                    $(ev.currentTarget).parent().find("select").prop("disabled", true);
                    $(ev.currentTarget).parent().find("input").prop("disabled", true);

                    ajax.jsonRpc("/reservation/update_payment", "call", {
                        folio_id: folio_id,
                        id: $(ev.currentTarget).parent().attr("data-id"),
                        journal_id: $(ev.currentTarget)
                            .parent()
                            .find("select[name='payment_method'] option:selected")
                            .val(),
                        date: $(ev.currentTarget)
                            .parent()
                            .find('input[name="date"]')
                            .val(),
                        amount: $(ev.currentTarget)
                            .parent()
                            .find('input[name="amount"]')
                            .val(),
                    }).then(function (result) {
                        console.log("Result => ", result);
                        // Console.log(result);
                        if (JSON.parse(result).result) {
                            new_displayDataAlert(result);
                        } else {
                            $("#status").toggle();
                            $("#preloader").toggle();
                            window.location = window.location.href;
                        }
                    });
                }
            });
        });

        // Ver más/menos
        if ($(".o_roomdoo_hide_show").length > 3) {
            $(".o_roomdoo_hide_show:gt(2)").hide();
            $(".o_roomdoo_hide_show-more").show();
        }

        $(".o_roomdoo_hide_show-more").on("click", function () {
            // Toggle elements with class .o_roomdoo_hide_show that their index is bigger than 2
            $(".o_roomdoo_hide_show:gt(2)").toggle();
            // Change text of show more element just for demonstration purposes to this demo
            if ($(this).text() === "Ver más") {
                $(this).text("Ver menos");
            } else {
                $(this).text("Ver más");
            }
        });

        try {
            $("input[name^='o_pms_pwa_service_line_']").map(function () {
                var element_id = $(this).val();
                if (
                    $(String(".o_roomdoo_hide_show_service_" + element_id)).length > 3
                ) {
                    $(".o_roomdoo_hide_show_service_" + element_id + ":gt(2)").hide();
                    $(".o_roomdoo_hide_show-more2").show();
                }
                return false;
            });
            $(".o_roomdoo_hide_show-services-more").on("click", function () {
                var service_id = $(this).attr("data-service-id");
                $(".o_roomdoo_hide_show_service_" + service_id + ":gt(2)").toggle();
                // Change text of show more element just for demonstration purposes to this demo
                if ($(this).text() === "Ver más") {
                    $(this).text("Ver menos");
                } else {
                    $(this).text("Ver más");
                }
            });
        } catch (error) {
            console.log("Error ---", error);
        }
    });

    // Contacto de facturación
    $(document).on("change", "select#partner_to_invoice", function (ev) {
        if (ev.currentTarget.value != "False") {
            $("#collapseDatos form input[type!='hidden']").parent().addClass("d-none");
            $("#collapseDatos form div.o_pms_pwa_partner_modal_show").removeClass("d-none");
            $("#collapseDatos form div.o_pms_pwa_partner_modal_show")[0].dataset.partnerId = ev.currentTarget.value;
        } else {
            $("#collapseDatos form input[type!='hidden']").parent().removeClass("d-none");
            $("#collapseDatos form div.o_pms_pwa_partner_modal_show").addClass("d-none");
        }
    });

    // Método de pago
    $(document).on("click", "#invoice_button", function () {
        const reservation_data = [];
        const reservation_lines = [];
        const checkboxesChecked = [
            ...document.querySelectorAll("input[name=invoice_line]:checked"),
        ].map((e) => e.value);
        for (var i = 0; i < checkboxesChecked.length; i++) {
            var td_id = "#my" + checkboxesChecked[i];
            reservation_lines.push({
                id: parseInt(checkboxesChecked[i], 10),
                qty: parseInt($(td_id).text(), 10),
            });
        }
        var partner_id_value = $("#partner_to_invoice option:selected").val();
        var partner_id = isNaN(parseInt(partner_id_value, 10))
            ? false
            : parseInt(partner_id_value, 10);
        reservation_data.push({
            lines_to_invoice: [reservation_lines],
            partner_to_invoice: partner_id,
            partner_values: [
                {
                    name: $("input[name='invoice_name']").val(),
                    partner_id: $("input[name='partner_id']").val(),
                    vat: $("input[name='invoice_vat']").val(),
                    address: $("input[name='invoice_street']").val(),
                    postal_code: $("input[name='invoice_postal_code']").val(),
                    city: $("input[name='invoice_city']").val(),
                    country: $("input[name='invoice_country']").val(),
                    country_id: $("input[name='country_id']").val(),
                },
            ],
            payment_method: parseInt(
                $('input[name="payment_method"]:checked').val(),
                10
            ),
        });
        // Console.log(reservation_data);
        ajax.jsonRpc("/reservation/" + reservation_id + "/old_invoice", "call", {
            data: reservation_data,
            reservation_id: reservation_id,
        }).then(function (result) {
            // Console.log(result);
            var data = JSON.parse(result);
            if (data && data.result === true) {
                data.type = "success";
                window.location = window.location.href;
            } else if (data && data.result === false) {
                data.type = "warning";
            } else {
                data.type = "warning";
                data.message = _t(
                    "An undefined error has ocurred, please try again later."
                );
            }
            var alert_div = $(".o_pms_pwa_roomdoo_alerts");
            var alert = core.qweb.render("pms_pwa.reservation_alerts", {
                alert: data,
            });
            alert_div.append(alert);
            jQuery.ready();
        });
    });

    // Array de servicios
    $(document).on("click", ".o_pms_pwa_rb_remove", function (e) {
        var id = $(this).attr("data-id");
        var service_id = $(this).attr("data-service-id");
        var reservation_id_value = $(this).attr("data-reservation-id");
        // Var price_input_name = String("price_" + service_id + "_" + id);
        e.stopPropagation();
        var change_id_span = ".o_pms_pwa_rb_value_" + id;
        $(change_id_span).text(String(0));
        var service_ids = {};
        service_ids[service_id] = {};
        service_ids[service_id].service_line_ids = {};
        service_ids[service_id].service_line_ids[id] = {};
        service_ids[service_id].service_line_ids[id].day_qty = 0;
        ajax.jsonRpc(
            "/reservation/" + reservation_id_value + "/onchange_data",
            "call",
            {
                service_ids,
            }
        ).then(function (new_data) {
            console.log("new_data => ", new_data);
            const a = $("form.o_pms_pwa_reservation_form .price_total");
            a[0].innerHTML = JSON.parse(new_data).reservation.price_total;
            // Refresh pending amount
            try {
                const b = $("form.o_pms_pwa_reservation_form .pending_amount");
                b[0].innerHTML = JSON.parse(
                    new_data
                ).reservation.folio_pending_amount;
            } catch (error) {
                console.log(error);
            }
        });
    });
    // Editar servicios
    $("#o_pms_pwa_editModal").on("show.bs.modal", function (event) {
        var element = $(event.relatedTarget);
        var id = element.data("id");
        var service_id = String(element.data("service-id"));
        var reservation_id_value = String(element.data("reservation-id"));
        $(document).on("click", "#edit-modal-save", function () {
            var text_value = $("#new_val").val();
            var change_id_span = ".o_pms_pwa_rb_value_" + id;
            $(change_id_span).text(String(text_value));
            var service_ids = {};
            service_ids[service_id] = {};
            service_ids[service_id].service_line_ids = {};
            service_ids[service_id].service_line_ids[id] = {};
            service_ids[service_id].service_line_ids[id].day_qty = text_value;
            ajax.jsonRpc(
                "/reservation/" + reservation_id_value + "/onchange_data",
                "call",
                {
                    service_ids,
                }
            ).then(function (new_data) {
                const a = $("form.o_pms_pwa_reservation_form .price_total");
                a[0].innerHTML = JSON.parse(new_data).reservation.price_total;
                // Refresh pending amount
                try {
                    const b = $("form.o_pms_pwa_reservation_form .pending_amount");
                    b[0].innerHTML = JSON.parse(
                        new_data
                    ).reservation.folio_pending_amount;
                } catch (error) {
                    console.log(error);
                }
            });
            $("#o_pms_pwa_editModal").modal("toggle");
        });
    });

    $(".o_pms_pwa_button_print_checkin").on("click", function (new_event) {
        new_event.preventDefault();
        var button = new_event.currentTarget;
        var reservation_id = false;
        // Var reservation_ids = {};
        try {
            reservation_id = button.closest("tr").getAttribute("data-id");
        } catch (error) {
            try {
                reservation_id = button.getAttribute("data-id");
            } catch (error2) {
                reservation_id = $("input[name='id']").val();
            }
        }
        const url = "/checkins/pdf/" + reservation_id;
        // Open the window
        const printWindow = window.open(
            url,
            "Print",
            "left=200, top=200, width=950, height=500, toolbar=0, resizable=0"
        );
        printWindow.addEventListener(
            "load",
            function () {
                printWindow.print();
                setTimeout(function () {
                    printWindow.close();
                }, 500);
            },
            true
        );
    });

    // Nueva reserva
    $(document).on("click", "#o_pms_pwa_button_new_reservation", function (event) {
        event.preventDefault();
        var button = event.currentTarget;
        var new_res_folio_id = false;
        $(".o_pms_pwa_reservation_modal").modal("toggle");
        try {
            new_res_folio_id = button.getAttribute("data-folio_id");
        } catch (error) {
            console.log("error => ", error);
        }

        if (new_res_folio_id) {
            $("#o_pms_pwa_new_reservation_modal input[name='folio_id']").val(
                new_res_folio_id
            );
            $("button#button_reservation_modal").click();
        }
    });
});
