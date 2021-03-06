odoo.define("pms_pwa.reservation_detail", function (require) {
    "use strict";
    require("web.dom_ready");
    var ajax = require("web.ajax");
    var reservation_ids = [];
    var invoice_lines = [];
    var core = require("web.core");
    var _t = core._t;
    var folio_id = $("input[name='folio_id']").val();
    var reservation_id = $("input[name='id']").val();

    // $(function () {
    //     if (document.documentElement.lang == "es-ES") {
    //         $('input[name="range_check_date_detail_reservation"]').daterangepicker(
    //             {
    //                 locale: {
    //                     direction: "ltr",
    //                     format: "DD/MM/YYYY",
    //                     separator: " - ",
    //                     applyLabel: "Aplicar",
    //                     cancelLabel: "Cancelar",
    //                 },
    //                 opens: "left",
    //                 showCustomRangeLabel: false,
    //             },
    //             function (start, end, label) {
    //                 $('input[name="check_in_date"]').val(start);
    //                 $('input[name="check_out_date"]').val(end);
    //                 let nights = 1;
    //                 // Hours*minutes*seconds*milliseconds
    //                 const oneDay = 24 * 60 * 60 * 1000;
    //                 const firstDate = new Date(start);
    //                 const secondDate = new Date(end);
    //                 const diffDays = Math.round(
    //                     Math.abs((firstDate - secondDate) / oneDay)
    //                 );
    //                 nights = diffDays - 1;
    //                 $('input[name="nights"]').val(nights);
    //                 // $("form#reservation_detail").submit();
    //             }
    //         );
    //     } else {
    //         $('input[name="range_check_date_detail_reservation"]').daterangepicker(
    //             {
    //                 locale: {
    //                     direction: "ltr",
    //                     format: "MM/DD/YYYY",
    //                     separator: " - ",
    //                 },
    //                 opens: "left",
    //                 showCustomRangeLabel: false,
    //             },
    //             function (start, end, label) {
    //                 $('input[name="check_in_date"]').val(start);
    //                 $('input[name="check_out_date"]').val(end);
    //                 let nights = 1;
    //                 // Hours*minutes*seconds*milliseconds
    //                 const oneDay = 24 * 60 * 60 * 1000;
    //                 const firstDate = new Date(start);
    //                 const secondDate = new Date(end);
    //                 const diffDays = Math.round(
    //                     Math.abs((firstDate - secondDate) / oneDay)
    //                 );
    //                 nights = diffDays - 1;
    //                 $('input[name="nights"]').val(nights);
    //                 // $("form#reservation_detail").submit();
    //             }
    //         );
    //     }
    // });

    // /
    $(document).on("click", ".editable", function (e) {
        var currentEle = $(this).attr("id");
        var initial_qty = $(this).data("qty");
        // <-------stop the bubbling of the event here

        e.stopPropagation();
        // Var id =

        $("#" + currentEle).html(
            '<input class="thVal o_pms_pwa_editinline" type="number" width="20" min="1" max="10" />'
        );
        $(".thVal").focus();
        $(".thVal").keyup(function (event) {
            if (event.keyCode === 13) {
                // Console.log("TODO OK")

                $("#" + currentEle).html(
                    $(".thVal").val().trim() + '<i class="fa fa-edit"></i>'
                );
            }
        });

        $(".thVal").focusout(function () {
            // You can use $('html')
            // console.log("error?");
            $("#" + currentEle).html(initial_qty + '<i class="fa fa-edit"></i>');
        });
    });
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
    $(document).on(
        "change",
        "form#reservation_detail input, form#reservation_detail select",
        function (new_event) {
            var values = {reservation_id: reservation_id};
            values[new_event.currentTarget.name] = new_event.currentTarget.value;
            ajax.jsonRpc("/reservation/onchange_data", "call", values).then(function (
                new_data
            ) {
                if (new_data) {
                    $.each(new_data, function (key, value) {
                        var input = $(
                            "form.o_pms_pwa_reservation_form input[name='" + key + "']"
                        );
                        if (input) {
                            input.val(value);
                        } else {
                            $(
                                "form.o_pms_pwa_reservation_form select[name='" +
                                    key +
                                    "'] option[value='" +
                                    value +
                                    "']"
                            ).prop("selected", true);
                        }
                    });
                }
            });
        }
    );
    // Daterangepicker
    $(document).ready(function () {
        if ($("input[name='reservation_ids']:checked").val()) {
            reservation_ids.push(
                parseInt($("input[name='reservation_ids']:checked").val(), 10)
            );
        } else {
            reservation_ids.push(parseInt($("input[name='id']").val(), 10));
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

        // SetInterval(function () {
        //     $("#o_pms_pwa_direct_chat_messages").load(
        //         window.location.href + " #o_pms_pwa_direct_chat_messages"
        //     );
        // }, 3000);
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
    $(document).on("click", "#payment_button", function () {
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
                    vat: $("input[name='invoice_vat']").val(),
                    address: $("input[name='invoice_street']").val(),
                    postal_code: $("input[name='invoice_postal_code']").val(),
                    city: $("input[name='invoice_city']").val(),
                    country: $("input[name='invoice_country']").val(),
                },
            ],
            payment_method: parseInt(
                $('input[name="payment_method"]:checked').val(),
                10
            ),
        });
        // Console.log(reservation_data);
        ajax.jsonRpc("/reservation/" + reservation_id + "/invoice", "call", {
            data: reservation_data,
            reservation_id: reservation_id,
        }).then(function (result) {
            // Console.log(result);
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
            jQuery.ready();
        });
    });
    // Nuevo por cambio de las bolitas
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
        service_ids[service_id].service_line_ids[id].qty = 0;
        ajax.jsonRpc(
            "/reservation/" + reservation_id_value + "/onchange_data",
            "call",
            {
                service_ids,
            }
        );
    });

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
            service_ids[service_id].service_line_ids[id].qty = text_value;
            ajax.jsonRpc(
                "/reservation/" + reservation_id_value + "/onchange_data",
                "call",
                {
                    service_ids,
                }
            );
            $("#o_pms_pwa_editModal").modal("toggle");
        });
    });
});
