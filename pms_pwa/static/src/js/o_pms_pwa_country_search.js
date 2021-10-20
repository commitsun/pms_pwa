odoo.define("pms_pwa.country_search", function () {
    "use strict";

    $(function () {
        $(".o_pms_pwa_search_country_name").autocomplete({
            source: function (request, response) {
                $.ajax({
                    url: "/pms_checkin_partner/search",
                    method: "GET",
                    dataType: "json",
                    data: {keywords: request.term, model: "res.country", id: null},
                    success: function (data) {
                        response(
                            $.map(data, function (item) {
                                return {
                                    label:
                                        (item.type === "c" ? "Category: " : "") +
                                        item.name,
                                    value: item.name,
                                    id: item.id,
                                };
                            })
                        );
                    },
                    error: function (error) {
                        console.error(error);
                    },
                });
            },
            select: function (suggestion, term, item) {
                if (term && term.item) {
                    $(suggestion.target.parentElement)
                        .find('input[name="country_id"]')
                        .val(term.item.id);
                }
            },
            minLength: 1,
        });
    });
});
