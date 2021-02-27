odoo.define("pms_pwa.reservation_detail", function(require) {
    "use strict";
    var rpc = require("web.rpc");
    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    var _t = core._t;
    var QWeb = core.qweb;
    var tmp = [];
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
        // Debug:
        // debug();
    });

    // Debug:
    /* -function debug() {
        var debug = "";
        for (i = 0; i < survey.length; i++) {
            debug += "Nº " + survey[i][0] + " = " + survey[i][1] + "\n";
        }
        alert(debug);
    }*/
    $("input[name='reservation_ids']").change(function() {
        var checked = $(this).val();
        if ($(this).is(":checked")) {
            tmp.push(parseInt(checked));
            ajax.jsonRpc("/reservation/reservation_lines", "call", {
                reservation_ids: tmp,
                invoice_lines: invoice_lines,
                folio_id: folio_id,
            }).then(function(data) {
                var lines = data["reservation_lines"];
                $("#total_amount").html(data["total_amount"]);
                var i;
                var html = "";
                for (i in lines) {
                    html +=
                        '<div class="row m-1 o_roomdoo_hide_show2" id="line' +
                        lines[i].id +
                        '">' +
                        '<div class="col-1"><input type="checkbox" checked="checked" name="invoice_line" value="' +
                        lines[i].id +
                        '" /></div>' +
                        '<div class="col-4">' +
                        lines[i].name +
                        "</div>" +
                        '<div class="col-2 right">' +
                        lines[i].qty_to_invoice +
                        "</div>" +
                        '<div class="col-2 right">' +
                        lines[i].qty_invoiced +
                        "</div>" +
                        '<div class="col-3 right">' +
                        lines[i].price_total +
                        "</div>" +
                        "</div>";
                }
                $("#reservation_list").html(html);
            });
        } else {
            tmp.splice($.inArray(parseInt(checked), tmp), 1);
            ajax.jsonRpc("/reservation/reservation_lines", "call", {
                reservation_ids: tmp,
                invoice_lines: invoice_lines,
                folio_id: folio_id,
            }).then(function(data) {
                var lines = data["reservation_lines"];
                $("#total_amount").html(data["total_amount"]);
                var i;
                var html = "";
                for (i in lines) {
                    html +=
                        '<div class="row m-1 o_roomdoo_hide_show2" id="line' +
                        lines[i].id +
                        '">' +
                        '<div class="col-1"><input type="checkbox" checked="checked" name="invoice_line" value="' +
                        lines[i].id +
                        '" /></div>' +
                        '<div class="col-4">' +
                        lines[i].name +
                        "</div>" +
                        '<div class="col-2 right">' +
                        lines[i].qty_to_invoice +
                        "</div>" +
                        '<div class="col-2 right">' +
                        lines[i].qty_invoiced +
                        "</div>" +
                        '<div class="col-3 right">' +
                        lines[i].price_total +
                        "</div>" +
                        "</div>";
                }
                $("#reservation_list").html(html);
            });
        }
    });
    $("input[name='invoice_line']").change(function() {
        console.log("EEEE");
        var checked = $(this).val();
        if ($(this).is(":checked")) {
            invoice_lines.push(parseInt(checked));
            ajax.jsonRpc("/reservation/reservation_lines", "call", {
                reservation_ids: tmp,
                invoice_lines: invoice_lines,
                folio_id: folio_id,
            }).then(function(data) {
                console.log("WEE", data);
                $("#total_amount").html(data["total_amount"]);
            });
        } else {
            invoice_lines.splice($.inArray(parseInt(checked), invoice_lines), 1);
            ajax.jsonRpc("/reservation/reservation_lines", "call", {
                reservation_ids: tmp,
                invoice_lines: invoice_lines,
                folio_id: folio_id,
            }).then(function(data) {
                console.log("WEE", data);
                $("#total_amount").html(data["total_amount"]);
            });
        }
        console.log("---> ", invoice_lines);
    });
    $(document).ready(function() {
        var checkboxes = document.getElementsByName("invoice_line");
        var checkboxesChecked = [];
        for (var i = 0; i < checkboxes.length; i++) {
            invoice_lines.push(parseInt(checkboxes[i].value));
        }
        if ($("input[name='reservation_ids']:checked").val()) {
            tmp.push(parseInt($("input[name='reservation_ids']:checked").val()));
        } else {
            tmp.push(parseInt($("input[name='id']").val()));
        }
        //- console.log("inicial", tmp);

        ajax.jsonRpc("/reservation/reservation_lines", "call", {
            reservation_ids: tmp,
            invoice_lines: invoice_lines,
            folio_id: folio_id,
        }).then(function(data) {
            console.log(data);
            if (data["reservation_lines"]) {
                var lines = data["reservation_lines"];
                $("#total_amount").html(data["total_amount"]);
                var i;
                var html = "";
                for (i in lines) {
                    html +=
                        '<div class="row m-1 o_roomdoo_hide_show2" id="line' +
                        lines[i].id +
                        '">' +
                        '<div class="col-1"><input type="checkbox" checked="checked" name="invoice_line" value="' +
                        lines[i].id +
                        '" /></div>' +
                        '<div class="col-4">' +
                        lines[i].name +
                        "</div>" +
                        '<div class="col-2 right">' +
                        lines[i].qty_to_invoice +
                        "</div>" +
                        '<div class="col-2 right">' +
                        lines[i].qty_invoiced +
                        "</div>" +
                        '<div class="col-3 right">' +
                        lines[i].price_total +
                        "</div>" +
                        "</div>";
                }
                $("#reservation_list").html(html);
            }
        });

        setInterval(function() {
            $("#o_pms_pwa_direct_chat_messages").load(
                window.location.href + " #o_pms_pwa_direct_chat_messages"
            );
        }, 3000);
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
    });
});
