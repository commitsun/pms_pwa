# Copyright 2017  Dario Lodeiros
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class PmsPWARoomType(models.Model):
    _inherit = "pms.room.type"

    def get_availability_rooms(self):
        avail = 0
        if self._context.get("checkin") and self._context.get("checkout"):
            avail = self.env[
                "pms.room.type.availability.plan"
            ].get_count_rooms_available(
                checkin=self._context.get("checkin"),
                checkout=self._context.get("checkout"),
                room_type_id=self.id,
                pms_property_id=self._context.get("pms_property_id") or False,
                pricelist_id=self._context.get("pricelist_id") or False,
            )
        return avail
