odoo.define("pms_pwa.reservation_list", function() {
    "use strict";
    $(document).ready(function() {
        // -------------------------------------//
        // init Infinite Scroll
        var $container = $(".o_pms_pwa_reservation_scroll").infiniteScroll({
            path: ".o_pms_pwa_reservation_list_pagination_next",
            append: ".o_pms_pwa_reservation",
            hideNav: ".o_pms_pwa_reservation_list_pagination",
            loadOnScroll: false,
            status: ".page-load-status",
            debug: false,
        });

        $container.on( 'append.infiniteScroll', function( event, response, path, items ) {
            var current_items_length = parseInt($('.o_pms_pwa_navbar_counter').text());
            $('.o_pms_pwa_navbar_counter').text(current_items_length + items.length);
        });

        $("#wrapwrap").scroll(function() {
            $(".o_pms_pwa_reservation_list_table").each(function() {
                var bottom_of_object = $(this).offset().top + $(this).outerHeight();
                var bottom_of_window =
                    $("#wrapwrap").scrollTop() + $("#wrapwrap").height();
                /* If the object is completely visible in the window, fade it it */
                if (bottom_of_window > bottom_of_object) {
                    $container.infiniteScroll("loadNextPage");
                    // Console.log("New page");
                }
            });
        });
    });
});
