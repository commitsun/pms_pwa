odoo.define("pms_pwa.reservation_detail", function() {
    "use strict";

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
    /* Refresh chat */
    $(document).ready(function() {
        setInterval(function() {
            $("#o_pms_pwa_direct_chat_messages").load(
                window.location.href + " #o_pms_pwa_direct_chat_messages"
            );
        }, 3000);
    });
});
