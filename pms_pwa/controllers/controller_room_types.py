import datetime

from odoo import _, http
from odoo.http import request
from odoo.tools import DEFAULT_SERVER_DATE_FORMAT


from odoo.tools.misc import formatLang, format_date, get_lang


class RoomTypes(http.Controller):
    @http.route(
        "/room_types",
        type="json",
        website=True,
        auth="public",
    )
    def room_type_list(self):
        payload = http.request.jsonrequest.get("params")

        return self._get_available_room_types(payload)

    def _get_available_room_types(self, payload):
        room_types = []
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

        reservation = False
        if isinstance(payload["reservation_id"], int):
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
        )
        rooms_avail = pms_property.free_room_ids

        pms_room_types = request.env["pms.room.type"].browse(
            request.env["pms.room"].sudo().search([
                ("pms_property_id", "=", pms_property.id)
            ]).mapped("room_type_id.id")
        )

        for room_type in pms_room_types.filtered(lambda r: r.total_rooms_count > 0):
            count = len(
                rooms_avail.filtered(lambda r: r.room_type_id.id == room_type.id)
            )
            room_types.append(
                {
                    "id": room_type.id,
                    "name": room_type.name + " (" + str(count) + ")",
                }
            )
        return room_types
