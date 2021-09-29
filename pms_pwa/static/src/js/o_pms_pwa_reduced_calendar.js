odoo.define("pms_pwa.reduced_calendar", function (require) {
    "use strict";
    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    var publicWidget = require("web.public.widget");
    var csrf_token = core.csrf_token;
    const date_options = {year: "numeric", month: "2-digit", day: "2-digit"};
    var calendar_dpr = $('input[name="calendar_dpr"]').val();

    publicWidget.registry.CalendarCollapseWidget = publicWidget.Widget.extend({
        selector: "#reduced_calendar_table",
        xmlDependencies: ["/pms_pwa/static/src/xml/pms_pwa_roomdoo_reduced_calendar_line.xml"],
        events: {
            "click tr.o_pms_pwa_open_reduced_calendar": "_onClickGetCalendarLine",
            // "mouseover tr.o_pms_pwa_open_reduced_calendar": "_onMouseOverGetCalendarLine",
        },
        init: function(){
            console.log("init");


        },
        _onClickGetCalendarLine: function (event) {
            event.preventDefault();
            console.log("class-> ", $(String("#collapse_accordion_"+data_id)).val());
            var data_id = event.currentTarget.getAttribute("data-id");
            var date_list = $('input[name="date_list"]').val();
            var selected_display = $('input[name="selected_display"]').val();
            ajax.jsonRpc("/calendar/line", "call", {
                data_id: data_id,
                range_date: date_list,
                selected_display: selected_display,
            }).then(function (data) {
                var html = core.qweb.render("pms_pwa.reduced_calendar_line", {
                    data_id: data_id,
                    obj_list: data.reservations,
                    csrf_token: csrf_token,
                });
                $(String("#collapse_accordion_" + data_id)).html(html);
                $(String("#collapse_accordion_"+data_id)).addClass("show");
                // $(".o_pms_pwa_calendar_reservation").colResizable({
                //     liveDrag:true
                // });

                // $( ".o_pms_pwa_calendar_reservation" ).resizable();
                $(".o_pms_pwa_calendar_reservation").draggable({
                    start: function( event, ui ) {
                        console.log("event--->", event.currentTarget);
                        console.log("ui--->", ui);
                        $(event.currentTarget).addClass('z-index-all');
                   }
                });
                $(".o_pms_pwa_line_cell_content").droppable({
                    drop: function(event, ui) {
                        console.log("drop event--->", event);
                        console.log("drop ui--->", ui);
                        ajax.jsonRpc("/reduced-calendar/change", "call", {
                            id:  ui.draggable.data('id'),
                            date:  event.target.dataset.date,
                            room:  event.target.dataset.calendarRoom,
                            // selected_display: selected_display,
                        }).then(function (data) {
                            console.log("devuelve true");
                            // var audio = new Audio('https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3');
                            // audio.play();
                        });
                        $(this).effect("highlight", {}, 1500);
                    },
                    over: function(event, ui) {
                        console.log("over event--->", event);
                        console.log("over ui--->", ui);
                        $(this).css('background', 'cyan');
                    },
                    out: function(event, ui) {
                        console.log("out event--->", event);
                        console.log("out ui--->", ui);
                        $(this).css('background', 'orange');
                    }
                });

            });
        },
        _onMouseOverGetCalendarLine: function (event) {
            event.preventDefault();
            console.log("class-> ", $(String("#collapse_accordion_"+data_id)).val());
            var data_id = event.currentTarget.getAttribute("data-id");
            var date_list = $('input[name="date_list"]').val();
            var selected_display = $('input[name="selected_display"]').val();
            ajax.jsonRpc("/calendar/line", "call", {
                data_id: data_id,
                range_date: date_list,
                selected_display: selected_display,
            }).then(function (data) {
                var html = core.qweb.render("pms_pwa.reduced_calendar_line", {
                    data_id: data_id,
                    obj_list: data.reservations,
                    csrf_token: csrf_token,
                });
                $(String("#collapse_accordion_" + data_id)).html(html);
                $(String("#collapse_accordion_"+data_id)).addClass("show");
            });
            $(".o_pms_pwa_calendar_reservation").draggable({
                start: function( event, ui ) {
                    console.log("event--->", event.currentTarget);
                    console.log("ui--->", ui);
                    $(event.currentTarget).addClass('z-index-all');
               }
            });
            $(".o_pms_pwa_line_cell_content").droppable({
                drop: function(event, ui) {
                    console.log("drop--->", event.currentTarget);
                    $(this).css('background', 'rgb(0,200,0)');
                },
                over: function(event, ui) {
                    console.log("over--->", event.currentTarget);
                    $(this).css('background', 'orange');
                },
                out: function(event, ui) {
                    console.log("out--->", event.currentTarget);
                    $(this).css('background', 'cyan');
                }
            });
        },
    });



});

