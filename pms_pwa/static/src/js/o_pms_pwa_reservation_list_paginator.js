$(document).ready(function() {
    var grid = $(".o_pms_pwa_reservation_list_table");
    var isTable = false;
    if ($("tbody", grid).length) {
        grid = $("tbody", grid);
        isTable = true;
    }

    grid.masonry({
        itemSelector: ".o_pms_pwa_reservation_list_table .item",
    });

    grid.infinitescroll(
        {
            // Loading Text
            loading: {
                finishedMsg: "<em>All bookings has been showed.</em>",
                msgText: "<em>Load next bookings...</em>",
                isTable: isTable,
            },

            // Pagination element that will be hidden
            navSelector: ".o_pms_pwa_reservation_list_pagination",

            // Next page link
            nextSelector: ".o_pms_pwa_reservation_list_pagination a",

            // Selector of items to retrieve
            itemSelector: ".o_pms_pwa_reservation_list_table .item",

            // Max Pagination
            maxPage: parseInt(
                $(".o_pms_pwa_reservation_list_pagination span.max-page").text()
            ),
        },

        // Function called once the elements are retrieved
        function(new_elts) {
            var elts = $(new_elts).css("opacity", 0);
            elts.animate({opacity: 1});
            grid.masonry("appended", elts);
            // Add new records to the cont
            var cont = $("section.o_pms_pwa_roomdoo > h2 > strong > span");
            var qty = parseInt(
                cont
                    .text()
                    .replace("(", "")
                    .replace(")", "")
            );
            qty += new_elts.length;
            cont.text("(" + qty + ")");
        }
    );
});
