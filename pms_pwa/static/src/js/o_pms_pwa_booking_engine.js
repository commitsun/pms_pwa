odoo.define("pms_pwa.pms_pwa_booking_engine", function (require) {
    "use strict";
    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    var _t = core._t;
    var csrf_token = core.csrf_token;
    var publicWidget = require("web.public.widget");
    var date_options = {year: "numeric", month: "2-digit", day: "2-digit"};
    var total_rooms = 0;


    publicWidget.registry.PMSPWABookingEngineWidget = publicWidget.Widget.extend({
        selector: ".o_pms_icons, #o_pms_pwa_new_reservation_modal",
        events: {
            "click #button_reservation_modal": "_onClickPMSPWABookingEngine",
            "change .call_booking_engine": "_onChangePMSPWABookingEngine",
            "click a.form_booking_engine_group": "_onClickPMSPWABookingEngineGroup",
            "change .call_booking_engine_group": "_onClickPMSPWABookingEngineGroup",
            "click #o_pms_pwa_send_form": "_onClickPMSPWABookinEngineSendForm",
            "click button.close": "_onClickPMSPWABookingEngineCloseButton",

        },
        pms_pwa_booking_calendar_widget: function () {
            // console.log("pms_pwa_booking_calendar_widget");

            if (document.documentElement.lang === "es-ES") {
                $('form#booking_engine_form input[name="new_reservation_date_modal_reservation"]').daterangepicker(
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
                        //console.log("fecha de inicio", start);
                        var start_date = new Date(start);
                        var checkin_date = start_date.toLocaleDateString(
                            document.documentElement.lang,
                            date_options
                        );
                        var end_date = new Date(end);
                        var checkout_date = end_date.toLocaleDateString(
                            document.documentElement.lang,
                            date_options
                        );
                        var range_date = checkin_date + " - " + checkout_date;
                        $('form#booking_engine_form input[name="new_reservation_date_modal_reservation"]').val(range_date);
                        $('form#booking_engine_form input[name="checkin"]').val(checkin_date);
                        $('form#booking_engine_form input[name="checkout"]').val(checkout_date);
                        $("form#booking_engine_form").find("input[name='new_reservation_date_modal_reservation']").trigger("change");
                    }
                );
            } else {
                $('form#booking_engine_form input[name="new_reservation_date_modal_reservation"]').daterangepicker(
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
                        var start_date = new Date(start);
                        var checkin_date = start_date.toLocaleDateString(
                            document.documentElement.lang,
                            date_options
                        );
                        var end_date = new Date(end);
                        var checkout_date = end_date.toLocaleDateString(
                            document.documentElement.lang,
                            date_options
                        );
                        var range_date = checkin_date + " - " + checkout_date;
                        $('form#booking_engine_form input[name="new_reservation_date_modal_reservation"]').val(range_date);
                        $('form#booking_engine_form input[name="checkin"]').val(checkin_date);
                        $('form#booking_engine_form input[name="checkout"]').val(checkout_date);
                        $("form#booking_engine_form").find("input[name='new_reservation_date_modal_reservation']").trigger("change");
                    }
                );
            };

        },
        pms_pwa_booking_engine_form_to_json: function (formData){
            // console.log("pms_pwa_booking_engine_form_to_json");
            /* Function form to json*/
            var form_object = {};
            $.each(formData, function (i, v) {
                if (v.value != "false") {
                    if (v.name in form_object) {
                        if(typeof form_object[v.name] == 'object') {
                            if(form_object[v.name].indexOf(v.value) == -1){
                                form_object[v.name].push(v.value);
                            }
                        } else {
                            form_object[v.name] = [form_object[v.name]];
                            form_object[v.name].push(v.value);
                        }
                    } else {
                        if(v.name == "amenity_ids" || v.name == "segmentation_ids"){
                            // console.log("Es un amenity");
                            form_object[v.name] = [v.value];
                        }else{
                            form_object[v.name] = v.value;
                        }
                    }
                }
            });
            return form_object;
        },

        init: function () {
            // console.log("init");
            let today = new Date();
            let tomorrow =  new Date();
            tomorrow.setDate(today.getDate() + 1);
            var checkin_date = today.toLocaleDateString(
                document.documentElement.lang,
                    date_options
            );
            var checkout_date = tomorrow.toLocaleDateString(
                document.documentElement.lang,
                date_options
            );
            var range_date = checkin_date + " - " + checkout_date;
            $('form#booking_engine_form input[name="new_reservation_date_modal_reservation"]').val(range_date);
            $('form#booking_engine_form input[name="checkin"]').val(checkin_date);
            $('form#booking_engine_form input[name="checkout"]').val(checkout_date);
            this.pms_pwa_booking_calendar_widget();
            return this._super.apply(this, arguments);
        },
        start: function () {
            // console.log("start");

            return this._super.apply(this, arguments);

        },
        pms_pwa_booking_engine_send_values: function (event) {
            // console.log("pms_pwa_booking_engine_send_values");
            var values = [];
            var recibed_rooms = [];
            var send_rooms = [];
            var send_value = [];
            values = $("form#booking_engine_form").serializeArray();
            // console.log("Valores del form si convertir --->", values);
            // Si recibo habitaciones:

            $.each(
                values,
                function (key,val) {
                    if(String(val['name']).search("rooms") == 0){
                        var rooms_array = String(val['name']).split("-");
                        rooms_array = rooms_array.slice(1);
                        if(!recibed_rooms[String(rooms_array[0])]){
                            recibed_rooms[String(rooms_array[0])] = {}
                        }
                        if(!recibed_rooms[String(rooms_array[0])][String(rooms_array[1])]){
                            recibed_rooms[String(rooms_array[0])][String(rooms_array[1])] = {};
                        }
                        recibed_rooms[String(rooms_array[0])][String(rooms_array[1])][String(rooms_array[2])] = val['value'];
                    }
            });
            var index = 0;
            // Formateo los valores
            values = this.pms_pwa_booking_engine_form_to_json(values);

            if(values.calendar_room && values.calendar_room != false){
                // console.log("entro en calendar rooms");
                send_rooms = [{
                    board_service_room_id: "",
                    checkin: values.checkin,
                    checkout: values.checkout,
                    preferred_room_id: values["calendar_room"],
                    // pms_property_id': event.getAttribute("data-pms_property_id"),
                    pricelist_id: values.pricelist_id || "1",
                    adults: "1",
                    price_per_room: "21", // No tengo el precio y pongo este.
                    // room_type_id:
                    // price_per_room: values["rooms["+event.getAttribute("data-id")+"][" + i + "][price_per_room]"],
                    // adults: values["rooms["+event.getAttribute("data-id")+"][" + i + "][adults]"],
                    // room_type_id: values["rooms["+event.getAttribute("data-id")+"][" + i + "][room_type_id]"],
                }];
                values.calendar_room = "";
            }else{
                if(recibed_rooms){
                    $.each(recibed_rooms, function (room_key,room_val) {
                        if(room_val){
                            $.each(room_val, function(key,val){
                                if(val){
                                    // console.log("val para añadir a room ---> ", val);
                                    send_rooms.push({
                                        board_service_room_id: false,
                                        checkin: $('input[name="checkin"]').val(),
                                        checkout: $('input[name="checkout"]').val(),
                                        preferred_room_id: val["preferred_room_id"],
                                        pricelist_id: values["pricelist_id"],
                                        price_per_room: val["price_per_room"],
                                        adults: val["adults"],
                                        room_type_id: val["room_type_id"],
                                    });
                                    // console.log("send_rooms --->", send_rooms);
                                    // console.log("val --->", val);
                                    //count_rooms = count_rooms + 1;
                                };
                            });
                            index = index + 1;
                        };
                    });
                }
            }
            // console.log("send_rooms --->", send_rooms);
            // console.log("valores tras pms_pwa_booking_engine_form_to_json ->", values);
            if (event.currentTarget.name == "new_reservation_date_modal_reservation") {
                // let value_range_picker = event.currentTarget.value;
                values.checkin = $('input[name="checkin"]').val();
                values.checkout = $('input[name="checkout"]').val();
            }
            // Seteo los valores del calendario para enviar al controlador
            send_value = {
                partner_id: "",
                partner_name: values.name || values.partner_name,
                mobile: values.mobile || "",
                email: values.mail || "",
                checkin: values.checkin,
                checkout: values.checkout,
                count_rooms_selected: total_rooms,
                pms_property_id: values.pms_property_id || "1",
                pricelist_id: values.pricelist_id || "1",
                reservation_type: values.reservation_type || "normal",
                rooms: send_rooms,
                agrupation_type: values.agrupation_type || "all",
                amenity_ids: values.amenity_ids || "",
                channel_type_id: values.channel_type_id || "",
                segmentation_ids: values.segmentation_ids || "",

            };
            if (
                values.ubication_id &&
                values.ubication_id != "false" &&
                values.ubication_id != "undefined"
            ) {
                send_value.ubication_id = values.ubication_id;
            }
            if (
                values.room_type_id &&
                values.room_type_id != "false" &&
                values.room_type_id != "undefined"
            ) {
                send_value.room_type_id = values.room_type_id;
            }
            if (
                values.sale_category_id &&
                values.sale_category_id != "false" &&
                values.sale_category_id != "undefined" &&
                values.agrupation_type != "room_type"
            ) {
                send_value.sale_category_id = values.sale_category_id;
            } else {
                if(values.agrupation_type != "room_type"){
                    send_value.sale_category_id = "1"; //por defecto
                }else{
                    send_value.sale_category_id = "";
                }
            }
            if (
                values.board_service_room_id &&
                values.board_service_room_id != "false" &&
                values.board_service_room_id != "False" &&
                values.board_service_room_id != "undefined"
            ) {
                send_value.board_service_room_id = values.board_service_room_id;
            }else{
                send_value.board_service_room_id = "";
            }
            if (
                values.agency_id &&
                values.agency_id != "false" &&
                values.agency_id != "undefined"
            ) {
                send_value.agency_id = values.agency_id;
            }
            return send_value
        },
        pms_pwa_booking_engine_head_form: function (new_data) {
            // console.log("pms_pwa_booking_engine_head_form");
            var allowed_fields = [
                "allowed_agency_ids",
                "allowed_board_services",
                "allowed_channel_type_ids",
                "allowed_pricelists",
                "allowed_segmentations",
                "allowed_sale_category_ids",
                "allowed_amenity_ids",
            ];
            var relation_values = {
                allowed_agency_ids: "agency_id",
                allowed_board_services: "board_service_room_id",
                allowed_channel_type_ids: "channel_type_id",
                allowed_pricelists: "pricelist_id",
                allowed_segmentations: "segmentation_ids",
                allowed_sale_category_ids: "sale_category_id",
                allowed_amenity_ids: "amenity_ids",
                reservation_types: "reservation_type",
            };
            $.each(allowed_fields, function (key, value) {

                try {
                    var select = $(
                        'form#booking_engine_form [data-select="' +
                            value +
                            '"]'
                    );
                } catch (error) {
                    console.log(error);
                }
                if(value == "allowed_amenity_ids" || value == "allowed_segmentations"){
                    $.each(
                        new_data[value],
                        function (subkey, subvalue) {
                            if (
                                subvalue["id"] ==
                                new_data[relation_values[value]]
                            ) {
                                var option = new Option(
                                    subvalue["name"],
                                    subvalue["id"],
                                    true,
                                    true
                                );
                            } else {
                                var option = new Option(
                                    subvalue["name"],
                                    subvalue["id"],
                                    false,
                                    false
                                );
                            }
                            $(option).html(subvalue["name"]);
                            select.append(option);
                        }
                    );
                }else{
                    if (select.length != 0) {
                        select.empty();
                        if (
                            !new_data[relation_values[value]] &
                            (new_data[relation_values[value]] == 0)
                        ) {
                            select.append(
                                '<option value="" selected></option>'
                            );
                        }
                        $.each(
                            new_data[value],
                            function (subkey, subvalue) {

                                try{
                                    if (
                                        subvalue["id"] ==
                                        new_data[relation_values[value]]
                                    ) {
                                        var option = new Option(
                                            subvalue["name"],
                                            subvalue["id"],
                                            false,
                                            true
                                        );
                                    } else {
                                        var option = new Option(
                                            subvalue["name"],
                                            subvalue["id"],
                                            false,
                                            false
                                        );
                                    }
                                    $(option).html(subvalue["name"]);
                                    select.append(option);
                                }catch(error) {
                                    // console.log(error);
                                    return false;
                                }
                            }
                        );
                    }
                }
                delete new_data[value];
            });
            $.each(new_data, function (key, value) {
                var input = $(
                    "form#booking_engine_form input[name='" + key + "']"
                );
                if (input.length > 0) {
                    input.val(value);
                }
                delete new_data[value];
            });
            var range_date = new_data['checkin'] + " - " + new_data['checkout'];
            $('input[name="new_reservation_date_modal_reservation"]').val(range_date);
            $('form#booking_engine_form input[name="checkin"]').val(new_data['checkin']);
            $('form#booking_engine_form input[name="checkout"]').val(new_data['checkout']);
            $(
                "div#o_pms_pwa_new_reservation_modal #segmentation_ids"
            ).select2("destroy");
            $(
                "div#o_pms_pwa_new_reservation_modal #segmentation_ids"
            ).select2();
            // enviar amenity_ids
            $(
                "div#o_pms_pwa_new_reservation_modal #amenity_ids"
            ).select2("destroy");
            $(
                "div#o_pms_pwa_new_reservation_modal #amenity_ids"
            ).select2();
        },
        pms_pwa_booking_engine_draw_group_rooms: function (send_value, new_data, group_id){
            // console.log("pms_pwa_booking_engine_draw_group_rooms");
            var price_per_group = "#price" + group_id;
            var table_name = "#tablegroup" + group_id;
            var new_values = "#new_values_data" + group_id;
            var html = "<table id='"+table_name+"' class='groups_rooms' style='margin-left:-1rem; width: 100%;'>";
            for (var i = 0; i < new_data["rooms"].length; i++) {
                var seloption =
                    '<option name="preferred_room_id" value="' + new_data["rooms"][i]["preferred_room_id"]["id"] +'" selected="selected">' +
                            new_data["rooms"][i]["preferred_room_id"]["name"] +
                    '</option>';
                $.each(new_data["free_rooms_dict"], function (key) {
                    seloption +=
                        '<option  name="preferred_room_id" value="' +new_data["free_rooms_dict"][key]["id"] +'">' +
                            new_data["free_rooms_dict"][key]["name"] +
                        '</option>';
                });
                html +=
                    '<tr><td class="col-sm-7">' +
                        '<label class="control-label" for="preferred_room_id">Habitación</label>' +
                        '<select data-group_id="' + group_id +
                            '" data-checkin="' + send_value["checkin"] +
                            '" data-checkout="' + send_value["checkout"] +
                            '" data-count_rooms_selected="' + send_value["count_rooms_selected"] +
                            '" data-ubication_id="' + new_data["rooms"][i]["ubication_id"] +
                            '" data-room_type_id="' + new_data["rooms"][i]["room_type_id"] +
                            '" data-sale_category_id="' + send_value["sale_category_id"] +
                            '" data-pms_property_id="' + send_value["pms_property_id"] +
                            '" data-pricelist_id="' + send_value["pricelist_id"] +
                            '" data-board_service_room_id="' + send_value["board_service_room_id"] +
                            '" class="form-control o_website_form_input o_domain_leaf_operator_select o_input call_booking_engine_group" name="rooms-'+group_id+'-' + i +'-preferred_room_id">' +
                            seloption +
                        '</select>' +
                    '</td>' +
                    '<td class="col-sm-5 text-right align-middle">' +
                        //'<label class="control-label" for="adults">Adultos</label>'+
                        '<a href="#" class="btn btn-o_pms_pwa_min_max" onclick="document.getElementById(\'quantity' + i +'\').stepDown(1)">-</a>' +
                        '<input name="rooms-'+group_id+'-'+ i +'-adults" class="o_pms_pwa_num-control" value="' +new_data["rooms"][i]["adults"] +'" id="quantity' +i +'" type="number" min="1" max="' + new_data["rooms"][i]["max_adults"] +'" readonly="readonly" />' +
                        '<input name="rooms-'+group_id+'-' + i +'-room_type_id" value="' +new_data["rooms"][i]["room_type_id"] +'" type="hidden" />' +
                        '<input name="rooms-'+group_id+'-' + i +'-price_per_room" value="' +new_data["rooms"][i]["price_per_room"] +'" type="hidden"/>' +
                        '<a href="#" class="btn btn-o_pms_pwa_min_max" onclick="document.getElementById(\'quantity' +i +'\').stepUp(1)">+</a>' +
                    "</td></tr>";
            }

            html += "</table>";
            $(new_values).html(html);
            $(price_per_group).html(
                new_data["price_per_group"].toFixed(2) + "€"
            );
            // Aqui el precio al no tener grupos
            $("form#booking_engine_form .price_total").html(
                new_data["price_per_group"].toFixed(2) + "€"
            );
        },
        pms_pwa_booking_engine_draw_groups: function (new_data){
            // console.log("pms_pwa_booking_engine_draw_groups");
            var html = "";
            var groups = new_data.groups;
            for (const i in groups) {
                html +=
                    '<tr>' +
                        '<td class="col-sm-4">' +
                            groups[i].name + " (" + groups[i].max_rooms + ")" +
                        '</td>' +
                        '<td class="col-sm-5">' +
                            '<a class="btn btn-o_pms_pwa_min_max form_booking_engine_group" data-group_id="' +
                                groups[i].group_id +
                                '" data-checkin="' +
                                new_data["checkin"] +
                                '" data-checkout="' +
                                new_data["checkout"] +
                                '" data-count_rooms_selected="' +
                                groups[i].count_rooms_selected +
                                '" data-ubication_id="' +
                                groups[i].ubication_id +
                                '" data-room_type_id="' +
                                groups[i].room_type_id +
                                '" data-sale_category_id="' +
                                new_data["sale_category_id"]['id'] +
                                '" data-pms_property_id="' +
                                new_data["pms_property_id"] +
                                '" data-pricelist_id="' +
                                new_data["pricelist_id"] +
                                '" data-add_room="0" data-board_service_room_id="' +
                                new_data["board_service_room_id"] +
                                '" onclick="document.getElementById(\'groupquantity' + groups[i].group_id +'\').stepDown(1)" data-target="#collapseme' +
                                groups[i].group_id +
                            '">-</a>' +
                            '<input readonly="readonly" name="count_rooms_selected"  value="' + groups[i].count_rooms_selected +'" class="o_pms_pwa_num-control num_rooms_element" id="groupquantity' +
                                groups[i].group_id +
                                '" type="number" min="0" max="' +
                                groups[i].max_rooms +
                            '" />' +
                            '<a class="btn btn-o_pms_pwa_min_max form_booking_engine_group" data-group_id="' +
                                groups[i].group_id +
                                '" data-checkin="' +
                                new_data["checkin"] +
                                '" data-checkout="' +
                                new_data["checkout"] +
                                '" data-count_rooms_selected="' +
                                groups[i].count_rooms_selected +
                                '" data-ubication_id="' +
                                groups[i].ubication_id +
                                '" data-room_type_id="' +
                                groups[i].room_type_id +
                                '" data-sale_category_id="' +
                                new_data["sale_category_id"]['id'] +
                                '" data-pms_property_id="' +
                                new_data["pms_property_id"] +
                                '" data-pricelist_id="' +
                                new_data["pricelist_id"] +
                                '" data-add_room="1" data-board_service_room_id="' +
                                new_data["board_service_room_id"] +
                                '" onclick="document.getElementById(\'groupquantity' + groups[i].group_id +'\').stepUp(1)" data-target="#collapseme' +
                                groups[i].group_id +
                            '">+</a>' +
                            '</td>' +
                            '<td class="col-sm-3">' +
                                '<span class="price_group" id="price' +
                                groups[i].group_id +
                                '">' +
                                groups[i].price_per_group +
                                '€<span>' +
                            '</td>' +
                        '</tr>' +
                        '<tr id="collapseme' +
                            groups[i].group_id +
                            '" class="collapse out"><td colspan="3" id="new_values_data' +
                            groups[i].group_id +
                            '"></td></tr>';
            }
            $("#bookengine_table").html(html);
        },
        pms_pwa_booking_engine_calculate_price: function () {
            // console.log("pms_pwa_booking_engine_calculate_price");
            var total_price = 0.0;
            var price_groups_elements = document.getElementsByClassName('price_group');
            // console.log("Todos los elemetos de precio por grupo", price_groups_elements.length);
            $.each(price_groups_elements, function (a) {
                //console.log("price_groups_elements[a]", price_groups_elements[a]);
                //console.log("precio del grupo", price_groups_elements[a].innerText);
                total_price = (parseFloat(total_price) + parseFloat(price_groups_elements[a].innerText.replace("€", ""))).toFixed(2);
            });
            // console.log("precio total calculado ", total_price);
            $("form#booking_engine_form .price_total").html(
                parseFloat(total_price).toFixed(2) + "€"
            );
        },
        pms_pwa_booking_engine_display_alert: function (new_data) {
            // console.log("pms_pwa_booking_engine_display_alert");
            var self = this;
            var data = [];
            try{
                data.type = "warning";
                data.message = new_data['message'];
            }catch(error){
                console.log("Error -> ", error);
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
        },
        /* OnClick events */
        _onClickPMSPWABookingEngine: function (event) {
            // console.log("_onClickPMSPWABookingEngine");
            var self = this;
            event.preventDefault();

            self.pms_pwa_booking_calendar_widget();
            var send_value = self.pms_pwa_booking_engine_send_values(event);
            // console.log("envío _onClickPMSPWABookingEngine -->", send_value);
            ajax.jsonRpc("/booking_engine", "call", send_value).then(function (
                new_data
            ) {
                // console.log("recibo _onClickPMSPWABookingEngine -->", new_data);
                if (new_data && new_data.result != "error") {
                    if (new_data["agrupation_type"] == "room_type") {
                        $(".sale_category_id").removeAttr("style").hide();
                    } else {
                        $(".sale_category_id").show();
                    }
                    self.pms_pwa_booking_engine_head_form(new_data);
                    if (new_data.groups) {
                        self.pms_pwa_booking_engine_draw_groups(new_data);
                        for(var a in new_data.groups){
                            if(new_data.groups[a].count_rooms_selected > 0){
                                var colapse_name = "#collapseme" + new_data.groups[a].group_id;
                                self.pms_pwa_booking_engine_draw_group_rooms(send_value, new_data.groups[a], new_data.groups[a].group_id);
                                $(colapse_name).collapse("show");
                            }
                        }
                    }
                }else{
                    self.pms_pwa_booking_engine_display_alert(new_data);
                }
            });
        },
        _onChangePMSPWABookingEngine: function (event) {
            // console.log("_onChangePMSPWABookingEngine");
            var self = this;
            event.preventDefault();
            var send_value = self.pms_pwa_booking_engine_send_values(event);
            // console.log("envío _onChangePMSPWABookingEngine -->", send_value);
            ajax.jsonRpc("/booking_engine", "call", send_value).then(function (
                new_data
            ) {
                // console.log("recibo _onChangePMSPWABookingEngine -->", new_data);
                if (new_data && new_data.result != "error") {
                    if (new_data["agrupation_type"] == "room_type") {
                        $(".sale_category_id").removeAttr("style").hide();
                    } else {
                        $(".sale_category_id").show();
                    }
                    self.pms_pwa_booking_engine_head_form(new_data);
                    if (new_data.groups) {
                        self.pms_pwa_booking_engine_draw_groups(new_data);
                        for(var a in new_data.groups){
                            if(new_data.groups[a].count_rooms_selected > 0){
                                var colapse_name = "#collapseme" + new_data.groups[a].group_id;
                                self.pms_pwa_booking_engine_draw_group_rooms(send_value, new_data.groups[a], new_data.groups[a].group_id);
                                $(colapse_name).collapse("show");
                            }
                        }
                    }
                }else{
                    self.pms_pwa_booking_engine_display_alert(new_data);
                }
            });

        },
        _onClickPMSPWABookingEngineGroup: function (e) {
            // console.log("_onClickPMSPWABookingEngineGroup");
            var self = this;
            e.preventDefault();
            var event = e.currentTarget;
            if (($("#o_pms_pwa_new_reservation_modal").data("bs.modal") || {})._isShown) {
                var group_id =  event.getAttribute("data-group_id");
                var colapse_name = "#collapseme" + group_id;
                var table_name = "#tablegroup" + group_id;
                var name_input = "#groupquantity" + group_id;
                var price_per_group = "#price" + group_id;
                var num_rooms = $(name_input).val();
                // console.log("num_rooms", num_rooms);
                var send_value = self.pms_pwa_booking_engine_send_values(e);
                if(event.getAttribute("data-add_room") == "1"){
                    total_rooms = total_rooms + 1;
                }else{
                    total_rooms = total_rooms - 1;
                    send_value.rooms.splice(-1);
                }
                send_value.count_rooms_selected = num_rooms;
                // console.log("send values --->", send_value);
                if (num_rooms > 0) {
                    // console.log("envío _onClickPMSPWABookingEngineGroup -->", send_value);
                    ajax.jsonRpc(
                        "/booking_engine_group",
                        "call",
                        send_value
                    ).then(function (new_data) {
                        // console.log("recibo _onClickPMSPWABookingEngineGroup -->", new_data);
                        if (new_data && new_data.result != "error") {
                            self.pms_pwa_booking_engine_draw_group_rooms(send_value, new_data, group_id);
                        }else{
                            self.pms_pwa_booking_engine_display_alert(new_data);
                        }
                    });
                    $(colapse_name).collapse("show");
                } else {
                    $(table_name).empty()
                    $(colapse_name).collapse("hide");
                    ajax.jsonRpc(
                        "/booking_engine_group",
                        "call",
                        send_value
                    ).then(function (new_data) {
                        // console.log("recibo _onClickPMSPWABookingEngineGroup -->", new_data);
                        if (new_data && new_data.result != "error") {
                            self.pms_pwa_booking_engine_draw_group_rooms(send_value, new_data, group_id);
                        }else{
                            self.pms_pwa_booking_engine_display_alert(new_data);
                        }
                    });
                }
            }
        },
        _onClickPMSPWABookinEngineSendForm: function (event){
            // console.log("_onClickPMSPWABookinEngineSendForm");
            var self = this;
            event.preventDefault();
            var send_value = self.pms_pwa_booking_engine_send_values(event);
            // console.log("envío _onClickPMSPWABookinEngineSendForm -->", send_value);
            ajax.jsonRpc("/booking_engine_submit", "call", send_value).then(function (
                new_data
            ) {
                // console.log("devuelve al enviar form-->", new_data);
                if (new_data && new_data.result != "error") {
                    if (new_data.reservation_id) {
                        // Cierra modal
                        $(
                            "div.o_pms_pwa_new_reservation_modal"
                        ).modal("toggle");
                        // abre modal
                        try{
                            $("<td class='launch_modal' data-id='" + new_data.reservation_id + "'>Pincha aqui</td>").appendTo("table.launch_modal");
                            var selector = "td[data-id=" +new_data.reservation_id +"]";
                            setTimeout(function () {
                                $(selector).click();
                            }, 100);

                        } catch (error) {
                            console.log(error);
                            location.href = "/reservation/" + new_data.reservation_id;
                        }
                    }else{
                        self.pms_pwa_booking_engine_display_alert(new_data);
                    }
                }else{
                    self.pms_pwa_booking_engine_display_alert(new_data);
                }
            });
        },
        _onClickPMSPWABookingEngineCloseButton : function () {
            // console.log("_onClickPMSPWABookingEngineCloseButton");
            // const today = new Date()
            // let tomorrow =  new Date()
            // tomorrow.setDate(today.getDate() + 1)
            // var checkin_date = today.toLocaleDateString(
            //     document.documentElement.lang,
            //         date_options
            // );
            // var checkout_date = tomorrow.toLocaleDateString(
            //     document.documentElement.lang,
            //     date_options
            // );
            // var range_date = checkin_date + " - " + checkout_date;
            // document.getElementById("booking_engine_form").reset();
            // $('form#booking_engine_form:input').not(':button, :submit, :reset, :checkbox, :radio').val('');
            // $('input[name="new_reservation_date_modal_reservation"]').val(range_date);
            // $('form#booking_engine_form input[name="checkin"]').val(checkin_date);
            // $('form#booking_engine_form input[name="checkout"]').val(checkout_date);
            // $('.groups_rooms >tr').remove();
            // var values = $("form#booking_engine_form").serializeArray();
            // console.log("values al borrar ->", values);
            $("#status").toggle();
            $("#preloader").toggle();
            location.reload();

        },
    });
    return publicWidget.registry.PMSPWABookingEngineWidget;
});
