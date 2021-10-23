# Copyright 2020 Comunitea SL / Alejandro Núñez Liz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import _, api, fields, models
from odoo.tools import DEFAULT_SERVER_DATE_FORMAT
from odoo.tools.misc import get_lang
import datetime


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

    def _get_total_rooms(self, pms_property_id):
        rooms = self.env["pms.room"].search([
            ("pms_property_id", "=", pms_property_id),
            ("ubication_id", "=", self.id)
        ])
        return len(rooms)

    def _get_occupied_rooms(self, pms_property_id):
        if self._context.get("checkin") and self._context.get("checkout"):
            room_ids = self.pms_room_ids.filtered(
                lambda r: r.pms_property_id.id == pms_property_id
            ).ids
            return len(self.env["pms.availability"].get_rooms_not_avail(
                checkin=self._context.get("checkin"),
                checkout=self._context.get("checkout"),
                room_ids=room_ids,
                pms_property_id=pms_property_id,
            ))

    def _get_occupied_reservations(self, pms_property_id):
        if self._context.get("checkin") and self._context.get("checkout"):
            room_ids = self.pms_room_ids.filtered(
                lambda r: r.pms_property_id.id == pms_property_id
            ).ids
            return len(self.env["pms.reservation.line"].search(
                [
                    ("date", ">=", self._context.get("checkin")),
                    ("date", "<=", self._context.get("checkout") - datetime.timedelta(1)),
                    ("room_id", "in", room_ids),
                    ("pms_property_id", "=", pms_property_id),
                    ("occupies_availability", "=", True),
                    ("reservation_id.reservation_type", "!=", "out"),
                ]
            ).mapped("reservation_id.id"))

    def _get_occupied_out_service(self, pms_property_id):
        if self._context.get("checkin") and self._context.get("checkout"):
            room_ids = self.pms_room_ids.filtered(
                lambda r: r.pms_property_id.id == pms_property_id
            ).ids
            return len(self.env["pms.reservation.line"].search(
                [
                    ("date", ">=", self._context.get("checkin")),
                    ("date", "<=", self._context.get("checkout") - datetime.timedelta(1)),
                    ("room_id", "in", room_ids),
                    ("pms_property_id", "=", pms_property_id),
                    ("occupies_availability", "=", True),
                    ("reservation_id.reservation_type", "=", "out"),
                ]
            ).mapped("reservation_id.id"))
