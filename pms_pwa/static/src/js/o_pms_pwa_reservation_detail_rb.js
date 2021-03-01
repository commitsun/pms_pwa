odoo.define("pms_pwa.reservation_detail", function(require) {
    "use strict";
    var rpc = require("web.rpc");
    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    var _t = core._t;
    var QWeb = core.qweb;
    var reservation_ids = [];
    var invoice_lines = [];
    var folio_id = $("input[name='folio_id']").val();
    var survey = [];
    // Bidimensional array: [ [1,3], [2,4] ]
    // Switcher function:
    $(".o_pms_pwa_rb_tab").click(function() {
        // Spot switcher:
        $(this)
            .parent()
            .find(".o_pms_pwa_rb_tab")
            .removeClass("o_pms_pwa_rb_tab_active");
        $(this).addClass("o_pms_pwa_rb_tab_active");
    });

    // Save data:
    $(".trigger").click(function() {
        // Empty array:
        survey = [];
        // Push data:
        for (var i = 1; i <= $(".o_pms_pwa_rb").length; i++) {
            // Var rb = "o_pms_pwa_rb" + i;
            var rbValue = parseInt(
                $("#o_pms_pwa_rb-" + i)
                    .find(".o_pms_pwa_rb_tab_active")
                    .attr("data-value"),
                0
            );
            // Bidimensional array push:
            survey.push([i, rbValue]);
            // Bidimensional array: [ [1,3], [2,4] ]
        }
    });
    $(document).on("click", ".editable", function(e) {
        var i = 0;
        var currentEle = $(this).attr("id");
        e.stopPropagation(); //<-------stop the bubbling of the event here
        var value = $("#" + currentEle).html();
        // console.log("Current Element is " + currentEle);

        $("#" + currentEle).html(
            '<input class="thVal o_pms_pwa_editinline" type="number" width="10" min="1" max="10" />'
        );
        $(".thVal").focus();
        $(".thVal").keyup(function(event) {
            if (event.keyCode == 13) {
                $("#" + currentEle).html(
                    $(".thVal")
                        .val()
                        .trim()
                );
            }
        });

        $(".thVal").focusout(function() {
            // you can use $('html')
            $("#" + currentEle).html(
                $(".thVal")
                    .val()
                    .trim()
            );
        });
    });
    $(document).on("change", "input[name='reservation_ids']", function() {
        var checked = $(this).val();
        if ($(this).is(":checked")) {
            reservation_ids.push(parseInt(checked));
        } else {
            reservation_ids.splice($.inArray(parseInt(checked), reservation_ids), 1);
        }
        ajax.jsonRpc("/reservation/reservation_lines", "call", {
            reservation_ids: reservation_ids,
            invoice_lines: false,
            folio_id: folio_id,
        }).then(function(data) {
            var lines = data["reservation_lines"];
            $("#total_amount").html(parseFloat(data["total_amount"]).toFixed(2));
            var i;
            var html = "";
            invoice_lines = [];
            for (i in lines) {
                invoice_lines.push(parseInt(lines[i].id));
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
                    "' class='text-right editable'>" +
                    lines[i].qty_to_invoice +
                    "</td>" +
                    "<td class='text-right'>" +
                    lines[i].qty_invoiced +
                    "</td>" +
                    "<td class='text-right'>" +
                    parseFloat(lines[i].price_total).toFixed(2) +
                    "</td>" +
                    "</tr>";
            }
            $("#reservation_list").html(html);
        });
    });
    $(document).on("change", "input[name='invoice_line']", function() {
        var checked = $(this).val();
        if ($(this).is(":checked")) {
            invoice_lines.push(parseInt(checked));
        } else {
            invoice_lines.splice($.inArray(parseInt(checked), invoice_lines), 1);
        }
        ajax.jsonRpc("/reservation/reservation_lines", "call", {
            reservation_ids: reservation_ids,
            invoice_lines: invoice_lines,
            folio_id: folio_id,
        }).then(function(data) {
            $("#total_amount").html(parseFloat(data["total_amount"]).toFixed(2));
        });
    });
    $(document).ready(function() {
        if ($("input[name='reservation_ids']:checked").val()) {
            reservation_ids.push(
                parseInt($("input[name='reservation_ids']:checked").val())
            );
        } else {
            reservation_ids.push(parseInt($("input[name='id']").val()));
        }
        ajax.jsonRpc("/reservation/reservation_lines", "call", {
            reservation_ids: reservation_ids,
            invoice_lines: false,
            folio_id: folio_id,
        }).then(function(data) {
            if (data["reservation_lines"]) {
                var lines = data["reservation_lines"];
                $("#total_amount").html(parseFloat(data["total_amount"]).toFixed(2));
                var i;
                var html = "";
                invoice_lines = [];
                for (i in lines) {
                    invoice_lines.push(parseInt(lines[i].id));
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
                        "' class='text-right editable'>" +
                        lines[i].qty_to_invoice +
                        "</td>" +
                        "<td class='text-right'>" +
                        lines[i].qty_invoiced +
                        "</td>" +
                        "<td class='text-right'>" +
                        parseFloat(lines[i].price_total).toFixed(2) +
                        "</td>" +
                        "</tr>";
                }
                $("#reservation_list").html(html);
            }
        });

        // setInterval(function () {
        //     $("#o_pms_pwa_direct_chat_messages").load(
        //         window.location.href + " #o_pms_pwa_direct_chat_messages"
        //     );
        // }, 3000);
        if ($(".o_roomdoo_hide_show").length > 3) {
            $(".o_roomdoo_hide_show:gt(2)").hide();
            $(".o_roomdoo_hide_show-more").show();
        }

        $(".o_roomdoo_hide_show-more").on("click", function() {
            //toggle elements with class .o_roomdoo_hide_show that their index is bigger than 2
            $(".o_roomdoo_hide_show:gt(2)").toggle();
            //change text of show more element just for demonstration purposes to this demo
            $(this).text() === "Show more"
                ? $(this).text("Show less")
                : $(this).text("Show more");
        });
        // if ($(".o_roomdoo_hide_show2").length > 3) {
        //     $(".o_roomdoo_hide_show2:gt(2)").hide();
        //     $(".o_roomdoo_hide_show-more2").show();
        // }

        // $(".o_roomdoo_hide_show-more2").on("click", function() {
        //     //toggle elements with class .o_roomdoo_hide_show that their index is bigger than 2
        //     $(".o_roomdoo_hide_show2:gt(2)").toggle();
        //     //change text of show more element just for demonstration purposes to this demo
        //     $(this).text() === "Show more"
        //         ? $(this).text("Show less")
        //         : $(this).text("Show more");
        // });
        //EDIT INLINE
    });
});
