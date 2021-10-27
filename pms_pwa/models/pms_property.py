# Copyright 2020 Comunitea SL / Alejandro Núñez Liz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import _, api, fields, models
from odoo.tools import DEFAULT_SERVER_DATE_FORMAT
from odoo.tools.misc import get_lang
import datetime


class PmsProperty(models.Model):
    _inherit = "pms.property"

    total_rooms_count = fields.Integer(
        string="Total rooms",
        compute="_compute_total_rooms_count",
        store=True,
    )

    @api.depends("room_ids", "room_ids.active")
    def _compute_total_rooms_count(self):
        for record in self:
            record.total_rooms_count = len(record.room_ids)

    def _get_room_classes(self):
        return self.room_ids.room_type_id.class_id

    def _get_total_rooms(self):
        return len(self.room_ids.filtered(lambda r: r.room_type_id.overnight_room))

    def _get_occupied_rooms(self):
        if self._context.get("checkin") and self._context.get("checkout"):
            room_ids = self.room_ids.ids
            return len(self.env["pms.availability"].get_rooms_not_avail(
                checkin=self._context.get("checkin"),
                checkout=self._context.get("checkout"),
                room_ids=room_ids,
                pms_property_id=self.id,
            ))

    def _get_occupied_reservations(self):
        if self._context.get("checkin") and self._context.get("checkout"):
            room_ids = self.room_ids.ids
            return len(self.env["pms.reservation.line"].search(
                [
                    ("date", ">=", self._context.get("checkin")),
                    ("date", "<=", self._context.get("checkout") - datetime.timedelta(1)),
                    ("room_id", "in", room_ids),
                    ("pms_property_id", "=", self.id),
                    ("occupies_availability", "=", True),
                    ("reservation_id.reservation_type", "!=", "out"),
                    ("overnight_room", "=", True)
                ]
            ).mapped("reservation_id.id"))

    def _get_occupied_out_service(self):
        if self._context.get("checkin") and self._context.get("checkout"):
            room_ids = self.room_ids.ids
            return len(self.env["pms.reservation.line"].search(
                [
                    ("date", ">=", self._context.get("checkin")),
                    ("date", "<=", self._context.get("checkout") - datetime.timedelta(1)),
                    ("room_id", "in", room_ids),
                    ("pms_property_id", "=", self.id),
                    ("occupies_availability", "=", True),
                    ("reservation_id.reservation_type", "=", "out"),
                ]
            ).mapped("reservation_id.id"))

    def _get_class_availability(self, room_class_id, checkin, checkout, pricelist_id):
        availability_rooms = self.with_context(
            checkin=checkin,
            checkout=checkout,
            pricelist_id=pricelist_id).free_room_ids
        availability_rooms = availability_rooms.filtered(lambda r: r.room_type_id.class_id.id == room_class_id)
        return len(availability_rooms)

    def _get_allowed_payments_journals(self):
        """
        @return: Return dict with journals
         [
          {"id": id, "name": name},
          {"id": id, "name": name},
          ...
          {"id": id, "name": name},
         ]
        """
        payment_methods = self._get_payment_methods()
        allowed_journals = []
        for journal in payment_methods:
            allowed_journals.append({"id": journal.id, "name": journal.name})
        return allowed_journals

    def _get_allowed_channel_type_ids(self):
        domain = [("is_on_line", "=", False)]
        channel_types = self.env["pms.sale.channel"].search(domain)
        allowed_channel_types = []
        for channel in channel_types:
            allowed_channel_types.append({"id": channel.id, "name": channel.name})
        return allowed_channel_types

    def _get_allowed_agency_ids(self, channel_type_id=False):
        domain = [("is_on_line", "=", False)]
        if channel_type_id:
            domain.append(("id", "=", channel_type_id))
        channel_types_ids = (
            self.env["pms.sale.channel"].search(domain).ids
        )
        agencies = self.env["res.partner"].search(
            [
                ("is_agency", "=", True),
                ("sale_channel_id", "in", channel_types_ids),
            ]
        )
        allowed_agencies = [{"id": False, "name": ""}]
        for agency in agencies:
            allowed_agencies.append({"id": agency.id, "name": agency.name})
        return allowed_agencies

    @api.model
    def _get_allowed_countries(self):
        allowed_countries = []
        for country in self.env["res.country"].search([]):
            allowed_countries.append(
                {
                    "id": country.id,
                    "name": country.name,
                }
            )
        return allowed_countries

    @api.model
    def _get_langs(self):
        installed_langs = dict(self.env['res.lang'].get_installed())
        return installed_langs

    def get_available_ammenities(self):
        self.ensure_one()
        ammenities_json = []
        ammenities = self.env["pms.ammenities"].search([
            '|',
            ("pms_property_ids", "in", self.id),
            ("pms_property_ids", "=", False),
        ])
        for am in ammenities:
            ammenities_json.append(
                {
                    "id": am.id,
                    "name": am.name,
                }
            )
        return ammenities_json
