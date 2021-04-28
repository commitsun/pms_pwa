# Copyright 2017  Dario Lodeiros
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class PmsPWARoomType(models.Model):
    _inherit = "pms.room.type"

    def _get_availability_rooms(self):
        avail = 0
        if self._context.get("checkin") and self._context.get("checkout"):
            avail = self.env[
                "pms.availability.plan"
            ].get_count_rooms_available(
                checkin=self._context.get("checkin"),
                checkout=self._context.get("checkout"),
                room_type_id=self.id,
                pms_property_id=self.env.user.get_active_property_ids()[0],# REVIEW: self._context.get("pms_property_id"),
                pricelist_id=self._context.get("pricelist_id") or False,
            )
        return avail

    @api.model
    def _get_allowed_board_service_room_ids(self, room_type_id, pms_property_id):
        board_services = self.env["pms.board.service.room.type"].search(
            [
                ("pms_room_type_id", "=", room_type_id),
                "|",
                ("pms_property_ids", "=", False),
                ("pms_property_ids", "in", pms_property_id),
            ]
        )
        allowed_board_services = []
        for board_service in board_services:
            allowed_board_services.append(
                {
                    "id": board_service.id,
                    "name": board_service.pms_board_service_id.name,
                }
            )
        return allowed_board_services if allowed_board_services else False
