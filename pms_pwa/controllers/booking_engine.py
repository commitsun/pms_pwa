# Part of Odoo. See LICENSE file for full copyright and licensing details.

# -*- coding: utf-8 -*-

import logging
import pprint
from datetime import timedelta
import datetime
from odoo import _, fields, http
from odoo.http import request
from odoo.tools.misc import get_lang

pp = pprint.PrettyPrinter(indent=4)

_logger = logging.getLogger(__name__)


class BookingEngine(http.Controller):

    # BOOKING ENGINE HEADER ########################################################
    @http.route(
        ["/booking_engine"],
        type="json",
        auth="public",
        methods=["POST"],
        website=True,
    )
    def booking_engine(self, **kw):
        folio_values = http.request.jsonrequest.get("params")
        print("folio_values: {}".format(folio_values))
        try:
            # checkin & Checkout
            if folio_values["checkin"]:
                checkin = (
                    datetime.datetime.strptime(
                        folio_values["checkin"], get_lang(request.env).date_format
                    ).date()
                    if "checkin" in folio_values
                    else datetime.datetime.today()
                )
            else:
                checkin = datetime.datetime.today()
                folio_values["checkin"] = checkin.strftime(
                    get_lang(request.env).date_format
                )
            if folio_values["checkout"]:
                checkout = (
                    datetime.datetime.strptime(
                        folio_values["checkout"].strip(),
                        get_lang(request.env).date_format,
                    ).date()
                    if "checkout" in folio_values
                    else checkin + timedelta(days=1)
                )
            else:
                checkout = checkin + timedelta(days=1)
                folio_values["checkout"] = checkout.strftime(
                    get_lang(request.env).date_format
                )

            # Pms Property
            pms_property_id = False
            pms_property = False
            # HOTFIX: PROPERTY SIEMPRE VALE 1 en VALS
            # if "pms_property_id" in folio_values:
            #     pms_property_id = int(folio_values["pms_property_id"])
            #     pms_property = request.env["pms.property"].browse(pms_property_id)
            # elif request.env.user.get_active_property_ids():
            pms_property_id = request.env.user.get_active_property_ids()[0]
            pms_property = request.env["pms.property"].browse(pms_property_id)
            folio_values["pms_property_id"] = pms_property_id

            # Pricelist
            pricelist = False
            if folio_values.get("pricelist_id"):
                pricelist = request.env["product.pricelist"].search(
                    [("id", "=", int(folio_values.get("pricelist_id")))]
                )
            if not pricelist:
                pricelist = pms_property.default_pricelist_id
            folio_values["pricelist_id"] = pricelist.id
            # Reservation type
            if not folio_values.get("reservation_type"):
                folio_values["reservation_type"] = "normal"
            # Channel and Agency
            # REVIEW: Avoid send 'false' to controller
            if (
                folio_values.get("agency_id")
                and folio_values.get("agency_id") != "false"
            ):
                agency = request.env["res.partner"].browse(
                    int(folio_values.get("agency_id"))
                )
                folio_values["agency_id"] = {
                    "id": agency.id,
                    "name": agency.name,
                }
                folio_values["channel_type_id"] = {
                    "id": agency.sale_channel_id.id,
                    "name": agency.sale_channel_id.name,
                }
                if agency.invoice_to_agency:
                    folio_values["partner_name"] = agency.name
                    folio_values["partner_id"] = agency.id
                    folio_values["email"] = agency.email or ""
                    folio_values["mobile"] = agency.mobile or ""
                if agency.apply_pricelist:
                    folio_values["pricelist_id"] = agency.property_product_pricelist.id
            else:
                channel_type = False
                if (
                    folio_values.get("channel_type_id")
                    and folio_values.get("channel_type_id") != "false"
                ):
                    channel_type = request.env["pms.sale.channel"].browse(
                        int(folio_values.get("channel_type_id"))
                    )
                folio_values["channel_type_id"] = {
                    "id": channel_type.id if channel_type else False,
                    "name": channel_type.name if channel_type else False,
                }
            # prepare amenity ids
            selected_amenity_ids = (
                [int(item) for item in folio_values.get("amenity_ids")]
                if folio_values.get("amenity_ids")
                else []
            )
            selected_amenities = request.env["pms.amenity"].browse(selected_amenity_ids)
            folio_values["amenity_ids"] = []
            for amenity in selected_amenities:
                folio_values["amenity_ids"].append(
                    {"id": amenity.id, "name": amenity.display_name}
                )
            folio_values.update(
                self._get_allowed_selections_values(
                    pms_property=pms_property,
                    channel_type=request.env["pms.sale.channel"].browse(
                        folio_values["channel_type_id"]["id"]
                    ),
                )
            )
            folio_values = self.check_incongruences(folio_values)
            if folio_values.get("agrupation_type"):
                vals = {
                    "checkin": checkin,
                    "checkout": checkout,
                    "pricelist_id": pricelist.id,
                    "amenity_ids": selected_amenities,
                    "pms_property_id": pms_property_id,
                    "agrupation_type": folio_values.get("agrupation_type"),
                    "active_groups": folio_values.get("rooms"),
                    "sale_category_id": folio_values.get("sale_category_id")
                    if folio_values.get("sale_category_id")
                    else False,
                    "force_recompute": int(folio_values.get("force_recompute"))
                    if folio_values.get("force_recompute")
                    else False,
                }
                folio_values["groups"] = self.get_groups(vals)
            # Parse sale_category_id
            if (
                folio_values.get("sale_category_id")
                and folio_values.get("sale_category_id") != "false"
            ):
                room_type = request.env["pms.room.type"].browse(
                    int(folio_values.get("sale_category_id"))
                )
                folio_values["sale_category_id"] = {
                    "id": room_type.id,
                    "name": room_type.name,
                }

            # Parse Pricelist
            folio_values["pricelist_id"] = {
                "id": pricelist.id,
                "name": pricelist.name,
            }

            _logger.info(folio_values)

            return folio_values
        except Exception as e:
            print("error: {}".format(e))
            return {"result": "error", "message": str(e)}

    def _get_allowed_selections_values(self, pms_property, channel_type=False):
        selection_fields = {}
        selection_fields["allowed_pricelists"] = request.env[
            "pms.reservation"
        ]._get_allowed_pricelists(channel_type.id)
        selection_fields["allowed_segmentations"] = request.env[
            "pms.reservation"
        ]._get_allowed_segmentations()
        selection_fields[
            "allowed_channel_type_ids"
        ] = pms_property._get_allowed_channel_type_ids()
        selection_fields["allowed_agency_ids"] = pms_property._get_allowed_agency_ids(
            channel_type_id=channel_type.id if channel_type else False
        )
        allowed_amenity_ids = (
            request.env["pms.room"]
            .search([("pms_property_id", "=", pms_property.id)])
            .mapped("room_amenity_ids.id")
        )
        allowed_amenities = request.env["pms.amenity"].browse(allowed_amenity_ids)
        selection_fields["allowed_amenity_ids"] = []
        for amenity in allowed_amenities:
            selection_fields["allowed_amenity_ids"].append(
                {"id": amenity.id, "name": amenity.display_name}
            )
        room_types = request.env["pms.room.type"].search(
            [
                "|",
                ("pms_property_ids", "in", pms_property.id),
                ("pms_property_ids", "=", False),
            ]
        )
        selection_fields["allowed_sale_category_ids"] = [
            {"id": room_type.id, "name": room_type.name} for room_type in room_types
        ]
        # Board services
        allowed_board_services = room_types.mapped(
            "board_service_room_type_ids.pms_board_service_id.id"
        )
        selection_fields["allowed_board_services"] = []
        selection_fields["allowed_board_services"].extend(
            [
                {"id": board.id, "name": board.name}
                for board in request.env["pms.board.service"].browse(
                    allowed_board_services
                )
            ]
        )
        return selection_fields

    def check_incongruences(self, folio_values):
        if int(folio_values["pricelist_id"]) not in [
            item["id"] for item in folio_values["allowed_pricelists"]
        ]:
            folio_values["pricelist_id"] = folio_values["allowed_pricelists"][0]["id"]
        if folio_values.get("segmentation_ids"):
            for segmentation in folio_values["segmentation_ids"]:
                if int(segmentation) not in [
                    item["id"] for item in folio_values["allowed_segmentations"]
                ]:
                    folio_values["segmentation_ids"].remove(segmentation)
        if folio_values.get("channel_type_id"):
            if int(folio_values["channel_type_id"]["id"]) not in [
                item["id"] for item in folio_values["allowed_channel_type_ids"]
            ]:
                folio_values["channel_type_id"] = False
        if folio_values.get("agency_id"):
            if int(folio_values["agency_id"]["id"]) not in [
                item["id"] for item in folio_values["allowed_agency_ids"]
            ]:
                folio_values["agency_id"] = False
        if folio_values.get("board_service_id"):
            if int(folio_values["board_service_id"]) not in [
                item["id"] for item in folio_values["allowed_board_services"]
            ]:
                folio_values["board_service_id"] = False
        if folio_values.get("sale_category_id"):
            if int(folio_values["sale_category_id"]) not in [
                item["id"] for item in folio_values["allowed_sale_category_ids"]
            ]:
                folio_values["sale_category_id"] = False
        return folio_values

    def get_groups(self, vals):
        groups = self.get_header_groups(vals)
        reservations_dict = []
        # for group in groups:
        # if group.get("rooms"):
        for room in vals["active_groups"]:
            reservations_dict.append(room)
        checkin = vals["checkin"]
        checkout = vals["checkout"]
        amenity_ids = vals["amenity_ids"]
        for group in groups:
            group_ubication_id = int(group["ubication_id"])
            group_room_type_id = int(group["room_type_id"])
            pricelist_id = int(vals["pricelist_id"])
            pms_property = request.env["pms.property"].browse(
                int(vals["pms_property_id"])
            )
            # First check de availability without amenity filters to keep previously selected rooms
            pms_property = pms_property.with_context(
                checkin=checkin,
                checkout=checkout,
                ubication_id=group_ubication_id,
                room_type_id=group_room_type_id,
                pricelist_id=pricelist_id,
            )
            group_rooms = []
            for res_dict in reservations_dict:
                room = request.env["pms.room"].browse(
                    int(res_dict["preferred_room_id"])
                )
                ubication_id = room.ubication_id.id if room.ubication_id else False
                room_type_id = room.room_type_id.id if room.room_type_id else False
                if (
                    (group_ubication_id and group_ubication_id == ubication_id)
                    or (group_room_type_id and group_room_type_id == room_type_id)
                    or (not group_ubication_id and not group_room_type_id)
                ):
                    adults = int(res_dict["adults"]) if res_dict.get("adults") else 0
                    price_per_room = (
                        int(res_dict["price_per_room"])
                        if res_dict.get("price_per_room")
                        else 0
                    )
                    board_service_room_id = (
                        int(res_dict["board_service_room_id"])
                        if res_dict.get("board_service_room_id")
                        else False
                    )
                    if adults == 0 or adults > room.capacity:
                        adults = room.capacity
                    # TODO: HOT FIX becouse dont get force_recompute in vals
                    if price_per_room == 0:
                        price_per_room = request.env[
                            "pms.folio.availability.wizard"
                        ]._get_price_by_room_type(
                            room_type_id=room_type_id,
                            board_service_room_id=board_service_room_id,
                            checkin=checkin,
                            checkout=checkout,
                            pricelist_id=pricelist_id,
                            pms_property_id=pms_property.id,
                        )
                    if vals.get("force_recompute") == 1:
                        if vals.get("sale_category_id"):
                            room_type_id = int(vals.get("sale_category_id"))
                        else:
                            room_type_id = room.room_type_id.id
                        price_per_room = request.env[
                            "pms.folio.availability.wizard"
                        ]._get_price_by_room_type(
                            room_type_id=room_type_id,
                            board_service_room_id=board_service_room_id,
                            checkin=checkin,
                            checkout=checkout,
                            pricelist_id=pricelist_id,
                            pms_property_id=pms_property.id,
                        )
                    room_dict = {
                        "preferred_room_id": {"id": room.id, "name": room.display_name},
                        "room_type_id": room_type_id,
                        "checkin": checkin,
                        "checkout": checkout,
                        "adults": adults,
                        "max_adults": room.capacity,
                        "pricelist_id": pricelist_id,
                        "board_service_room_id": board_service_room_id,
                        "price_per_room": price_per_room,
                    }
                    group_rooms.append(room_dict)
            if pms_property.availability < len(group_rooms):
                to_del = len(group_rooms) - pms_property.availability
                group_rooms = group_rooms[:to_del]
            # Then we recalculate it taking into account the amenity filters to return the selected availability
            # and the selected rooms
            free_rooms = pms_property.free_room_ids.filtered(
                lambda r: len(set(amenity_ids) - set(r.room_amenity_ids.ids)) == 0
                and r.id not in [int(x["preferred_room_id"]["id"]) for x in group_rooms]
            )
            free_room_ids = []
            if free_rooms:
                for room in free_rooms:
                    free_room_ids.append({"id": room.id, "name": room.display_name})
            group.update(
                {
                    "rooms": group_rooms,
                    "count_rooms_selected": len(group_rooms),
                    "max_rooms": pms_property.availability - len(group_rooms),
                    "free_rooms_dict": free_room_ids,
                    "price_per_group": sum(
                        [int(item["price_per_room"]) for item in group_rooms]
                    ),
                }
            )
        return groups

    def get_header_groups(self, vals):
        groups = []
        if vals.get("agrupation_type") == "all":
            groups = [
                {
                    "group_id": 0,
                    "name": "All",
                    "ubication_id": False,
                    "room_type_id": False,
                }
            ]
        elif vals.get("agrupation_type") == "room_type":
            groups = []
            for room_type in request.env["pms.room.type"].search(
                [
                    "|",
                    ("pms_property_ids", "in", vals["pms_property_id"]),
                    ("pms_property_ids", "=", False),
                ]
            ):
                groups.append(
                    {
                        "group_id": room_type.id,
                        "name": room_type.name,
                        "ubication_id": False,
                        "room_type_id": room_type.id,
                    }
                )
        elif vals.get("agrupation_type") == "ubication":
            groups = []
            for ubication in request.env["pms.ubication"].search(
                [
                    "|",
                    ("pms_property_ids", "in", vals["pms_property_id"]),
                    ("pms_property_ids", "=", False),
                ]
            ):
                groups.append(
                    {
                        "group_id": ubication.id,
                        "name": ubication.name,
                        "ubication_id": ubication.id,
                        "room_type_id": False,
                    }
                )
        return groups

    # BOOKING ENGINE GROUPS AND RESERVATIONS ---------------------------
    # Call to add or del new reservations in group

    @http.route(
        ["/booking_engine_group"],
        type="json",
        auth="public",
        methods=["POST"],
        website=True,
    )
    def booking_engine_group(self, **kw):
        try:
            params = http.request.jsonrequest.get("params")
            _logger.info(params)
            rooms_dict = params.get("rooms")
            # free_rooms = request.env["pms.room"].browse([int(i) for i in params['free_rooms']] if params.get('free_rooms') else [])
            checkin = datetime.datetime.strptime(
                params["checkin"], get_lang(request.env).date_format
            ).date()
            checkout = datetime.datetime.strptime(
                params["checkout"], get_lang(request.env).date_format
            ).date()
            count_rooms_selected = int(params["count_rooms_selected"])
            ubication_id = (
                int(params.get("ubication_id")) if params.get("ubication_id") else False
            )
            room_type_id = (
                int(params.get("room_type_id")) if params.get("room_type_id") else False
            )
            sale_category_id = (
                int(params.get("sale_category_id"))
                if params.get("sale_category_id")
                else False
            )
            pms_property_id = int(params["pms_property_id"])
            pricelist_id = int(params["pricelist_id"])
            board_service_room_id = (
                int(params.get("board_service_room_id"))
                if params.get("board_service_room_id")
                else False
            )
            if not rooms_dict:
                rooms_dict = []
            rooms = request.env["pms.room"]
            amenity_ids = []
            if params.get("amenity_ids"):
                for item in params.get("amenity_ids"):
                    amenity_ids.append(int(item))
            pms_property = request.env["pms.property"].browse(pms_property_id)
            pms_property = pms_property.with_context(
                checkin=checkin,
                checkout=checkout,
                ubication_id=ubication_id,
                room_type_id=room_type_id,
                amenity_ids=amenity_ids if amenity_ids else False,
            )
            used_rooms = request.env["pms.room"].browse(
                [int(item["preferred_room_id"]) for item in rooms_dict]
            )
            free_rooms = pms_property.free_room_ids - used_rooms
            rooms = used_rooms
            for item in rooms_dict:
                preferred_room = request.env["pms.room"].browse(
                    int(item["preferred_room_id"])
                )
                item.update(
                    {
                        "preferred_room_id": {
                            "id": int(item["preferred_room_id"]),
                            "name": preferred_room.display_name,
                        },
                        "room_type_id": room_type_id
                        if room_type_id
                        else sale_category_id,
                        "checkin": checkin,
                        "checkout": checkout,
                        "adults": int(item["adults"])
                        if int(item["adults"]) < preferred_room.capacity
                        else preferred_room.capacity,
                        "max_adults": preferred_room.capacity,
                        "pricelist_id": pricelist_id,
                        "board_service_room_id": board_service_room_id,
                    }
                )
            if count_rooms_selected < len(rooms_dict):
                to_del = len(rooms_dict) - count_rooms_selected
                for item in rooms_dict[len(rooms_dict) - to_del :]:
                    free_rooms += request.env["pms.room"].browse(
                        item["preferred_room_id"]["id"]
                    )
                rooms_dict = rooms_dict[: len(rooms_dict) - to_del]
            elif count_rooms_selected > len(rooms_dict):
                to_add = count_rooms_selected - len(rooms_dict)
                # amenity_ids = []
                # if params.get("amenity_ids"):
                #     for item in params.get("amenity_ids"):
                #         amenity_ids.append(int(item))

                # pms_property = request.env["pms.property"].browse(pms_property_id)
                # pms_property = pms_property.with_context(
                #     checkin=checkin,
                #     checkout=checkout,
                #     ubication_id=ubication_id,
                #     room_type_id=room_type_id,
                #     amenity_ids=amenity_ids if amenity_ids else False,
                # )

                # used_rooms = request.env["pms.room"].browse([int(item["preferred_room_id"]) for item in rooms_dict])
                # free_rooms = pms_property.free_room_ids - used_rooms

                for i in range(to_add):
                    rooms += free_rooms[i]
                    rooms_dict.append(
                        {
                            "preferred_room_id": {
                                "id": free_rooms[i].id,
                                "name": free_rooms[i].display_name,
                            },
                            "room_type_id": sale_category_id
                            if sale_category_id
                            else free_rooms[i].room_type_id.id,
                            "checkin": checkin,
                            "checkout": checkout,
                            "adults": free_rooms[i].capacity,
                            "max_adults": free_rooms[i].capacity,
                            "pricelist_id": pricelist_id,
                            "board_service_room_id": board_service_room_id,
                        }
                    )
                for room_dict in rooms_dict:
                    board_service_room_id = int(room_dict.get("board_service_room_id"))
                    room_type = request.env["pms.room.type"].browse(
                        int(room_dict["room_type_id"])
                    )
                    allowed_board_service_room_ids = [
                        {"id": bsr.id, "name": bsr.name}
                        for bsr in room_type.board_service_room_type_ids.pms_board_service_id
                    ]
                    board_room_type = room_type.board_service_room_type_ids.filtered(
                        lambda bsr: bsr.id == board_service_room_id
                    )
                    room_dict.update(
                        {
                            "allowed_board_service_room_ids": allowed_board_service_room_ids,
                        }
                    )
                    price_per_room = request.env[
                        "pms.folio.availability.wizard"
                    ]._get_price_by_room_type(
                        room_type_id=room_type.id,
                        board_service_room_id=board_room_type.id,
                        checkin=checkin,
                        checkout=checkout,
                        pricelist_id=pricelist_id,
                        pms_property_id=pms_property.id,
                    )
                    room_dict.update({"price_per_room": price_per_room})

            free_rooms = free_rooms - rooms
            free_rooms_dict = []
            for free_room in free_rooms:
                free_rooms_dict.append(
                    {"id": free_room.id, "name": free_room.display_name}
                )
            return {
                "rooms": rooms_dict,
                "free_rooms_dict": free_rooms_dict,
                "room_type_id": room_type_id,
                "ubication_id": ubication_id,
                "price_per_group": sum(
                    [int(item["price_per_room"]) for item in rooms_dict]
                ),
            }
        except Exception as e:
            return {"result": "error", "message": str(e)}

    # BOOKING ENGINE SUBMIT ----------------------------------
    # Call te create the folio in bbdd
    @http.route(
        ["/booking_engine_submit"],
        type="json",
        auth="public",
        methods=["POST"],
        website=True,
    )
    def booking_engine_submit(self, **kw):
        folio_values = http.request.jsonrequest.get("params")
        vals = {}
        print("folio_values: {}".format(folio_values))
        try:
            # HEADER VALUES -----------------------------------------------------------
            # Pms Property
            pms_property_id = False
            pms_property = False
            if request.env.user.get_active_property_ids():
                pms_property_id = request.env.user.get_active_property_ids()[0]
                pms_property = request.env["pms.property"].browse(pms_property_id)

            # Partner values
            vals["partner_name"] = folio_values["partner_name"]
            if folio_values.get("email") and folio_values.get("email") != "":
                vals["email"] = folio_values.get("email")
            if folio_values.get("mobile") and folio_values.get("mobile") != "":
                vals["mobile"] = folio_values.get("mobile")

            # Reservation type
            if folio_values.get("reservation_type"):
                vals["reservation_type"] = folio_values.get("reservation_type")
            else:
                vals["reservation_type"] = "normal"

            # Channel and Agency
            if (
                folio_values.get("channel_type_id")
                and folio_values.get("channel_type_id") != ""
            ):
                vals["channel_type_id"] = int(folio_values.get("channel_type_id"))

            # REVIEW: Avoid send 'false' to controller
            if (
                folio_values.get("agency_id")
                and folio_values.get("agency_id") != "false"
            ):
                vals["agency_id"] = int(folio_values.get("agency_id"))
                vals["channel_type_id"] = (
                    request.env["res.partner"]
                    .browse(vals["agency_id"])
                    .sale_channel_id.id
                )

            # Segmentation
            if folio_values.get("segmentation_ids"):
                vals["segmentation_ids"] = [
                    (6, 0, [int(item) for item in folio_values.get("segmentation_ids")])
                ]

            # RESERVATIONS ------------------------------------------------------------
            # groups = folio_values.get("groups")
            vals["reservation_ids"] = []

            # for group in groups:
            folio = request.env["pms.folio"].create(vals)
            # for group in folio_values.get("groups"):
            for room in folio_values.get("rooms"):
                room_record = request.env["pms.room"].browse(
                    int(room["preferred_room_id"])
                )
                reservation_vals = {
                    "partner_name": vals["partner_name"],
                    "email": vals.get("email") if vals.get("email") else False,
                    "mobile": vals.get("mobile") if vals.get("mobile") else False,
                    "partner_id": int(vals.get("partner_id"))
                    if vals.get("partner_id")
                    else False,
                    "preferred_room_id": int(room["preferred_room_id"]),
                    "room_type_id": int(room["room_type_id"])
                    if room.get("room_type_id")
                    else room_record.room_type_id.id,
                    "checkin": datetime.datetime.strptime(
                        room["checkin"], get_lang(request.env).date_format
                    ).date(),
                    "checkout": datetime.datetime.strptime(
                        room["checkout"], get_lang(request.env).date_format
                    ).date(),
                    "adults": int(room["adults"]),
                    "pricelist_id": int(room["pricelist_id"]),
                    "board_service_room_id": int(room["board_service_room_id"])
                    if room["board_service_room_id"]
                    else False,
                    "pms_property_id": pms_property.id,
                    "folio_id": folio.id,
                }
                request.env["pms.reservation"].create(reservation_vals)
            return {"result": "success", "reservation_id": folio.reservation_ids[0].id}
        except Exception as e:
            return {"result": "error", "message": str(e)}
