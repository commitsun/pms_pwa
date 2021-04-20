import datetime

from odoo import _, http
from odoo.http import request


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
        checkin = datetime.datetime.strptime(checkin, "%Y-%m-%d")

        checkout = payload["checkout"]
        checkout = datetime.datetime.strptime(checkout, "%Y-%m-%d")

        pms_property_id = int(payload["pms_property_id"])
        pricelist_id = int(payload["pricelist_id"])

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

        rooms_avail = (
            request.env["pms.room.type.availability.plan"]
            .sudo()
            .rooms_available(
                checkin=checkin,
                checkout=checkout,
                current_lines=reservation_line_ids,
                pricelist_id=pricelist_id,
                pms_property_id=pms_property_id,
            )
        )

        pms_room_types = request.env["pms.room.type"].sudo().search([])

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
