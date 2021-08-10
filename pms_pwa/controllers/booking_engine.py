# Part of Odoo. See LICENSE file for full copyright and licensing details.

# -*- coding: utf-8 -*-

from inspect import isdatadescriptor
import logging
import pprint
import json
from calendar import monthrange
from datetime import timedelta
import datetime
from odoo import _, fields, http
from odoo.http import request
from odoo.tools.misc import get_lang

pp = pprint.PrettyPrinter(indent=4)

_logger = logging.getLogger(__name__)


class BookingEngine(http.Controller):
    @http.route(
        ["/reservation/single_reservation_new"],
        type="json",
        auth="public",
        methods=["POST"],
        website=True,
    )
    def single_reservation_new(self, **kw):
        reservation_values = http.request.jsonrequest.get("params")
        vals = {}
        print("reservation_values: {}".format(reservation_values))
        if reservation_values["checkin"]:
            checkin = (
                datetime.datetime.strptime(
                    reservation_values["checkin"], get_lang(request.env).date_format
                ).date()
                if "checkin" in reservation_values
                else datetime.datetime.today()
            )
        else:
            checkin = datetime.datetime.today()
        if reservation_values["checkout"]:
            checkout = (
                datetime.datetime.strptime(
                    reservation_values["checkout"].strip(),
                    get_lang(request.env).date_format,
                ).date()
                if "checkout" in reservation_values
                else checkin + timedelta(days=1)
            )
        else:
            checkout = checkin + timedelta(days=1)

        pms_property_id = False
        pms_property = False
        if request.env.user.get_active_property_ids():
            pms_property_id = request.env.user.get_active_property_ids()[0]
            pms_property = request.env["pms.property"].browse(pms_property_id)

        pricelist = False
        if reservation_values.get("pricelist_id"):
            pricelist = request.env["product.pricelist"].search(
                [("id", "=", int(reservation_values.get("pricelist_id")))]
            )
        if not pricelist and pms_property:
            pricelist = pms_property.default_pricelist_id

        vals = {
            "checkin": checkin,
            "checkout": checkout,
            "pricelist_id": pricelist.id,
            "pms_property_id": pms_property.id if pms_property else False,
        }
        print(vals)
        if reservation_values.get("preferred_room_id") and reservation_values.get("preferred_room_id") != '':
            vals["preferred_room_id"] = (
                request.env["pms.room"]
                .search([("id", "=", int(reservation_values.get("preferred_room_id")))])
                .id
            )

        if reservation_values.get("room_type_id") and reservation_values.get("room_type_id") != '':
            vals["room_type_id"] = (
                request.env["pms.room.type"]
                .search([("id", "=", int(reservation_values.get("room_type_id")))])
                .id
            )

        if reservation_values.get("partner_name") and reservation_values.get("partner_name") != '':
            vals["partner_name"] = reservation_values.get("partner_name")

        if reservation_values.get("reservation_type"):
            vals["reservation_type"] = reservation_values.get("reservation_type")
        else:
            vals["reservation_type"] = 'normal'

        # REVIEW: Avoid send 'false' to controller
        if (
            reservation_values.get("board_service_room_id")
            and reservation_values.get("board_service_room_id") != "false"
        ):
            vals["board_service_room_id"] = (
                request.env["pms.board.service.room.type"]
                .search(
                    [("id", "=", int(reservation_values.get("board_service_room_id")))]
                )
                .id
            )

        if reservation_values.get("adults") and reservation_values.get("adults") != '0':
            vals["adults"] = int(reservation_values.get("adults"))

        if reservation_values.get("channel_type_id") and reservation_values.get("channel_type_id") != '':
            vals["channel_type_id"] = int(reservation_values.get("channel_type_id"))

        if reservation_values.get("segmentation_id"):
            vals["segmentation_id"] = int(reservation_values.get("segmentation_id"))

        # REVIEW: Avoid send 'false' to controller
        if reservation_values.get("agency_id") and reservation_values.get("agency_id") != "false":
            vals["agency_id"] = int(reservation_values.get("agency_id"))
            vals["channel_type_id"] = request.env["res.partner"].browse(vals["agency_id"]).sale_channel_id.id

        if reservation_values.get("submit"):
            reservation = request.env["pms.reservation"].create(vals)
            return reservation.parse_reservation()
        else:
            reservation = request.env["pms.reservation"].new(vals)
            reservation.flush()
            return reservation.parse_reservation()

    @http.route(
        ["/reservation/multiple_reservation_onchange"],
        type="json",
        auth="public",
        methods=["POST"],
        website=True,
    )
    def multiple_reservation_onchange(self, **kw):
        params = http.request.jsonrequest.get("params")
        booking_engine = False
        print("params: {}".format(params))
        vals = {}

        if params.get("id"):
            booking_engine = request.env["pms.booking.engine"].browse(
                int(params.get("id"))
            )
        if booking_engine:
            start_date = booking_engine.start_date

        if not booking_engine or params.get("checkin"):
            vals["start_date"] = (
                datetime.datetime.strptime(
                    params["checkin"], get_lang(request.env).date_format
                ).date()
                if "checkin" in params
                else datetime.datetime.today().date()
            )
            start_date = vals["start_date"]
        if not booking_engine or params.get("checkout"):
            vals["end_date"] = (
                datetime.datetime.strptime(
                    params["checkout"].strip(),
                    get_lang(request.env).date_format,
                ).date()
                if "checkout" in params
                else start_date + timedelta(days=1).date()
            )

        pms_property = False

        if request.env.user.get_active_property_ids():
            vals["pms_property_id"] = request.env.user.get_active_property_ids()[0]
            pms_property = request.env["pms.property"].browse(vals["pms_property_id"])

        partner_name = booking_engine.partner_name if booking_engine else ""
        if params.get("partner_name") and params.get("partner_name") != partner_name:
            vals["partner_name"] = params.get("partner_name")

        channel_type_id = booking_engine.channel_type_id.id if booking_engine else False
        if params.get("channel_type_id") and params.get("channel_type_id") != channel_type_id:
            vals["channel_type_id"] = int(params.get("channel_type_id") if params.get("channel_type_id") else False)

        internal_comment = booking_engine.internal_comment if booking_engine else ""
        if params.get("internal_comment") and params.get("internal_comment") != internal_comment:
            vals["internal_comment"] = params.get("internal_comment")

        agency_id = booking_engine.agency_id.id if booking_engine else False
        if params.get("agency_id") and params.get("agency_id") != agency_id and params.get("agency_id") != "false":
            # REVIEW: why send 'false' to controller
            vals["agency_id"] = int(params.get("agency_id"))
            vals["channel_type_id"] = request.env["res.partner"].browse(vals["agency_id"]).sale_channel_id.id

        pricelist = booking_engine.pricelist_id if booking_engine else False
        if params.get("pricelist_id") and params.get("pricelist_id") != pricelist.id:
            vals["pricelist_id"] = request.env["product.pricelist"].search(
                [("id", "=", int(params.get("pricelist_id")))]
            ).id
        if not pricelist and pms_property:
            vals["pricelist_id"] = pms_property.default_pricelist_id.id

        if params.get("reservation_type") and params.get("reservation_type") != booking_engine.reservation_type:
            vals["reservation_type"] = params.get("reservation_type")
        elif not booking_engine or not booking_engine.reservation_type:
            vals["reservation_type"] = 'normal'

        if not booking_engine:
            booking_engine = request.env["pms.booking.engine"].create(vals)
            booking_engine.flush()
        else:
            old_num_selected = {}
            old_board_service = {}
            for room_line in booking_engine.availability_results:
                if room_line.value_num_rooms_selected > 0:
                    old_num_selected[room_line.room_type_id] = room_line.value_num_rooms_selected
                if room_line.board_service_room_id:
                    old_board_service[room_line.room_type_id] = room_line.board_service_room_id
            if len(vals) > 0:
                booking_engine.write(vals)
                for k, v in old_num_selected.items():
                    room_line = booking_engine.availability_results.filtered(lambda a: a.room_type_id == k)
                    room_line.value_num_rooms_selected = v if room_line.num_rooms_available >= v else room_line.num_rooms_available
                for k, v in old_board_service.items():
                    room_line = booking_engine.availability_results.filtered(lambda a: a.room_type_id == k)
                    room_line.board_service_room_id = v
                booking_engine.flush()
        board_service_room_id = booking_engine.availability_results.board_service_room_id.pms_board_service_id.ids if booking_engine and booking_engine.availability_results.board_service_room_id.pms_board_service_id else False
        if params.get("board_service_room_id") and params.get("board_service_room_id") != 'false':
            board_service_room_id = int(params.get("board_service_room_id"))
            for room_line in booking_engine.availability_results:
                if (
                    board_service_room_id in room_line.room_type_id.board_service_room_type_ids.mapped("pms_board_service_id.id")
                ):
                    room_line.board_service_room_id = board_service_room_id
        elif board_service_room_id:
            board_service_room_id = board_service_room_id[0]

        if params.get("lines"):
            for line_id, values in params.get("lines").items():
                room_line = booking_engine.availability_results.filtered(
                    lambda r: r.id == int(line_id)
                )
                room_line.value_num_rooms_selected = int(values["value_num_rooms_selected"])

                booking_engine.flush()
        return self.parse_booking_engine(booking_engine, board_service_room_id)

    @http.route(
        ["/reservation/multiple_reservation_new"],
        type="json",
        auth="public",
        methods=["POST"],
        website=True,
    )
    def multiple_reservation_new(self, **kw):
        params = http.request.jsonrequest.get("params")
        print("params: {}".format(params))
        try:
            if params.get("id"):
                booking_engine = request.env["pms.booking.engine"].browse(
                    int(params.get("id"))
                )
            folio_action = booking_engine.create_folio()
            id_reservation = (
                request.env["pms.folio"]
                .browse(folio_action["res_id"])
                .reservation_ids[0]
                .id
            )
            return json.dumps(
                {
                    "result": True,
                    "message": _("Operation completed successfully."),
                    "id": id_reservation,
                }
            )
        except Exception as e:
            _logger.critical(e)
            # return json.dumps({"result": False, "message": str(e)})

    def parse_booking_engine(self, wizard, board_service_room_id=False):
        PmsReservation = request.env["pms.reservation"]
        wizard_values = dict()
        wizard_values["id"] = wizard.id
        wizard_values["partner_name"] = wizard.partner_name if wizard.partner_name else ""
        wizard_values["reservation_type"] = wizard.reservation_type
        wizard_values["reservation_types"] = PmsReservation._get_reservation_types()
        wizard_values["checkin"] = wizard.start_date.strftime(
            get_lang(request.env).date_format
        )
        wizard_values["checkout"] = wizard.end_date.strftime(
            get_lang(request.env).date_format
        )
        wizard_values["total_price_folio"] = wizard.total_price_folio
        wizard_values["discount"] = wizard.discount
        wizard_values["pricelist_id"] = {
            "id": wizard.pricelist_id.id if wizard.pricelist_id else False,
            "name": wizard.agency_id.name if wizard.agency_id else False,
            "url": wizard.website.image_url(wizard.agency_id, 'image_128')
            if wizard.agency_id else False,
        },
        wizard_values["allowed_pricelists"] = request.env[
            "pms.reservation"
        ]._get_allowed_pricelists()
        wizard_values["allowed_segmentations"] = request.env[
            "pms.reservation"
        ]._get_allowed_segmentations()
        wizard_values["channel_type_id"] = wizard.channel_type_id.id
        wizard_values["agency_id"] = wizard.agency_id.id
        wizard_values["allowed_channel_type_ids"] = wizard.pms_property_id._get_allowed_channel_type_ids()
        wizard_values["allowed_agency_ids"] = wizard.pms_property_id._get_allowed_agency_ids(
            channel_type_id=wizard.channel_type_id.id if wizard.channel_type_id else False
        )
        wizard_values["segmentation_ids"] = wizard.segmentation_ids.ids
        wizard_values["board_service_room_id"] = board_service_room_id
        wizard_values["internal_comment"] = wizard.internal_comment if wizard.internal_comment else ""

        # Compute allowed board service room ids
        room_types = wizard.availability_results.mapped("room_type_id")
        allowed_board_services = []
        for room_type in room_types:
            board_rooms = room_type._get_allowed_board_service_room_ids(
                room_type_id=room_type.id,
                pms_property_id=wizard.pms_property_id.id,
            )
            if not board_rooms:
                board_rooms = []
            boards = request.env["pms.board.service.room.type"].search([
                ("id", "in", [board["id"] for board in board_rooms])
            ]).mapped("pms_board_service_id")
            for board in boards:
                if all([board["id"] != allowed_board["id"] for allowed_board in allowed_board_services]):
                    allowed_board_services.append({"id": board["id"], "name": board["name"]})
        wizard_values["allowed_board_service_room_ids"] = allowed_board_services

        lines = {}
        for line in wizard.availability_results:
            lines[line.id] = {
                "room_type_id": line.room_type_id.display_name,
                "num_rooms_available": line.num_rooms_available,
                "value_num_rooms_selected": line.value_num_rooms_selected,
                "price_per_room": line.price_per_room,
                "price_total": line.price_total,
                "board_service_room_id": line.board_service_room_id.id,
                "board_service_room_name": line.board_service_room_id.pms_board_service_id.name if line.board_service_room_id else "No",
            }
        wizard_values["lines"] = lines
        _logger.info("Values from controller to Frontend (multi reservation creation):")
        pp.pprint(wizard_values)

        return wizard_values
