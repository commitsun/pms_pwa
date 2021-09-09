odoo.define("pms_pwa.reservation_table", function (require) {
    "use strict";
    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    // var PortalSidebar = require('portal.PortalSidebar');
    var _t = core._t;
    var publicWidget = require("web.public.widget");
    var csrf_token = core.csrf_token;
    const date_options = {year: "numeric", month: "2-digit", day: "2-digit"};
    const relation_values = {
        allowed_agency_ids: "agency_id",
        allowed_board_service_room_ids: "board_service_room_id",
        allowed_board_services: "board_service_room_id",
        reservation_types: "reservation_type",
        allowed_channel_type_ids: "channel_type_id",
        allowed_pricelists: "pricelist_id",
        allowed_segmentations: "segmentation_ids",
        room_numbers: "preferred_room_id",
        room_types: "room_type_id",
        allowed_country_ids: "country_id",
        allowed_state_ids: "state_id",
        allowed_sale_category_ids: "sale_category_id",
        allowed_amenity_ids: "amenity_ids",
    };
    const fields_to_avoid = ["primary_button", "secondary_buttons"];
    $("button.close > span.o_pms_pwa_tag_close").on("click", function (event) {
        event.preventDefault();
        var input = event.currentTarget.parentNode.getAttribute("data-tag");
        if (input === "search") {
            $("input[name='original_search']").val("");
        } else {
            $("input[name='" + input + "']").val("");
        }
        $("form").submit();
    });
    /* Function form to json*/
    function form_to_json(formData) {
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
                        form_object[v.name] = [v.value];
                    }else{
                        form_object[v.name] = v.value;
                    }
                }
            }
        });
        return form_object;
    }

    /* reservation form */
    $("#button_reservation_modal").on("click", function (e) {
        if (document.documentElement.lang === "es-ES") {
            $('input[name="new_reservation_date_modal_reservation"]').daterangepicker(
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
                    console.log("cargo el calendario",label);
                    const start_date = new Date(start);
                    var checkin_date = start_date.toLocaleDateString(
                        document.documentElement.lang,
                        date_options
                    );
                    const end_date = new Date(end);
                    var checkout_date = end_date.toLocaleDateString(
                        document.documentElement.lang,
                        date_options
                    );
                    $('input[name="checkin"]').val(checkin_date);
                    $('input[name="checkout"]').val(checkout_date);

                    let nights = 1;
                    // Hours*minutes*seconds*milliseconds
                    const oneDay = 24 * 60 * 60 * 1000;
                    const firstDate = new Date(start);
                    const secondDate = new Date(end);
                    const diffDays = Math.round(
                        Math.abs((firstDate - secondDate) / oneDay)
                    );
                    nights = diffDays - 1;
                    $('input[name="nights"]').val(nights);
                    // $("form#reservation_detail").submit();
                }
            );
        } else {
            $('input[name="new_reservation_date_modal_reservation"]').daterangepicker(
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
                    console.log("cargo el calendario",label);
                    const start_date = new Date(start);
                    var checkin_date = start_date.toLocaleDateString(
                        document.documentElement.lang,
                        date_options
                    );
                    const end_date = new Date(end);
                    var checkout_date = end_date.toLocaleDateString(
                        document.documentElement.lang,
                        date_options
                    );
                    $('input[name="checkin"]').val(checkin_date);
                    $('input[name="checkout"]').val(checkout_date);
                    let nights = 1;
                    // Hours*minutes*seconds*milliseconds
                    const oneDay = 24 * 60 * 60 * 1000;
                    const firstDate = new Date(start);
                    const secondDate = new Date(end);
                    const diffDays = Math.round(
                        Math.abs((firstDate - secondDate) / oneDay)
                    );
                    nights = diffDays - 1;
                    $('input[name="nights"]').val(nights);
                    // $("form#reservation_detail").submit();
                }
            );
        }
        setTimeout(function () {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            var checkin_date = today.toLocaleDateString(
                document.documentElement.lang,
                date_options
            );
            var checkout_date = tomorrow.toLocaleDateString(
                document.documentElement.lang,
                date_options
            );
            $("#o_pms_pwa_new_reservation_modal")
                .find("input[name='checkin']")
                .val(checkin_date);
            $("#o_pms_pwa_new_reservation_modal")
                .find("input[name='checkout']")
                .val(checkout_date);
            $("#o_pms_pwa_new_reservation_modal")
                .find("input[name='new_reservation_date_modal_reservation']")
                .val(checkin_date + " - " + checkout_date);
            $("#o_pms_pwa_new_reservation_modal")
                .find("input[name='new_reservation_date_modal_reservation']")
                .trigger("change");
        }, 100);
    });

    $("form#booking_engine_form").on(
        "change",
        "input[name='new_reservation_date_modal_reservation'] ,select.call_booking_engine",
        function (event) {
            var values = $("form#booking_engine_form").serializeArray();
            values = form_to_json(values);
            var allowed_fields = [
                "allowed_agency_ids",
                "allowed_board_services",
                "reservation_types",
                "allowed_channel_type_ids",
                "allowed_pricelists",
                "allowed_segmentations",
                "allowed_sale_category_ids",
                "allowed_amenity_ids",
                // "room_types",
                // "room_numbers",
            ];

            if (event.currentTarget.name == "new_reservation_date_modal_reservation") {
                // let value_range_picker = event.currentTarget.value;
                values.checkin = $('input[name="checkin"]').val();
                values.checkout = $('input[name="checkout"]').val();
            }

            if (
                ($("#o_pms_pwa_new_reservation_modal").data("bs.modal") || {})._isShown
            ) {
                ajax.jsonRpc("/booking_engine", "call", values).then(function (
                    new_data
                ) {

                    setTimeout(function () {
                        if (new_data && new_data.result != "error") {
                            if (new_data["agrupation_type"] == "room_type") {
                                $(".sale_category_id").removeAttr("style").hide();
                            } else {
                                $(".sale_category_id").show();
                            }
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
                                if(value == "allowed_amenity_ids"){
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
                                } else {
                                    if (!fields_to_avoid.includes(key)) {
                                        $(
                                            "form.o_pms_pwa_reservation_form select[name='" +
                                                key +
                                                "'] option[value='" +
                                                value +
                                                "']"
                                        ).prop("selected", true);
                                    }
                                }
                            });
                            if (new_data.groups) {
                                var groups = new_data.groups;
                                var html = "";

                                for (const i in groups) {
                                    html +=
                                        "<tr>" +
                                        '<td class="col-4">' +
                                        groups[i].name +
                                        " (" +
                                        groups[i].max_rooms +
                                        ")" +
                                        "</td>" +
                                        '<td class="col-4">' +
                                        '<button class="btn btn-o_pms_pwa_min_max form_booking_engine_group" data-id="' +
                                        i +
                                        '" data-checkin="' +
                                        new_data["checkin"] +
                                        '" data-checkout="' +
                                        new_data["checkout"] +
                                        '" data-count_rooms_selected="' +
                                        groups[i].count_rooms_selected +
                                        '" data-ubication_id="' +
                                        groups[i].ubication_id +
                                        '" data-room_type_id=' +
                                        groups[i].room_type_id +
                                        " data-sale_category_id=" +
                                        new_data["sale_category_id"] +
                                        " data-pms_property_id=" +
                                        new_data["pms_property_id"] +
                                        " data-pricelist_id=" +
                                        new_data["pricelist_id"] +
                                        " data-board_service_room_id=" +
                                        new_data["board_service_room_id"] +
                                        " onclick=\"document.getElementById('groupquantity" +
                                        i +
                                        '\').stepDown(1);" data-target="#collapseme' +
                                        i +
                                        '">-</button>' +
                                        '<input disabled="disabled" name="count_rooms_selected" class="num-control" id="groupquantity' +
                                        i +
                                        '" type="number" min="0" max="' +
                                        groups[i].max_rooms +
                                        '" />' +
                                        '<button class="btn btn-o_pms_pwa_min_max form_booking_engine_group" data-id="' +
                                        i +
                                        '" data-checkin="' +
                                        new_data["checkin"] +
                                        '" data-checkout="' +
                                        new_data["checkout"] +
                                        '" data-count_rooms_selected="' +
                                        groups[i].count_rooms_selected +
                                        '" data-ubication_id="' +
                                        groups[i].ubication_id +
                                        '" data-room_type_id=' +
                                        groups[i].room_type_id +
                                        " data-sale_category_id=" +
                                        new_data["sale_category_id"] +
                                        " data-pms_property_id=" +
                                        new_data["pms_property_id"] +
                                        " data-pricelist_id=" +
                                        new_data["pricelist_id"] +
                                        " data-board_service_room_id=" +
                                        new_data["board_service_room_id"] +
                                        " onclick=\"document.getElementById('groupquantity" +
                                        i +
                                        '\').stepUp(1)" data-target="#collapseme' +
                                        i +
                                        '">+</button>' +
                                        "</td>" +
                                        '<td class="col-4">' +
                                        'Precio <span class="price_group" id="price' +
                                        i +
                                        '">' +
                                        groups[i].price_per_group +
                                        "€<span>" +
                                        "</td>" +
                                        "</tr>" +
                                        '<tr id="collapseme' +
                                        i +
                                        '" class="collapse out"><td colspan="3" id="new_values_data' +
                                        i +
                                        '"></td></tr>';
                                }
                                $("#bookengine_table").html(html);
                            }
                            function launchChanges(event, send_value) {
                                var price_per_group = "#price" + send_value["id"];
                                var new_values = "#new_values_data" + send_value["id"];
                                console.log("Send ->", send_value);
                                ajax.jsonRpc(
                                    "/booking_engine_group",
                                    "call",
                                    send_value
                                ).then(function (new_data) {
                                    console.log("devuelve->", new_data);
                                    // if (new_data && new_data.result != "error") {
                                    var html = "<table>";

                                    for (var i = 0; i < new_data["rooms"].length; i++) {
                                        var seloption =
                                            '<option name="preferred_room_id" value="' +
                                            new_data["rooms"][i]["preferred_room_id"][
                                                "id"
                                            ] +
                                            '" selected="selected">' +
                                            new_data["rooms"][i]["preferred_room_id"][
                                                "name"
                                            ] +
                                            "</option>";
                                        $.each(
                                            new_data["free_rooms_dict"],
                                            function (key) {
                                                seloption +=
                                                    '<option  name="preferred_room_id" value="' +
                                                    new_data["free_rooms_dict"][key][
                                                        "id"
                                                    ] +
                                                    '">' +
                                                    new_data["free_rooms_dict"][key][
                                                        "name"
                                                    ] +
                                                    "</option>";
                                            }
                                        );
                                        html +=
                                            '<tr><td class="col-7">' +
                                            '<label class="control-label" for="preferred_room_id">Habitación</label>' +
                                            '<select data-parent_id="' +
                                            send_value["id"] +
                                            '" data-checkin="' +
                                            send_value["checkin"] +
                                            '" data-checkout="' +
                                            send_value["checkout"] +
                                            '" data-count_rooms_selected="' +
                                            send_value["count_rooms_selected"] +
                                            '" data-ubication_id="' +
                                            new_data["rooms"][i]["ubication_id"] +
                                            '" data-room_type_id=' +
                                            new_data["rooms"][i]["room_type_id"] +
                                            " data-sale_category_id=" +
                                            send_value["sale_category_id"] +
                                            " data-pms_property_id=" +
                                            send_value["pms_property_id"] +
                                            " data-pricelist_id=" +
                                            send_value["pricelist_id"] +
                                            " data-board_service_room_id=" +
                                            send_value["board_service_room_id"] +
                                            ' class="form-control o_website_form_input o_domain_leaf_operator_select o_input call_booking_engine_group" name="rooms['+send_value["id"]+'][' +
                                            i +
                                            '][preferred_room_id]">' +
                                            seloption +
                                            "</select>" +
                                            "</td>" +
                                            '<td class="col-5">' +
                                            //'<label class="control-label" for="adults">Adultos</label>'+
                                            '<button class="btn btn-o_pms_pwa_min_max" onclick="document.getElementById(\'quantity' +
                                            i +
                                            "').stepDown(1)\">-</button>" +
                                            '<input name="rooms['+send_value["id"]+'][' +
                                            i +
                                            '][adults]" class="num-control" value=' +
                                            new_data["rooms"][i]["adults"] +
                                            ' id="quantity' +
                                            i +
                                            '" type="number" min="1" max="' +
                                            new_data["rooms"][i]["max_adults"] +
                                            '" />' +
                                            '<input name="rooms['+send_value["id"]+'][' +
                                            i +
                                            '][room_type_id]" value=' +
                                            new_data["rooms"][i]["room_type_id"] +
                                            ' id="quantity' +
                                            i +
                                            '" type="hidden"/>' +
                                            '<input name="rooms['+send_value["id"]+'][' +
                                            i +
                                            '][price_per_room]" value=' +
                                            new_data["rooms"][i]["price_per_room"] +
                                            ' id="quantity' +
                                            i +
                                            '" type="hidden"/>' +
                                            '<button class="btn btn-o_pms_pwa_min_max" onclick="document.getElementById(\'quantity' +
                                            i +
                                            "').stepUp(1)\">+</button>" +
                                            "</td></tr>";
                                    }

                                    html += "</table>";
                                    $(new_values).html(html);
                                    // precio grupo
                                    $(price_per_group).html(
                                        new_data["price_per_group"].toFixed(2) + "€"
                                    );
                                    //precio total grupos
                                    var total_price = 0.0
                                    var price_groups_elements = document.getElementsByClassName('price_group');
                                    for (var i = 0; i < price_groups_elements.length; ++i) {
                                        var item = price_groups_elements[i];
                                        total_price = (parseFloat(total_price) + parseFloat(item.innerText.replace("€", ""))).toFixed(2);
                                    }
                                    $("form#booking_engine_form .price_total").html(
                                        parseFloat(total_price).toFixed(2) + "€"
                                    );
                                    $("form#booking_engine_form .price_taxes").html(
                                        (parseFloat(total_price) * 0.1).toFixed(2) + "€"
                                    );
                                });
                            }
                            $("form#booking_engine_form .form_booking_engine_group").on(
                                "click",
                                function (e) {
                                    e.preventDefault();
                                    console.log("lanzamos tras +-");
                                    var event = e.currentTarget;
                                    var send_value = {};
                                    var send_rooms = [];
                                    var colapse_name = "#collapseme" + event.getAttribute("data-id");
                                    var name_input =
                                        "#groupquantity" +
                                        event.getAttribute("data-id");
                                    var price_per_group =
                                        "#price" + event.getAttribute("data-id");
                                    var num_rooms = $(name_input).val();
                                    var values = $(
                                        "form#booking_engine_form"
                                    ).serializeArray();
                                    values = form_to_json(values);
                                    console.log("numero de habitaciones", num_rooms);
                                    if (num_rooms > 0) {

                                        for (
                                            var i = 0;
                                            i < parseInt(num_rooms);
                                            i++
                                        ) {
                                            console.log("Temenos habs", values);
                                            if(values[
                                                "rooms["+event.getAttribute("data-id")+"][" +
                                                    i +
                                                    "][preferred_room_id]"
                                            ]){
                                                send_rooms.push({
                                                    board_service_room_id: false,
                                                    checkin: event.getAttribute("data-checkin"),
                                                    checkout:
                                                        event.getAttribute("data-checkout"),
                                                    preferred_room_id:
                                                        values[
                                                            "rooms["+event.getAttribute("data-id")+"][" +
                                                                i +
                                                                "][preferred_room_id]"
                                                        ],
                                                    //'pms_property_id': event.getAttribute("data-pms_property_id"),
                                                    pricelist_id:
                                                        event.getAttribute("data-pricelist_id"),
                                                    price_per_room: values["rooms["+event.getAttribute("data-id")+"][" + i + "][price_per_room]"],
                                                    adults: values["rooms["+event.getAttribute("data-id")+"][" + i + "][adults]"],
                                                    room_type_id: values["rooms["+event.getAttribute("data-id")+"][" + i + "][room_type_id]"],
                                                });
                                            }
                                        }
                                        console.log("values -->", values);
                                        send_value = {
                                            id: event.getAttribute("data-id"),
                                            checkin: event.getAttribute("data-checkin"),
                                            checkout: event.getAttribute("data-checkout"),
                                            count_rooms_selected: num_rooms,
                                            pms_property_id:
                                                event.getAttribute("data-pms_property_id"),
                                            pricelist_id:
                                                event.getAttribute("data-pricelist_id"),
                                        };
                                        if (
                                            event.getAttribute("data-ubication_id") &&
                                            event.getAttribute("data-ubication_id") !=
                                                "false" &&
                                            event.getAttribute("data-ubication_id") !=
                                                "undefined"
                                        ) {
                                            send_value.ubication_id =
                                                event.getAttribute("data-ubication_id");
                                        }
                                        if (
                                            event.getAttribute("data-room_type_id") &&
                                            event.getAttribute("data-room_type_id") !=
                                                "false" &&
                                            event.getAttribute("data-room_type_id") !=
                                                "undefined"
                                        ) {
                                            send_value.room_type_id =
                                                event.getAttribute("data-room_type_id");
                                        }
                                        if (
                                            event.getAttribute("data-sale_category_id") &&
                                            event.getAttribute("data-sale_category_id") !=
                                                "false" &&
                                            event.getAttribute("data-sale_category_id") !=
                                                "undefined" &&
                                            values['agrupation_type'] != "room_type"
                                        ) {
                                            send_value.sale_category_id =
                                                event.getAttribute("data-sale_category_id");
                                        } else {
                                            if(values['agrupation_type'] != "room_type"){
                                                values.sale_category_id = "5"; //revisar
                                            }
                                        }
                                        if (
                                            event.getAttribute("board_service_room_id") &&
                                            event.getAttribute("board_service_room_id") !=
                                                "false" &&
                                            event.getAttribute("board_service_room_id") !=
                                                "undefined"
                                        ) {
                                            send_value.board_service_room_id =
                                                event.getAttribute("board_service_room_id");
                                        }
                                        if(send_rooms){
                                            send_value.rooms = send_rooms
                                        }
                                        launchChanges(event, send_value);
                                        $(colapse_name).collapse("show");
                                    } else {
                                        $(colapse_name).collapse("hide");
                                        $(price_per_group).html("0 €");
                                        var total_price = 0.0
                                        var price_groups_elements = document.getElementsByClassName('price_group');
                                        for (var i = 0; i < price_groups_elements.length; ++i) {
                                            var item = price_groups_elements[i];
                                            total_price = (parseFloat(total_price) + parseFloat(item.innerText.replace("€", ""))).toFixed(2);
                                        }
                                        $("form#booking_engine_form .price_total").html(
                                            parseFloat(total_price).toFixed(2) + "€"
                                        );
                                        $("form#booking_engine_form .price_taxes").html(
                                            (parseFloat(total_price) * 0.1).toFixed(2) + "€"
                                        );
                                    }
                                }
                            );
                            $("form#booking_engine_form #bookengine_table").on(
                                "change",
                                "select.call_booking_engine_group",
                                function (e) {
                                    console.log("lanzamos con el cambio de habitación");
                                    e.preventDefault();
                                    var event = e.currentTarget;
                                    var send_value = {};
                                    var send_rooms = [];
                                    var values = $(
                                        "form#booking_engine_form"
                                    ).serializeArray();
                                    var name_input =
                                    "#groupquantity" +
                                    event.getAttribute("data-parent_id");
                                    var num_rooms = $(name_input).val();
                                    values = form_to_json(values);

                                    for (
                                        var i = 0;
                                        i < parseInt(num_rooms);
                                        i++
                                    ) {
                                        send_rooms.push({
                                            board_service_room_id: false,
                                            checkin: event.getAttribute("data-checkin"),
                                            checkout:
                                                event.getAttribute("data-checkout"),
                                            preferred_room_id:
                                                values[
                                                    "rooms["+event.getAttribute("data-parent_id")+"][" +
                                                        i +
                                                        "][preferred_room_id]"
                                                ],
                                            //'pms_property_id': event.getAttribute("data-pms_property_id"),
                                            pricelist_id:
                                                event.getAttribute("data-pricelist_id"),
                                            price_per_room: values["rooms["+event.getAttribute("data-parent_id")+"][" + i + "][price_per_room]"],
                                            adults: values["rooms["+event.getAttribute("data-parent_id")+"][" + i + "][adults]"],
                                            room_type_id: values["rooms["+event.getAttribute("data-parent_id")+"][" + i + "][room_type_id]"],
                                        });
                                    }

                                    send_value = {
                                        id: event.getAttribute("data-parent_id"),
                                        checkin: event.getAttribute("data-checkin"),
                                        checkout: event.getAttribute("data-checkout"),
                                        count_rooms_selected: num_rooms,
                                        pms_property_id:
                                            event.getAttribute("data-pms_property_id"),
                                        pricelist_id:
                                            event.getAttribute("data-pricelist_id"),
                                        rooms: send_rooms,
                                    };
                                    if (
                                        event.getAttribute("data-ubication_id") &&
                                        event.getAttribute("data-ubication_id") !=
                                            "false" &&
                                        event.getAttribute("data-ubication_id") !=
                                            "undefined"
                                    ) {
                                        send_value.ubication_id =
                                            event.getAttribute("data-ubication_id");
                                    }
                                    if (
                                        event.getAttribute("data-room_type_id") &&
                                        event.getAttribute("data-room_type_id") !=
                                            "false" &&
                                        event.getAttribute("data-room_type_id") !=
                                            "undefined"
                                    ) {
                                        send_value.room_type_id =
                                            event.getAttribute("data-room_type_id");
                                    }
                                    if (
                                        event.getAttribute("data-sale_category_id") &&
                                        event.getAttribute("data-sale_category_id") !=
                                            "false" &&
                                        event.getAttribute("data-sale_category_id") !=
                                            "undefined" &&
                                        values['agrupation_type'] != "room_type"
                                    ) {
                                        send_value.sale_category_id =
                                            event.getAttribute("data-sale_category_id");
                                    } else {
                                        if(values['agrupation_type'] != "room_type"){
                                            send_value.sale_category_id = "5"; //revisar
                                        }
                                    }
                                    if (
                                        event.getAttribute("board_service_room_id") &&
                                        event.getAttribute("board_service_room_id") !=
                                            "false" &&
                                        event.getAttribute("board_service_room_id") !=
                                            "undefined"
                                    ) {
                                        send_value.board_service_room_id =
                                            event.getAttribute("board_service_room_id");
                                    }

                                    launchChanges(event, send_value);
                                }
                            );
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
                        } else {
                            new_data.type = "warning";
                            var alert_div = $(".o_pms_pwa_roomdoo_alerts");
                            var alert = core.qweb.render("pms_pwa.reservation_alerts", {
                                alert: new_data,
                            });
                            alert_div.append(alert);
                        }
                    });
                });
            }
        }
    );
    // Envío el formulario
    $("form#booking_engine_form").on("submit", function (e) {
        e.preventDefault();
        var event = e.currentTarget;
        var send_value = {};
        var send_rooms = [];
        var recibed_rooms = [];
        var values = $("form#booking_engine_form").serializeArray();

        $.each(
            values,
            function (key,val) {

                if(String(val['name']).search("rooms") == 0){
                    var rooms_array = String(val['name']).split("[");
                    rooms_array = rooms_array.slice(1);
                    if(!recibed_rooms[String(rooms_array[0]).replace("]", "")]){
                        recibed_rooms[String(rooms_array[0]).replace("]", "")] = {}
                    }
                    if(!recibed_rooms[String(rooms_array[0]).replace("]", "")][String(rooms_array[1]).replace("]", "")]){
                        recibed_rooms[String(rooms_array[0]).replace("]", "")][String(rooms_array[1]).replace("]", "")] = {};
                    }
                    recibed_rooms[String(rooms_array[0]).replace("]", "")][String(rooms_array[1]).replace("]", "")][String(rooms_array[2]).replace("]", "")] = val['value'];
                }
        });
        values = form_to_json(values);
        var index = 0;
        var count_rooms = 0;
        $.each(recibed_rooms, function (room_key,room_val) {
            if(room_val){
                $.each(room_val, function(key,val){
                    if(val){
                        send_rooms.push({
                            board_service_room_id: false,
                            checkin: values["checkin"],
                            checkout: values["checkout"],
                            preferred_room_id: val["preferred_room_id"],
                            pricelist_id: values["pricelist_id"],
                            price_per_room: val["price_per_room"],
                            adults: val["adults"],
                            room_type_id: val["room_type_id"],
                        });
                        count_rooms = count_rooms + 1;
                    };
                });
                index = index + 1;
            };
        });
        send_value = {
            partner_id: false,
            partner_name: values["name"] || values['partner_name'],
            mobile: values["mobile"] || "",
            email: values["mail"] || "",
            checkin: values["checkin"],
            checkout: values["checkout"],
            count_rooms_selected: count_rooms,
            pms_property_id: values["pms_property_id"] || "1",
            pricelist_id: values["pricelist_id"],
            reservation_type: values["reservation_type"],
            rooms: send_rooms,

        };
        if (
            values["ubication_id"] &&
            values["ubication_id"] != "false" &&
            values["ubication_id"] != "undefined"
        ) {
            send_value.ubication_id = values["ubication_id"];
        }
        if (
            values["room_type_id"] &&
            values["room_type_id"] != "false" &&
            values["room_type_id"] != "undefined"
        ) {
            send_value.room_type_id = values["room_type_id"];
        }
        if (
            values["sale_category_id"] &&
            values["sale_category_id"] != "false" &&
            values["sale_category_id"] != "undefined" &&
            values['agrupation_type'] != "room_type"
        ) {
            send_value.sale_category_id = values["sale_category_id"];
        } else {
            if(values['agrupation_type'] != "room_type"){
                send_value.sale_category_id = "5"; //revisar
            }
        }
        if (
            values["board_service_room_id"] &&
            values["board_service_room_id"] != "false" &&
            values["board_service_room_id"] != "undefined"
        ) {
            send_value.board_service_room_id = event.getAttribute(
                "board_service_room_id"
            );
        }
        console.log("envio en form -->", send_value);
        ajax.jsonRpc(
            "/booking_engine_submit",
            "call",
            send_value
        ).then(function (new_data) {
            if (new_data) {
                console.log(new_data);
                if (new_data.reservation_id) {
                    // Cierra modal
                    $(
                        "div.o_pms_pwa_new_reservation_modal"
                    ).modal("toggle");
                    // abre modal
                    try{
                        $("<td class='prueba o_pms_pwa_calendar_reservation' data-id='" + new_data.reservation_id + "'></td>").appendTo( "body" );
                        console.log(td);
                        td[0].click();
                        td.remove();

                    } catch (error) {
                        console.log(error);
                        //location.href = "/reservation/" + new_data.reservation_id;
                    }
                } else {
                    new_data.type = "warning";
                    new_data.message = _t(
                        "An undefined error has ocurred, please try again later." + new_data
                    );
                    var alert_div = $(".o_pms_pwa_roomdoo_alerts");
                    var alert = core.qweb.render("pms_pwa.reservation_alerts", {
                        alert: new_data,
                    });
                    alert_div.append(alert);
                }
            }
        });
    });

    $("#o_pms_pwa_new_reservation_modal").on("hidden.bs.modal", function () {
        $("form#booking_engine_form")[0].reset();
        console.log("Entro al hacer reset");
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        var checkin_date = today.toLocaleDateString(
            document.documentElement.lang,
            date_options
        );
        var checkout_date = tomorrow.toLocaleDateString(
            document.documentElement.lang,
            date_options
        );
        $("#o_pms_pwa_new_reservation_modal")
            .find("input[name='checkin']")
            .val(checkin_date);
        $("#o_pms_pwa_new_reservation_modal")
            .find("input[name='checkout']")
            .val(checkout_date);
        $("#o_pms_pwa_new_reservation_modal")
            .find("input[name='new_reservation_date_modal_reservation']")
            .val(checkin_date + " - " + checkout_date);
    });

    publicWidget.registry.ReservationTableWidget = publicWidget.Widget.extend({
        selector: "table.o_pms_pwa_reservation_list_table, #o_pms_detail_reservation",
        xmlDependencies: [
            "/pms_pwa/static/src/xml/pms_pwa_roomdoo_reservation_modal.xml",
        ],
        events: {
            "click tr.o_pms_pwa_reservation:not(.accordion) > td:not(:last-child)":
                "_onClickReservationButton",
            "click td.o_pms_pwa_calendar_reservation": "_onClickReservationButton",
            "click .o_pms_pwa_button_assign": "_onClickAssingButton",
            "click tbody > tr > td:not(:last-child) a": "_onClickNotLastChildA",
            "click .o_pms_pwa_button_checkin": "_onClickCheckinButton",
            "click .o_pms_pwa_button_cancel": "_onClickCancelButton",
            "click .o_pms_pwa_button_checkout": "_onClickCheckoutButton",
            "click .o_pms_pwa_button_payment": "_onClickPaymentButton",
            "click .o_pms_pwa_button_invoice": "_onClickInvoiceButton",
        },
        /**
         * @override
         */

        start: function () {
            var self = this;
            self.reservation_text = _t("Reservation");
            self.info_text = _t("More info");
            self.unread_text = _t("unread message(s)");
            self.room_type_text = _t("Room type");
            self.room_number_text = _t("Room nº");
            self.nights_number_text = _t("Nights nº");
            self.adults_number_text = _t("Adults nº");
            self.check_in_text = _t("Check in");
            self.check_in_time_text = _t("Check in time");
            self.check_out_text = _t("Check out");
            self.check_out_time_text = _t("Check out time");
            self.room_price_text = _t("Room price");
            self.sales_channel_text = _t("Sales channel");
            self.extras_text = _t("Extras");
            self.card_text = _t("Reservation card number");
            self.total_nights_text = _t("Total nights price");
            self.total_text = _t("Total reservation price");
            self.outstanding_text = _t("Outstanding");
            self.pay_text = _t("Pay");
            self.notes_text = _t("Notes");
            return this._super.apply(this, arguments);
        },
        displayContent: function (xmlid, render_values) {
            var html = core.qweb.render(xmlid, render_values);
            $("div.o_pms_pwa_roomdoo_reservation_modal").html(html);
            $("div.o_pms_pwa_reservation_modal").modal();
        },
        modalButtonsOnChange: function () {
            var self = this;
            $("div.o_pms_pwa_modal_buttons button.o_pms_pwa_button_assign").on(
                "click",
                function (event) {
                    event.preventDefault();
                    /* var reservation_id = $("#o_pms_pwa_reservation_modal")[0].getAttribute("data-id"); */
                }
            );

            $(
                "div.o_pms_pwa_modal_buttons button.o_pms_pwa_button_checkin, a.o_pms_pwa_button_checkin"
            ).on("click", function (event) {
                event.preventDefault();
                self._onClickCheckinButton(event);
            });

            $("div.o_pms_pwa_modal_buttons button.o_pms_pwa_button_checkout").on(
                "click",
                function (event) {
                    event.preventDefault();
                    self._onClickCheckoutButton(event);
                }
            );

            $("div.o_pms_pwa_modal_buttons button.o_pms_pwa_button_payment").on(
                "click",
                function (event) {
                    event.preventDefault();
                    self._onClickPaymentButton(event);
                }
            );

            $("div.o_pms_pwa_modal_buttons button.o_pms_pwa_button_invoice").on(
                "click",
                function (event) {
                    event.preventDefault();
                    self._onClickInvoiceButton(event);
                }
            );

            $("div.o_pms_pwa_modal_buttons button.o_pms_pwa_button_cancel").on(
                "click",
                function (event) {
                    event.preventDefault();
                    self._onClickCancelButton(event);
                }
            );
        },
        reloadReservationInfo: function (data_id = false) {
            if (String(window.location.href).includes(String("/reservation/list"))) {
                ajax.jsonRpc("/reservation/json_data", "call", {
                    reservation_id: data_id,
                }).then(function (updated_data) {
                    setTimeout(function () {
                        if (updated_data) {
                            try {
                                $(String("#reservation_" + data_id)).find(
                                    "td"
                                )[2].innerHTML =
                                    updated_data.preferred_room_id.name +
                                    "<br/> <span class='o_pms_pwa_wler'>" +
                                    updated_data.room_type_id.default_code +
                                    "</span>";
                                $(String("#reservation_" + data_id)).find(
                                    "td"
                                )[3].innerHTML =
                                    updated_data.checkin +
                                    "<br/> <span class='o_pms_pwa_wler'>" +
                                    updated_data.arrival_hour +
                                    "</span>";
                                $(String("#reservation_" + data_id)).find(
                                    "td"
                                )[4].innerHTML =
                                    updated_data.checkout +
                                    "<br/> <span class='o_pms_pwa_wler'>" +
                                    updated_data.departure_hour +
                                    "</span>";
                                if (
                                    updated_data.agency_id &&
                                    updated_data.agency_id.url
                                ) {
                                    $(String("#reservation_" + data_id)).find(
                                        "td"
                                    )[5].innerHTML =
                                        "<img src=" +
                                        updated_data.agency_id.url +
                                        " width='80' title='" +
                                        updated_data.agency_id.name +
                                        "' alt='" +
                                        updated_data.agency_id.name +
                                        "'/>";
                                } else {
                                    if (
                                        updated_data.channel_type_id &&
                                        updated_data.user_name
                                    ) {
                                        var chan_name = "";
                                        if (updated_data.channel_type_id.name) {
                                            var chan_name =
                                                updated_data.channel_type_id.name;
                                        }
                                        $(String("#reservation_" + data_id)).find(
                                            "td"
                                        )[5].innerHTML =
                                            chan_name +
                                            "<br/> <span class='o_pms_pwa_wler'>" +
                                            updated_data.user_name +
                                            "</span>";
                                    }
                                }
                                $(String("#reservation_" + data_id)).find(
                                    "td"
                                )[6].innerHTML =
                                    Math.round(
                                        (updated_data.folio_id.amount_total +
                                            Number.EPSILON) *
                                            100
                                    ) / 100;
                                $(String("#reservation_" + data_id)).find(
                                    "td"
                                )[7].innerHTML =
                                    Math.round(
                                        (updated_data.folio_id.outstanding_vat +
                                            Number.EPSILON) *
                                            100
                                    ) / 100;
                                if (updated_data.partner_requests) {
                                    $(String("#reservation_" + data_id)).find(
                                        "td"
                                    )[8].innerHTML = updated_data.partner_requests.substring(
                                        0,
                                        25
                                    );
                                }
                                if (
                                    updated_data.board_service_room_id &&
                                    updated_data.board_service_room_id.name
                                ) {
                                    $(String("#reservation_" + data_id)).find(
                                        "td"
                                    )[9].innerHTML =
                                        updated_data.board_service_room_id.name;
                                }
                                $(String("#reservation_" + data_id)).find(
                                    "td"
                                )[10].firstElementChild.outerHTML =
                                    updated_data.primary_button;
                                $(String("#reservation_" + data_id)).find(
                                    "td"
                                )[10].lastElementChild.lastElementChild.innerHTML =
                                    updated_data.secondary_buttons;
                            } catch (error) {
                                console.log(error);
                            }
                        }
                    });
                });
            } else {
                ajax.jsonRpc("/reservation/json_data", "call", {
                    reservation_id: data_id,
                }).then(function (updated_data) {
                    setTimeout(function () {
                        var date_list = false;
                        try {
                            //var room_type_id = event.currentTarget.getAttribute("data-id");
                            var date_list = $('input[name="date_list"]').val();
                            var selected_display = $(
                                'input[name="selected_display"]'
                            ).val();
                            ajax.jsonRpc("/calendar/line", "call", {
                                data_id: updated_data.room_type_id.id,
                                range_date: date_list,
                                selected_display: selected_display,
                            }).then(function (data) {
                                var html = core.qweb.render("pms_pwa.calendar_line", {
                                    room_type_id: updated_data.room_type_id.id,
                                    obj_list: data.reservations,
                                    csrf_token: csrf_token,
                                });
                                $(
                                    String(
                                        "#collapse_accordion_" +
                                            updated_data.room_type_id.id
                                    )
                                ).html(html);
                            });
                        } catch (error) {
                            console.log(error);
                            location.reload();
                        }
                    });
                });
            }
        },
        displayDataAlert: function (result, data_id = false) {
            var self = this;
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
            if (data_id) {
                self.reloadReservationInfo(data_id);
            }

            /* $(String("#reservation_" + data_id)).load(
                String(window.location.href + " #reservation_" + data_id + " td")
            ); */
        },
        refreshMultiModal: function (result, data_id = false) {
            var allowed_fields = ["room_numbers"];
            var folio_reservation_data =
                JSON.parse(result).reservation.folio_reservations;

            for (let i = 0; i < folio_reservation_data.length; i++) {
                var allowed_fields = ["room_numbers"];
                $.each(allowed_fields, function (key, value) {
                    try {
                        var select = $(
                            'table#multi_reservation_modal tr[data-id="' +
                                folio_reservation_data[i]["id"] +
                                '"] [data-select="' +
                                value +
                                '"]'
                        );
                    } catch (error) {
                        console.log(error);
                    }

                    if (select.length != 0) {
                        select.empty();
                        // if (
                        //     !folio_reservation_data[i][
                        //         relation_values[value]
                        //     ] &
                        //     (folio_reservation_data[i][
                        //         relation_values[value]
                        //     ] ==
                        //         0)
                        // ) {
                        //     select.append(
                        //         '<option value="" selected></option>'
                        //     );
                        // }
                        $.each(
                            folio_reservation_data[i][value],
                            function (subkey, subvalue) {
                                if (
                                    subvalue["id"] ==
                                    folio_reservation_data[i][relation_values[value]].id
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
                            }
                        );
                    }
                    delete folio_reservation_data[i][value];
                });
                $.each(folio_reservation_data[i], function (key, value) {
                    var input = $(
                        "table#multi_reservation_modal tr[data-id='" +
                            folio_reservation_data[i]["id"] +
                            "'] input[name='" +
                            key +
                            "']"
                    );
                });
            }
        },
        /* OnClick events */
        _onClickReservationButton: function (event) {
            event.preventDefault();
            var self = this;
            var reservation_id = event.currentTarget.parentNode.getAttribute("data-id");
            /* Añadido para que sea válido en calendario */
            if (!reservation_id) {
                reservation_id = event.currentTarget.getAttribute("data-id");
            }
            var reservation_data = false;
            /* RPC call to get the reservation data */
            ajax.jsonRpc("/reservation/json_data", "call", {
                reservation_id: reservation_id,
            }).then(function (reservation_data) {
                setTimeout(function () {
                    if (reservation_data) {
                        /* End missin data */

                        self.displayContent("pms_pwa.roomdoo_reservation_modal", {
                            reservation: reservation_data,
                            payment_methods: reservation_data.payment_methods,
                            texts: {
                                reservation_text: this.reservation_text,
                                info_text: this.info_text,
                                unread_text: this.unread_text,
                                room_type_text: this.room_type_text,
                                room_number_text: this.room_number_text,
                                nights_number_text: this.nights_number_text,
                                adults_number_text: this.adults_number_text,
                                check_in_text: this.check_in_text,
                                check_in_time_text: this.check_in_time_text,
                                check_out_text: this.check_out_text,
                                check_out_time_text: this.check_out_time_text,
                                room_price_text: this.room_price_text,
                                sales_channel_text: this.sales_channel_text,
                                extras_text: this.extras_text,
                                card_text: this.card_text,
                                total_text: this.total_text,
                                outstanding_text: this.outstanding_text,
                                pay_text: this.pay_text,
                                notes_text: this.notes_text,
                            },
                        });

                        self.modalButtonsOnChange();

                        $("#o_pms_pwa_reservation_modal").on(
                            "hidden.bs.modal",
                            function () {
                                try {
                                    var data_id = $("#o_pms_pwa_reservation_modal")[0]
                                        .dataset.id;
                                    if (data_id) {
                                        self.reloadReservationInfo(data_id);
                                    }
                                } catch (error) {
                                    console.log("Error ---", error);
                                }
                            }
                        );
                        // Show more // less
                        try {
                            $("input[name^='o_pms_pwa_service_line_']").map(
                                function () {
                                    var element_id = $(this).val();
                                    if (
                                        $(
                                            ".o_roomdoo_hide_show_service_" +
                                                element_id +
                                                ""
                                        ).length > 3
                                    ) {
                                        $(
                                            ".o_roomdoo_hide_show_service_" +
                                                element_id +
                                                ":gt(2)"
                                        ).hide();
                                        $(".o_roomdoo_hide_show-more2").show();
                                    }
                                    return false;
                                }
                            );
                            $(".o_roomdoo_hide_show-services-more").on(
                                "click",
                                function () {
                                    var service_id = $(this).attr("data-service-id");
                                    $(
                                        ".o_roomdoo_hide_show_service_" +
                                            service_id +
                                            ":gt(2)"
                                    ).toggle();
                                    // Change text of show more element just for demonstration purposes to this demo
                                    if ($(this).text() === "Ver más") {
                                        $(this).text("Ver menos");
                                    } else {
                                        $(this).text("Ver más");
                                    }
                                }
                            );
                        } catch (error) {
                            console.log("Error ---", error);
                        }
                        // On change inputs reservation modal
                        $("form.o_pms_pwa_reservation_form").on(
                            "change",
                            "select, input[type='checkbox'], input[type='radio'], input[type='text'][name='range_check_date_modal']",
                            function (new_event) {
                                var values = {};
                                // Set checkin & checkout separated
                                if (
                                    new_event.currentTarget.name ==
                                    "range_check_date_modal"
                                ) {
                                    let value_range_picker =
                                        new_event.currentTarget.value;
                                    values.checkin = value_range_picker.split(" - ")[0];
                                    values.checkout =
                                        value_range_picker.split(" - ")[1];
                                } else {
                                    if (new_event.currentTarget.dataset.service_id) {
                                        var service_key = "add_service";
                                        if (!new_event.currentTarget.checked) {
                                            service_key = "del_service";
                                        }
                                        values[service_key] =
                                            new_event.currentTarget.dataset.service_id;
                                    } else {
                                        if (
                                            new_event.currentTarget.dataset.main_field
                                        ) {
                                            var main_field =
                                                new_event.currentTarget.dataset
                                                    .main_field;
                                            var field_id =
                                                new_event.currentTarget.dataset
                                                    .field_id;
                                            values[main_field] = {};
                                            values[main_field][field_id] = {};
                                            if (
                                                new_event.currentTarget.dataset
                                                    .subservice_name
                                            ) {
                                                var subservice_name =
                                                    new_event.currentTarget.dataset
                                                        .subservice_name;
                                                var subservice_field_id =
                                                    new_event.currentTarget.dataset
                                                        .subservice_field_id;
                                                values[main_field][field_id][
                                                    subservice_name
                                                ] = {};
                                                values[main_field][field_id][
                                                    subservice_name
                                                ][subservice_field_id] = {};
                                                values[main_field][field_id][
                                                    subservice_name
                                                ][subservice_field_id][
                                                    new_event.currentTarget.name
                                                ] = new_event.currentTarget.value;
                                            } else {
                                                values[main_field][field_id][
                                                    new_event.currentTarget.name
                                                ] = new_event.currentTarget.value;
                                            }
                                        } else {
                                            values[new_event.currentTarget.name] =
                                                new_event.currentTarget.value;
                                        }
                                    }
                                }

                                // Call to set the new values

                                ajax.jsonRpc(
                                    "/reservation/" + reservation_id + "/onchange_data",
                                    "call",
                                    values
                                ).then(function (new_data) {
                                    setTimeout(function () {
                                        if (new_data) {
                                            if (!JSON.parse(new_data).result) {
                                                self.displayDataAlert(new_data);
                                            }
                                            var reservation_data =
                                                JSON.parse(new_data).reservation;
                                            if (
                                                values &&
                                                ("add_service" in values ||
                                                    "board_service_room_id" in values)
                                            ) {
                                                self.displayDataAlert(new_data);
                                                // cierra modal
                                                $(
                                                    "div.o_pms_pwa_reservation_modal"
                                                ).modal("toggle");
                                                try {
                                                    var selector =
                                                        "tr[data-id=" +
                                                        reservation_data["id"] +
                                                        "]";
                                                    var test = $(selector);
                                                    if (test.length != 0) {
                                                        $(selector)
                                                            .find("td.first-col")
                                                            .click();
                                                    } else {
                                                        // abre modal
                                                        var selector =
                                                            "td[data-id=" +
                                                            reservation_data["id"] +
                                                            "]";
                                                        $(selector).click();
                                                    }
                                                } catch (error) {
                                                    console.log(error);
                                                }
                                            }

                                            // Refresh reservation modal values and sync with new data
                                            var allowed_fields = [
                                                "allowed_agency_ids",
                                                "allowed_board_service_room_ids",
                                                "reservation_types",
                                                "allowed_channel_type_ids",
                                                "allowed_pricelists",
                                                "allowed_segmentations",
                                                "room_types",
                                                "room_numbers",
                                            ];
                                            $.each(
                                                allowed_fields,
                                                function (key, value) {
                                                    try {
                                                        var select = $(
                                                            'form.o_pms_pwa_reservation_form [data-select="' +
                                                                value +
                                                                '"]'
                                                        );
                                                    } catch (error) {
                                                        console.log(error);
                                                    }
                                                    if (select.length != 0) {
                                                        select.empty();
                                                        if (
                                                            !reservation_data[
                                                                relation_values[value]
                                                            ] &
                                                            (reservation_data[
                                                                relation_values[value]
                                                            ] ==
                                                                0)
                                                        ) {
                                                            select.append(
                                                                '<option value="" selected></option>'
                                                            );
                                                        }
                                                        $.each(
                                                            reservation_data[value],
                                                            function (
                                                                subkey,
                                                                subvalue
                                                            ) {
                                                                if (
                                                                    subvalue["id"] ==
                                                                    reservation_data[
                                                                        relation_values[
                                                                            value
                                                                        ]
                                                                    ].id
                                                                ) {
                                                                    var option =
                                                                        new Option(
                                                                            subvalue[
                                                                                "name"
                                                                            ],
                                                                            subvalue[
                                                                                "id"
                                                                            ],
                                                                            false,
                                                                            true
                                                                        );
                                                                } else {
                                                                    var option =
                                                                        new Option(
                                                                            subvalue[
                                                                                "name"
                                                                            ],
                                                                            subvalue[
                                                                                "id"
                                                                            ],
                                                                            false,
                                                                            false
                                                                        );
                                                                }
                                                                $(option).html(
                                                                    subvalue["name"]
                                                                );
                                                                select.append(option);
                                                            }
                                                        );
                                                    }
                                                    delete reservation_data[value];
                                                }
                                            );
                                            $.each(
                                                reservation_data,
                                                function (key, value) {
                                                    var input = $(
                                                        "form.o_pms_pwa_reservation_form input[name='" +
                                                            key +
                                                            "']"
                                                    );
                                                    if (input.length != 0) {
                                                        input.val(value);
                                                    } else {
                                                        if (
                                                            !fields_to_avoid.includes(
                                                                key
                                                            )
                                                        ) {
                                                            $(
                                                                "form.o_pms_pwa_reservation_form select[name='" +
                                                                    key +
                                                                    "'] option[value='" +
                                                                    value +
                                                                    "']"
                                                            ).prop("selected", true);
                                                        }
                                                    }
                                                }
                                            );
                                            // refresh total
                                            let a =
                                                document.getElementsByClassName(
                                                    "price_total"
                                                );
                                            a.innerText =
                                                JSON.parse(
                                                    new_data
                                                ).reservation.price_total;
                                            // refresh pending amount
                                            try {
                                                let b =
                                                    document.getElementsByClassName(
                                                        "pending_amount"
                                                    );
                                                b.innerText =
                                                    JSON.parse(
                                                        new_data
                                                    ).reservation.folio_pending_amount;
                                            } catch (error) {
                                                console.log(error);
                                            }
                                            //refresh multimodal data
                                            if (
                                                reservation_data.folio_reservations
                                                    .length > 1
                                            ) {
                                                self.refreshMultiModal(new_data);
                                            }
                                        }
                                    }, 10);
                                });
                            }
                        );

                        $("form.o_pms_pwa_reservation_form").on(
                            "focusout",
                            "input[type='text'][name!='range_check_date_modal'], input[type='number'], input[type='radio'], input[type='tel'], input[type='email'], input[type='time']",
                            function (new_event) {
                                var values = {};
                                if (new_event.currentTarget.dataset.main_field) {
                                    var main_field =
                                        new_event.currentTarget.dataset.main_field;
                                    var field_id =
                                        new_event.currentTarget.dataset.field_id;
                                    values[main_field] = {};
                                    values[main_field][field_id] = {};
                                    if (
                                        new_event.currentTarget.dataset.subservice_name
                                    ) {
                                        var subservice_name =
                                            new_event.currentTarget.dataset
                                                .subservice_name;
                                        var subservice_field_id =
                                            new_event.currentTarget.dataset
                                                .subservice_field_id;
                                        values[main_field][field_id][subservice_name] =
                                            {};
                                        values[main_field][field_id][subservice_name][
                                            subservice_field_id
                                        ] = {};
                                        values[main_field][field_id][subservice_name][
                                            subservice_field_id
                                        ][new_event.currentTarget.name] =
                                            new_event.currentTarget.value;
                                    } else {
                                        values[main_field][field_id][
                                            new_event.currentTarget.name
                                        ] = new_event.currentTarget.value;
                                    }
                                } else {
                                    values[new_event.currentTarget.name] =
                                        new_event.currentTarget.value;
                                }
                                // Call to set the new values
                                ajax.jsonRpc(
                                    "/reservation/" + reservation_id + "/onchange_data",
                                    "call",
                                    values
                                ).then(function (new_data) {
                                    setTimeout(function () {
                                        if (new_data) {
                                            if (!JSON.parse(new_data).result) {
                                                self.displayDataAlert(new_data);
                                            }
                                            // Refresh reservation modal values and sync with new data
                                            var allowed_fields = [
                                                "allowed_agency_ids",
                                                "allowed_board_service_room_ids",
                                                "reservation_types",
                                                "allowed_channel_type_ids",
                                                "allowed_pricelists",
                                                "allowed_segmentations",
                                                "room_types",
                                                "room_numbers",
                                            ];
                                            var reservation_data =
                                                JSON.parse(new_data).reservation;
                                            $.each(
                                                allowed_fields,
                                                function (key, value) {
                                                    try {
                                                        var select = $(
                                                            'form.o_pms_pwa_reservation_form [data-select="' +
                                                                value +
                                                                '"]'
                                                        );
                                                    } catch (error) {
                                                        console.log(error);
                                                    }
                                                    if (select.length != 0) {
                                                        select.empty();
                                                        if (
                                                            !reservation_data[
                                                                relation_values[value]
                                                            ] &
                                                            (reservation_data[
                                                                relation_values[value]
                                                            ] ==
                                                                0)
                                                        ) {
                                                            select.append(
                                                                '<option value="" selected></option>'
                                                            );
                                                        }
                                                        $.each(
                                                            reservation_data[value],
                                                            function (
                                                                subkey,
                                                                subvalue
                                                            ) {
                                                                if (
                                                                    subvalue["id"] ==
                                                                    reservation_data[
                                                                        relation_values[
                                                                            value
                                                                        ]
                                                                    ].id
                                                                ) {
                                                                    var option =
                                                                        new Option(
                                                                            subvalue[
                                                                                "name"
                                                                            ],
                                                                            subvalue[
                                                                                "id"
                                                                            ],
                                                                            false,
                                                                            true
                                                                        );
                                                                } else {
                                                                    var option =
                                                                        new Option(
                                                                            subvalue[
                                                                                "name"
                                                                            ],
                                                                            subvalue[
                                                                                "id"
                                                                            ],
                                                                            false,
                                                                            false
                                                                        );
                                                                }
                                                                $(option).html(
                                                                    subvalue["name"]
                                                                );
                                                                select.append(option);
                                                            }
                                                        );
                                                    }
                                                    delete reservation_data[value];
                                                }
                                            );
                                            $.each(
                                                reservation_data,
                                                function (key, value) {
                                                    var input = $(
                                                        "form.o_pms_pwa_reservation_form input[name='" +
                                                            key +
                                                            "']"
                                                    );
                                                    if (input.length != 0) {
                                                        input.val(value);
                                                    } else {
                                                        if (
                                                            !fields_to_avoid.includes(
                                                                key
                                                            )
                                                        ) {
                                                            $(
                                                                "form.o_pms_pwa_reservation_form select[name='" +
                                                                    key +
                                                                    "'] option[value='" +
                                                                    value +
                                                                    "']"
                                                            ).prop("selected", true);
                                                        }
                                                    }
                                                }
                                            );

                                            // refresh total
                                            let a =
                                                document.getElementsByClassName(
                                                    "price_total"
                                                );
                                            a.innerText =
                                                JSON.parse(
                                                    new_data
                                                ).reservation.price_total;

                                            // refresh pending amount.
                                            try {
                                                let b =
                                                    document.getElementsByClassName(
                                                        "pending_amount"
                                                    );
                                                b.innerText =
                                                    JSON.parse(
                                                        new_data
                                                    ).reservation.folio_pending_amount;
                                            } catch (error) {
                                                console.log(error);
                                            }
                                            //refresh multimodal data
                                            if (
                                                reservation_data.folio_reservations
                                                    .length > 1
                                            ) {
                                                self.refreshMultiModal(new_data);
                                            }
                                        }
                                    }, 0);
                                });
                            }
                        );

                        // On confirm assign
                        $(".o_pms_pwa_button_assign_confirm").on(
                            "click",
                            function (new_event) {
                                new_event.preventDefault();
                                var button = new_event.currentTarget;
                                ajax.jsonRpc(
                                    button.attributes.url.value,
                                    "call",
                                    {}
                                ).then(function (new_data) {
                                    $(".o_pms_pwa_reservation_modal").modal("toggle");
                                    self.displayDataAlert(
                                        new_data,
                                        reservation_data.id
                                    );
                                });
                            }
                        );

                        // DATE RANGE MODAL
                        $(function () {
                            if (document.documentElement.lang == "es-ES") {
                                $(
                                    'input[name="range_check_date_modal"]'
                                ).daterangepicker(
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
                                        startDate: reservation_data.checkin,
                                        endDate: reservation_data.checkout,
                                    },
                                    function (start, end, label) {
                                        $('input[name="checkin"]').val(start);
                                        $('input[name="checkout"]').val(end);
                                        let nights = 1;
                                        // Hours*minutes*seconds*milliseconds
                                        const oneDay = 24 * 60 * 60 * 1000;
                                        const firstDate = new Date(start);
                                        const secondDate = new Date(end);
                                        const diffDays = Math.round(
                                            Math.abs((firstDate - secondDate) / oneDay)
                                        );
                                        nights = diffDays - 1;
                                        $('input[name="nights"]').val(nights);
                                        // $("form#reservation_detail").submit();
                                    }
                                );
                            } else {
                                $(
                                    'input[name="range_check_date_modal"]'
                                ).daterangepicker(
                                    {
                                        locale: {
                                            direction: "ltr",
                                            format: "MM/DD/YYYY",
                                            separator: " - ",
                                        },
                                        opens: "left",
                                        showCustomRangeLabel: false,
                                        startDate: reservation_data.checkin,
                                        endDate: reservation_data.checkout,
                                    },
                                    function (start, end, label) {
                                        $('input[name="checkin"]').val(start);
                                        $('input[name="checkout"]').val(end);
                                        let nights = 1;
                                        // Hours*minutes*seconds*milliseconds
                                        const oneDay = 24 * 60 * 60 * 1000;
                                        const firstDate = new Date(start);
                                        const secondDate = new Date(end);
                                        const diffDays = Math.round(
                                            Math.abs((firstDate - secondDate) / oneDay)
                                        );
                                        nights = diffDays - 1;
                                        $('input[name="nights"]').val(nights);
                                        // $("form#reservation_detail").submit();
                                    }
                                );
                            }
                        });
                        // CHANGES IN MULTI MODAL RESERVATIONS
                        $("#multi_reservation_modal").on(
                            "click",
                            "a",
                            function (new_event) {
                                var modal_reservation_id = new_event.currentTarget
                                    .closest("tr")
                                    .getAttribute("data-id");
                                // cierro modal
                                $("div.o_pms_pwa_reservation_modal").modal("toggle");
                                // abro modal
                                try {
                                    var selector =
                                        "td[data-id=" + modal_reservation_id + "]";
                                    var test = $(selector);
                                    if (test.length != 0) {
                                        $(selector).click();
                                    } else {
                                        var selector =
                                            "tr[data-id=" + modal_reservation_id + "]";
                                        $(selector).find("td.first-col").click();
                                    }
                                } catch (error) {
                                    console.log(error);
                                }
                            }
                        );
                        $("#multi_reservation_modal").on(
                            "change",
                            "input, select",
                            function (new_event) {
                                var modal_reservation_id = new_event.currentTarget
                                    .closest("tr")
                                    .getAttribute("data-id");
                                // console.log(modal_reservation_id);
                                var values = {};
                                // Set checkin & checkout separated
                                if (
                                    new_event.currentTarget.name ==
                                    "range_check_date_modal"
                                ) {
                                    let value_range_picker =
                                        new_event.currentTarget.value;
                                    values.checkin = value_range_picker.split(" - ")[0];
                                    values.checkout =
                                        value_range_picker.split(" - ")[1];
                                } else {
                                    values[new_event.currentTarget.name] =
                                        new_event.currentTarget.value;
                                }
                                // si es el mismo id, cambios en modal, sino, llamo función
                                if (reservation_id == modal_reservation_id) {
                                    try {
                                        if (
                                            new_event.currentTarget.name ==
                                            "preferred_room_id"
                                        ) {
                                            var select = $(
                                                'form.o_pms_pwa_reservation_form [data-select="room_numbers"]'
                                            );
                                            select.val(new_event.currentTarget.value);
                                            select.trigger("change");
                                        } else {
                                            let input = $(
                                                "form.o_pms_pwa_reservation_form input[name='" +
                                                    new_event.currentTarget.name +
                                                    "']"
                                            );

                                            input.val(new_event.currentTarget.value);

                                            input.trigger("change");
                                        }
                                    } catch {
                                        console.log("ERROR");
                                    }
                                } else {
                                    var values = {};
                                    values["folio_reservations"] = {};
                                    values["folio_reservations"]["id"] =
                                        modal_reservation_id;

                                    // Set checkin & checkout separated
                                    if (
                                        new_event.currentTarget.name ==
                                        "range_check_date_modal"
                                    ) {
                                        let value_range_picker =
                                            new_event.currentTarget.value;
                                        values["folio_reservations"]["checkin"] =
                                            value_range_picker.split(" - ")[0];
                                        values["folio_reservations"]["checkout"] =
                                            value_range_picker.split(" - ")[1];
                                    } else {
                                        values["folio_reservations"][
                                            new_event.currentTarget.name
                                        ] = new_event.currentTarget.value;
                                    }
                                    ajax.jsonRpc(
                                        "/reservation/" +
                                            modal_reservation_id +
                                            "/onchange_data",
                                        "call",
                                        values
                                    ).then(function (new_data) {
                                        //console.log("NNN --->", new_data);
                                        if (new_data) {
                                            if (!JSON.parse(new_data).result) {
                                                self.displayDataAlert(new_data);
                                            }
                                        }
                                        self.refreshMultiModal(new_data);
                                    });
                                }
                            }
                        );
                        // Llamas a multiaction en modal
                        $("a.call_to_action_modal").on("click", function (modal_event) {
                            modal_event.preventDefault();
                            var button = modal_event.currentTarget;
                            var checkedValues = $("input:checkbox:checked")
                                .map(function () {
                                    return this.value;
                                })
                                .get();
                            if (checkedValues) {
                                ajax.jsonRpc(button.attributes.url.value, "call", {
                                    reservation_ids: checkedValues,
                                }).then(function (new_data) {
                                    self.displayDataAlert(new_data);
                                });
                            }
                        });

                        // Check all
                        $("#multi_reservation_modal #checkAll").change(function () {
                            $("input:checkbox").prop(
                                "checked",
                                $(this).prop("checked")
                            );
                        });

                        // Modal multi cambios
                        // input change color
                        $("#multiChangeModal").on(
                            "change",
                            "input[type='number']",
                            function () {
                                this.style.backgroundColor = "yellow";
                            }
                        );
                        $("#multiChangeModal input:checkbox").change(function () {
                            if (this.name == "apply_on_all_week") {
                                $("#multiChangeModal input:checkbox").prop(
                                    "checked",
                                    $(this).prop("checked")
                                );
                            } else {
                                $(
                                    "#multiChangeModal input[name='apply_on_all_week']:checkbox"
                                ).prop("checked", false);
                            }
                        });
                        $("#multiChangeModal button.send_form_multi_change").on(
                            "click",
                            function (modal_event) {
                                modal_event.preventDefault();
                                var button = modal_event.currentTarget;
                                var checkedValues = $(
                                    "#multi_reservation_modal input:checkbox:checked"
                                )
                                    .map(function () {
                                        return this.value;
                                    })
                                    .get();
                                var days_week = {};
                                var apply_on_all_week = false;
                                var new_price = $(
                                    "#multiChangeModal input[name='new_price']"
                                ).val();
                                $("#multi_days_values input:checkbox:checked")
                                    .map(function () {
                                        if (this.name != "apply_on_all_week") {
                                            days_week[this.name] = this.value;
                                        } else {
                                            apply_on_all_week = this.value;
                                        }
                                    })
                                    .get();
                                if (checkedValues) {
                                    ajax.jsonRpc(button.attributes.url.value, "call", {
                                        reservation_ids: checkedValues,
                                        apply_on_all_week: apply_on_all_week,
                                        days_week: days_week,
                                        new_price: $(
                                            "#multiChangeModal input[name='new_price']"
                                        ).val(),
                                        new_discount: $(
                                            "#multiChangeModal input[name='new_discount']"
                                        ).val(),
                                    }).then(function (new_data) {
                                        self.displayDataAlert(new_data);
                                    });
                                }
                            }
                        );
                    } else {
                        reservation_data = false;
                    }
                }, 0);
            });
        },
        _onClickAssingButton: function (event) {
            event.preventDefault();
            var button = event.currentTarget;
            var tr = button.closest("tr");
            var selector =
                ".o_pms_pwa_reservation[data-id=" + tr.getAttribute("data-id") + "]";
            $(selector).find("td.first-col").click();
        },
        _onClickNotLastChildA: function (event) {
            event.stopPropagation();
        },
        _onClickCheckinButton: function (event) {
            event.preventDefault();
            var self = this;
            var button = event.currentTarget;
            var reservation_id = false;
            try {
                reservation_id = button.closest("tr").getAttribute("data-id");
            } catch (error) {
                reservation_id = button.getAttribute("data-id");
            }
            console.log(reservation_id);
            ajax.jsonRpc("/reservation/json_data", "call", {
                reservation_id: reservation_id,
            }).then(function (data) {
                setTimeout(function () {
                    if (data) {
                        self.displayContent("pms_pwa.reservation_checkin_modal", {
                            reservation: data,
                        });

                        if (document.documentElement.lang === "es-ES") {
                            $(".o_pms_pwa_daterangepicker").daterangepicker(
                                {
                                    locale: {
                                        direction: "ltr",
                                        format: "DD/MM/YYYY",
                                        applyLabel: "Aplicar",
                                        cancelLabel: "Cancelar",
                                    },
                                    opens: "left",
                                    showCustomRangeLabel: false,
                                    singleDatePicker: true,
                                    showDropdowns: true,
                                    autoUpdateInput: false,
                                    minYear: 1901,
                                    maxYear: parseInt(moment().format("YYYY"), 10),
                                },
                                function (start) {
                                    const start_date = new Date(start);
                                    var select_date = start_date.toLocaleDateString(
                                        document.documentElement.lang,
                                        date_options
                                    );
                                    this.element.val(select_date);
                                    // this.element.trigger("change");
                                }
                            );
                        } else {
                            $(".o_pms_pwa_daterangepicker").daterangepicker(
                                {
                                    locale: {
                                        direction: "ltr",
                                        format: "MM/DD/YYYY",
                                    },
                                    opens: "left",
                                    showCustomRangeLabel: false,
                                    singleDatePicker: true,
                                    showDropdowns: true,
                                    autoUpdateInput: false,
                                    minYear: 1901,
                                    maxYear: parseInt(moment().format("YYYY"), 10),
                                },
                                function (start) {
                                    const start_date = new Date(start);
                                    var select_date = start_date.toLocaleDateString(
                                        document.documentElement.lang,
                                        date_options
                                    );
                                    this.element.val(select_date);
                                    // this.element.trigger("change");
                                }
                            );
                        }

                        /* eslint-disable no-alert, no-console */
                        new Stepper($(".bs-stepper")[0], {
                            linear: false,
                            animation: true,
                            selectors: {
                                steps: ".step",
                                trigger: ".step-trigger",
                                stepper: ".bs-stepper",
                            },
                        });
                        $(".bs-stepper-content").on(
                            "change",
                            "input, select",
                            function (new_event) {
                                new_event.preventDefault(reservation_id);
                                var guest_list = [];
                                var selector =
                                    "div.bs-stepper[guest-data-id=" +
                                    reservation_id +
                                    "] .content";
                                var contents = $(selector);

                                for (var i = 1; i <= contents.length; i++) {
                                    var element = $(
                                        "#" + contents[i - 1].getAttribute("id")
                                    );
                                    guest_list.push({
                                        id: element
                                            .find("input[name='guest_id']")
                                            .val(),
                                        firstname: element
                                            .find("input[name='firstname']")
                                            .val(),
                                        lastname: element
                                            .find("input[name='lastname']")
                                            .val(),
                                        lastname2: element
                                            .find("input[name='lastname2']")
                                            .val(),
                                        birthdate_date: element
                                            .find("input[name='birthdate_date']")
                                            .val(),
                                        document_number: element
                                            .find("input[name='document_number']")
                                            .val(),
                                        document_type: element
                                            .find("select[name='document_type'] option")
                                            .filter(":selected")
                                            .val(),
                                        document_expedition_date: element
                                            .find(
                                                "input[name='document_expedition_date']"
                                            )
                                            .val(),
                                        gender: element
                                            .find("select[name='gender'] option")
                                            .filter(":selected")
                                            .val(),
                                        mobile: element
                                            .find("input[name='mobile']")
                                            .val(),
                                        email: element
                                            .find("input[name='email']")
                                            .val(),
                                        pms_property_id: element
                                            .find("input[name='pms_property_id']")
                                            .val(),
                                        country_id: element
                                            .find("select[name='country_id'] option")
                                            .filter(":selected")
                                            .val(),
                                        state_id: element
                                            .find("select[name='state_id'] option")
                                            .filter(":selected")
                                            .val(),
                                    });
                                }

                                ajax.jsonRpc(
                                    "/reservation/" + reservation_id + "/checkin",
                                    "call",
                                    {
                                        guests_list: guest_list,
                                        action_on_board: false,
                                    }
                                ).then(function (new_data) {
                                    try {
                                        var checkin_persons =
                                            new_data.checkin_partner_ids;

                                        $.each(checkin_persons, function (key, value) {
                                            var check_partner_id =
                                                "#checkin_partner_" + key;

                                            var allowed_fields = [
                                                //"allowed_country_ids",
                                                "allowed_state_ids",
                                            ];
                                            $.each(
                                                allowed_fields,
                                                function (akey, avalue) {
                                                    try {
                                                        var select = $(
                                                            check_partner_id +
                                                                " select[data-select='" +
                                                                avalue +
                                                                "']"
                                                        );
                                                    } catch (error) {
                                                        console.log(error);
                                                    }

                                                    if (select.length != 0) {
                                                        select.empty();
                                                        if (
                                                            !value[
                                                                relation_values[avalue]
                                                            ] &
                                                            (value[
                                                                relation_values[avalue]
                                                            ] ==
                                                                0)
                                                        ) {
                                                            select.append(
                                                                '<option value="" selected></option>'
                                                            );
                                                        }

                                                        $.each(
                                                            value[avalue],
                                                            function (
                                                                subkey,
                                                                subvalue
                                                            ) {
                                                                var option = new Option(
                                                                    subvalue["name"],
                                                                    subvalue["id"]
                                                                );
                                                                $(option).html(
                                                                    subvalue["name"]
                                                                );
                                                                select.append(option);
                                                            }
                                                        );
                                                    }
                                                }
                                            );

                                            $.each(value, function (key2, value2) {
                                                if (
                                                    key2 != "gender" &&
                                                    key2 != "document_type" &&
                                                    key2 != "country_id" &&
                                                    key2 != "state_id"
                                                ) {
                                                    var input = $(
                                                        check_partner_id +
                                                            " input[name='" +
                                                            key2 +
                                                            "']"
                                                    );
                                                    if (value2) {
                                                        input.val(value2);
                                                    }
                                                } else {
                                                    if (value2 && value2["id"]) {
                                                        $(
                                                            check_partner_id +
                                                                " select[name='" +
                                                                key2 +
                                                                "'] option[value='" +
                                                                value2["id"] +
                                                                "']"
                                                        ).prop("selected", true);
                                                    } else {
                                                        $(
                                                            check_partner_id +
                                                                " select[name='" +
                                                                key2 +
                                                                "'] option[value='" +
                                                                value2 +
                                                                "']"
                                                        ).prop("selected", true);
                                                    }
                                                }
                                            });
                                        });
                                    } catch (err) {
                                        console.log(err);
                                    }
                                    //self.displayDataAlert(new_data, data.id);
                                });
                            }
                        );
                        /* eslint-enable no-alert */
                        $(".o_pms_pwa_button_checkin_confirm").on(
                            "click",
                            function (new_event) {
                                new_event.preventDefault();
                                var guest_list = [];
                                var selector =
                                    "div.bs-stepper[guest-data-id=" +
                                    reservation_id +
                                    "] .content";

                                var contents = $(selector);

                                for (var i = 1; i <= contents.length; i++) {
                                    var element = $(
                                        "#" + contents[i - 1].getAttribute("id")
                                    );
                                    guest_list.push({
                                        id: element
                                            .find("input[name='guest_id']")
                                            .val(),
                                        firstname: element
                                            .find("input[name='firstname']")
                                            .val(),
                                        lastname: element
                                            .find("input[name='lastname']")
                                            .val(),
                                        lastname2: element
                                            .find("input[name='lastname2']")
                                            .val(),
                                        birthdate_date: element
                                            .find("input[name='birthdate_date']")
                                            .val(),
                                        document_number: element
                                            .find("input[name='document_number']")
                                            .val(),
                                        document_type: element
                                            .find("select[name='document_type'] option")
                                            .filter(":selected")
                                            .val(),
                                        document_expedition_date: element
                                            .find(
                                                "input[name='document_expedition_date']"
                                            )
                                            .val(),
                                        gender: element
                                            .find("select[name='gender'] option")
                                            .filter(":selected")
                                            .val(),
                                        mobile: element
                                            .find("input[name='mobile']")
                                            .val(),
                                        email: element
                                            .find("input[name='email']")
                                            .val(),
                                        pms_property_id: element
                                            .find("input[name='pms_property_id']")
                                            .val(),
                                        country_id: element
                                            .find("select[name='country_id'] option")
                                            .filter(":selected")
                                            .val(),
                                        state_id: element
                                            .find("select[name='state_id'] option")
                                            .filter(":selected")
                                            .val(),
                                    });
                                }
                                ajax.jsonRpc(button.attributes.url.value, "call", {
                                    guests_list: guest_list,
                                    action_on_board: true,
                                }).then(function (new_data) {
                                    self.displayDataAlert(new_data, data.id);
                                });
                            }
                        );
                        $(".o_pms_pwa_button_print_checkin").on(
                            "click",
                            function (new_event) {
                                new_event.preventDefault();
                                var self = this;
                                var button = new_event.currentTarget;
                                var reservation_id = false;
                                // var reservation_ids = {};
                                try {
                                    reservation_id = button
                                        .closest("tr")
                                        .getAttribute("data-id");
                                } catch (error) {
                                    try {
                                        reservation_id = button.getAttribute("data-id");
                                    } catch (error) {
                                        reservation_id = $("input[name='id']").val();
                                    }
                                }
                                let url = "/checkins/pdf/" + reservation_id;
                                // Open the window
                                let printWindow = window.open(
                                    url,
                                    "Print",
                                    "left=200, top=200, width=950, height=500, toolbar=0, resizable=0"
                                );
                                printWindow.addEventListener(
                                    "load",
                                    function () {
                                        printWindow.print();
                                    },
                                    true
                                );
                            }
                        );
                        $(
                            "table#multi_reservation_modal_checkin, a.o_pms_pwa_button_checkin_multi_modal"
                        ).on("click", function (modal_event) {
                            modal_event.preventDefault();
                            var button = modal_event.currentTarget;
                            var reservation_id = false;
                            try {
                                reservation_id = button.getAttribute("data-id");
                            } catch (error) {
                                reservation_id = false;
                            }
                            if (reservation_id) {
                                $("div.o_pms_pwa_reservation_modal").modal("toggle");
                                self._onClickCheckinButton(modal_event);
                            }
                        });
                    }
                });
            });
        },
        _onClickCancelButton: function (event) {
            event.preventDefault();
            var self = this;
            var button = event.currentTarget;
            var reservation_id = false;
            try {
                reservation_id = button.closest("tr").getAttribute("data-id");
            } catch (error) {
                reservation_id = button.getAttribute("data-id");
            }
            ajax.jsonRpc("/reservation/json_data", "call", {
                reservation_id: reservation_id,
            }).then(function (data) {
                setTimeout(function () {
                    if (data) {
                        self.displayContent("pms_pwa.reservation_cancel_modal", {
                            reservation: data,
                        });
                        $(".o_pms_pwa_button_cancel_confirm").on(
                            "click",
                            function (new_event) {
                                new_event.preventDefault();
                                var cur_button = new_event.currentTarget;
                                ajax.jsonRpc(
                                    cur_button.attributes.url.value,
                                    "call",
                                    {}
                                ).then(function (new_data) {
                                    self.displayDataAlert(new_data, data.id);
                                });
                            }
                        );
                    }
                });
            });
        },
        _onClickCheckoutButton: function (event) {
            event.preventDefault();
            var self = this;
            var button = event.currentTarget;
            var reservation_id = false;
            try {
                reservation_id = button.closest("tr").getAttribute("data-id");
            } catch (error) {
                reservation_id = button.getAttribute("data-id");
            }
            ajax.jsonRpc("/reservation/json_data", "call", {
                reservation_id: reservation_id,
            }).then(function (data) {
                setTimeout(function () {
                    if (data) {
                        self.displayContent("pms_pwa.reservation_checkout_modal", {
                            reservation: data,
                        });
                        $(".o_pms_pwa_button_checkout_confirm").on(
                            "click",
                            function (new_event) {
                                new_event.preventDefault();
                                var cur_button = event.currentTarget;
                                ajax.jsonRpc(
                                    cur_button.attributes.url.value,
                                    "call",
                                    {}
                                ).then(function (new_data) {
                                    self.displayDataAlert(new_data, data.id);
                                });
                            }
                        );
                    }
                });
            });
        },
        _onClickPaymentButton: function (event) {
            event.preventDefault();
            var self = this;
            var button = event.currentTarget;
            var reservation_id = false;
            try {
                reservation_id = button.closest("tr").getAttribute("data-id");
            } catch (error) {
                try {
                    reservation_id = button.getAttribute("data-id");
                } catch (error) {
                    reservation_id = $("input[name='id']").val();
                }
            }
            ajax.jsonRpc("/reservation/json_data", "call", {
                reservation_id: reservation_id,
            }).then(function (data) {
                if (data) {
                    self.displayContent("pms_pwa.reservation_payment_modal", {
                        reservation: data,
                    });
                    $(".o_pms_pwa_button_payment_confirm").on(
                        "click",
                        function (new_event) {
                            new_event.preventDefault();
                            var selector =
                                "div.modal-dialog[payment-data-id=" +
                                reservation_id +
                                "]";
                            var div = $(selector);
                            var payment_method = div
                                .find("select[name='payment_method'] option")
                                .filter(":selected")
                                .val();
                            var payment_amount = div.find("input[name='amount']").val();
                            ajax.jsonRpc(button.attributes.url.value, "call", {
                                payment_method: payment_method,
                                amount: payment_amount,
                            }).then(function (new_data) {
                                self.displayDataAlert(new_data, data.id);
                            });
                        }
                    );
                }
            });
        },
        _onClickInvoiceButton: function (event) {
            event.preventDefault();
            var button = event.currentTarget;
            var reservation_id = false;
            try {
                reservation_id = button.closest("tr").getAttribute("data-id");
            } catch (error) {
                try {
                    reservation_id = button.getAttribute("data-id");
                } catch (error) {
                    reservation_id = $("input[name='id']").val();
                }
            }
            location.href = "/reservation/" + reservation_id;
        },
    });

    return publicWidget.registry.ReservationTableWidget;
});
