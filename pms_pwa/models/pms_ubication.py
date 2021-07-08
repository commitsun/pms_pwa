# Copyright 2020 Comunitea SL / Alejandro Núñez Liz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import _, api, fields, models
from odoo.tools import DEFAULT_SERVER_DATE_FORMAT
from odoo.tools.misc import get_lang


class PmsUbication(models.Model):
    _inherit = "pms.ubication"

    total_rooms_count = fields.Integer(
        string="Total rooms",
        compute="_compute_total_rooms_count",
        store=True,
    )

    @api.depends("pms_room_ids", "pms_room_ids.active")
    def _compute_total_rooms_count(self):
        for record in self:
            record.total_rooms_count = len(record.pms_room_ids)

    def _get_total_rooms(self):
        pms_property_id = self.env.user.get_active_property_ids()[0]
        return len(self.room_ids.filtered(lambda r: r.pms_property_id.id == pms_property_id))

