import datetime

from odoo import _, http
from odoo.http import request
from odoo.tools.misc import format_date, formatLang, get_lang


class Rooms(http.Controller):
    @http.route(
        "/rooms",
        type="json",
        website=True,
        auth="public",
    )
    def list_available_rooms(self):
        payload = http.request.jsonrequest.get("params")

        return self._get_available_rooms(payload)

    def _get_available_rooms(self, payload):

        rooms = []
        checkin = payload["checkin"]
        if isinstance(checkin, str):
            checkin = datetime.datetime.strptime(
                checkin, get_lang(request.env).date_format
            ).date()

        checkout = payload["checkout"]
        if isinstance(checkout, str):
            checkout = datetime.datetime.strptime(
                checkout, get_lang(request.env).date_format
            ).date()

        pms_property_id = int(payload["pms_property_id"])
        pricelist_id = int(payload["pricelist_id"])
        room_type_id = int(payload["room_type_id"]) if payload.get("room_type_id") else False
        room_type = request.env["pms.room.type"].browse(room_type_id) if room_type_id else False
        class_id = room_type.class_id.id if room_type else False

        reservation = False
        if payload["reservation_id"]:
            reservation_id = int(payload["reservation_id"])
            reservation = (
                request.env["pms.reservation"]
                .sudo()
                .search([("id", "=", int(reservation_id))])
            )

        if not reservation:
            reservation_line_ids = False
        else:
            reservation_line_ids = reservation.reservation_line_ids.ids
        pms_property = request.env["pms.property"].browse(pms_property_id)
        pms_property = pms_property.with_context(
            checkin=checkin,
            checkout=checkout,
            current_lines=reservation_line_ids,
            pricelist_id=pricelist_id,
            class_id=class_id,
            real_avail=True,
        )
        rooms_avail = pms_property.free_room_ids

        for room in rooms_avail:
            rooms.append({"id": room.id, "name": room.name})

        return rooms
