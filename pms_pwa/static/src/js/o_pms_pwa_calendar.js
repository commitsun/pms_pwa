odoo.define("pms_pwa.calendar", function (require) {
    "use strict";
    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    var publicWidget = require("web.public.widget");
    var csrf_token = core.csrf_token;
    const date_options = {year: "numeric", month: "2-digit", day: "2-digit"};
    var calendar_dpr = $('input[name="calendar_dpr"]').val();

    publicWidget.registry.CalendarCollapseWidget = publicWidget.Widget.extend({
        selector: "#calendar_table",
        xmlDependencies: ["/pms_pwa/static/src/xml/pms_pwa_roomdoo_calendar_line.xml"],
        events: {
            "click tr.o_pms_pwa_open_calendar": "_onClickGetCalendarLine",
        },
        _onClickGetCalendarLine: function (event) {
            event.preventDefault();
            var data_id = event.currentTarget.getAttribute("data-id");
            var date_list = $('input[name="date_list"]').val();
            var selected_display = $('input[name="selected_display"]').val();
            ajax.jsonRpc("/calendar/line", "call", {
                data_id: data_id,
                range_date: date_list,
                selected_display: selected_display,
            }).then(function (data) {
                console.log("recibo->>", data);
                var html = core.qweb.render("pms_pwa.calendar_line", {
                    data_id: data_id,
                    obj_list: data.reservations,
                    csrf_token: csrf_token,
                });
                $(String("#collapse_accordion_" + data_id)).html(html);
            });
        },
    });

    $(document).on("click", ".open-modalDialog", function () {
        // const date_options = {year: "numeric", month: "2-digit", day: "2-digit"};
        var date_string = $(this).data("date");

        try {
            const parts_of_date = date_string.split("/");

            const new_date =
                parts_of_date[1] + "/" + parts_of_date[0] + "/" + parts_of_date[2];

            date_string = new_date;
        } catch (error) {
            console.error("Invalid format date");
        }
        var date = new Date(date_string);

        var tomorrow = new Date(date);
        tomorrow.setDate(tomorrow.getDate() + 1);
        var room = $(this).data("calendar_room");
        var pricelist = $(this).data("pricelist");
        var checkin_date = date.toLocaleDateString(
            document.documentElement.lang,
            date_options
        );
        var checkout_date = tomorrow.toLocaleDateString(
            document.documentElement.lang,
            date_options
        );
        var range_date = checkin_date + " - " + checkout_date;
        // $('form#booking_engine_form input[name="new_reservation_date_modal_reservation"]').daterangepicker({
        //     startDate: checkin_date,
        //     endDate: checkout_date,
        //     autoUpdateInput: true,
        //     locale: {
        //         direction: "ltr",
        //         format: "DD/MM/YYYY",
        //         separator: " - ",
        //         applyLabel: "Aplicar",
        //         cancelLabel: "Cancelar",
        //     },
        //     opens: "left",
        //     showCustomRangeLabel: false,
        // });
        $('form#booking_engine_form input[name="calendar_room"]').val(room);
        $('form#booking_engine_form select[name="pricelist"]').val(pricelist);
        $('form#booking_engine_form input[name="new_reservation_date_modal_reservation"]').val(range_date);
        $('form#booking_engine_form input[name="checkin"]').val(checkin_date);
        $('form#booking_engine_form input[name="checkout"]').val(checkout_date);
        $("form#booking_engine_form").find("input[name='new_reservation_date_modal_reservation']").trigger("change");

    });
    $(function () {
        if (document.documentElement.lang === "es-ES") {
            $(".o_pms_pwa_daterangepicker_calendar").daterangepicker(
                {
                    locale: {
                        direction: "ltr",
                        format: "DD/MM/YYYY",
                        applyLabel: "Aplicar",
                        cancelLabel: "Cancelar",
                    },
                    singleDatePicker: true,
                    showDropdowns: true,
                    autoUpdateInput: false,
                    minYear: 1901,
                    maxYear: parseInt(moment().format("YYYY"), 10),
                },
                function (start) {
                    //console.log(start);
                    const start_date = new Date(start);
                    var select_date = start_date.toLocaleDateString(
                        document.documentElement.lang,
                        date_options
                    );
                    $('input[name="calendar_selected_date"]').val(select_date);
                    let url= new URL(window.location.href);
                    let searchParams = new URLSearchParams(url.search);
                    let search_params = "";

                    try{
                        if(searchParams.has('display_option')){
                            search_params = search_params+"&display_option="+searchParams.get('display_option');
                        }
                    }catch{
                        console.log("ERROR al pasar opciones de display");
                    }
                    try{
                        if(searchParams.has('pricelist')){
                            search_params = search_params+"&pricelist="+searchParams.get('pricelist');
                        }
                    }catch{
                        console.log("ERROR al pasar pricelist");
                    }
                    try{
                        if(searchParams.has('dpr')){
                            search_params = search_params+"&dpr="+searchParams.get('dpr');
                        }else{
                            search_params = search_params+"&dpr="+calendar_dpr;
                        }
                    }catch{
                        console.log("ERROR al pasar dpr");
                    }
                    searchParams.set('selected_date', select_date);
                    let new_url=url.origin+url.pathname+"?selected_date="+select_date+search_params;
                    window.location = new_url;
                }
            );
        } else {
            $(".o_pms_pwa_daterangepicker_calendar").daterangepicker(
                {
                    locale: {
                        direction: "ltr",
                        format: "MM/DD/YYYY",
                    },
                    singleDatePicker: true,
                    showDropdowns: true,
                    autoUpdateInput: false,
                    minYear: 1901,
                    maxYear: parseInt(moment().format("YYYY"), 10),
                },
                function (start) {
                    //console.log(start);
                    const start_date = new Date(start);
                    var select_date = start_date.toLocaleDateString(
                        document.documentElement.lang,
                        date_options
                    );
                    $('input[name="calendar_selected_date"]').val(select_date);
                    let url= new URL(window.location.href);
                    let searchParams = new URLSearchParams(url.search);
                    let search_params = "";

                    try{
                        if(searchParams.has('display_option')){
                            search_params = search_params+"&display_option="+searchParams.get('display_option');
                        }
                    }catch{
                        console.log("ERROR al pasar opciones de display");
                    }
                    try{
                        if(searchParams.has('pricelist')){
                            search_params = search_params+"&pricelist="+searchParams.get('pricelist');
                        }
                    }catch{
                        console.log("ERROR al pasar pricelist");
                    }
                    try{
                        if(searchParams.has('dpr')){
                            search_params = search_params+"&dpr="+searchParams.get('dpr');
                        }else{
                            search_params = search_params+"&dpr="+calendar_dpr;
                        }
                    }catch{
                        console.log("ERROR al pasar dpr");
                    }
                    searchParams.set('selected_date', select_date);
                    let new_url=url.origin+url.pathname+"?selected_date="+select_date+search_params;
                    window.location = new_url;
                }
            );
        }
    });

});

