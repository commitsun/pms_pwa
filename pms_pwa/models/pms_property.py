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

    def _get_min_stay(self):
        if self._context.get("checkin") and self._context.get("checkout") and self._context.get("pricelist_id"):
            Restrictions = self.env["pms.availability.plan.rule"]
            pricelist = self.env["product.pricelist"].browse(int(self._context.get("pricelist_id")))
            if pricelist.availability_plan_id:
                restrictions = Restrictions.search([
                    ("availability_plan_id", "=", pricelist.availability_plan_id.id),
                    ("date", ">=", self._context.get("checkin")),
                    ("date", "<", self._context.get("checkout")),
                    ("pms_property_id", "=", self.id),
                ])
                if self._context.get("room_type_id"):
                    restrictions = restrictions.filtered(lambda r: r.room_type_id.id == int(self._context.get("room_type_id")))
                min_stay = restrictions.mapped("min_stay")
                if min_stay:
                    return max(min_stay)
            return False

    def _get_other_restrictions(self):
        if self._context.get("checkin") and self._context.get("checkout") and self._context.get("pricelist_id"):
            Restrictions = self.env["pms.availability.plan.rule"]
            pricelist = self.env["product.pricelist"].browse(int(self._context.get("pricelist_id")))
            restrictions_str = ""
            if pricelist.availability_plan_id:
                restrictions = Restrictions.search([
                    ("availability_plan_id", "=", pricelist.availability_plan_id.id),
                    ("date", ">=", self._context.get("checkin")),
                    ("date", "<", self._context.get("checkout")),
                    ("pms_property_id", "=", self.id),
                ])
                if self._context.get("room_type_id"):
                    restrictions = restrictions.filtered(lambda r: r.room_type_id.id == int(self._context.get("room_type_id")))
                for restriction in restrictions:
                    if restriction.quota > 0:
                        restrictions_str += _("%s Cupo: %s\n") % (restriction.room_type_id.default_code, restriction.quota)
                    if restriction.max_avail > 0:
                        restrictions_str += _("%s Max. disponible: %s\n") % (restriction.room_type_id.default_code, restriction.max_avail)
                    if restriction.min_stay_arrival > 0:
                        restrictions_str += _("%s Min. estancia entrada: %s\n") % (restriction.room_type_id.default_code, restriction.min_stay_arrival)
                    if restriction.max_stay > 0:
                        restrictions_str += _("%s Max. estancia: %s\n") % (restriction.room_type_id.default_code, restriction.max_stay)
                    if restriction.closed:
                        restrictions_str += _("%s Ventas Cerradas") % (restriction.room_type_id.default_code)
                    if restriction.closed_arrival:
                        restrictions_str += _("%s Entrada Cerrada") % (restriction.room_type_id.default_code)
                    if restriction.closed_departure:
                        restrictions_str += _("%s Salida Cerrada") % (restriction.room_type_id.default_code)
                    if restriction.max_stay_arrival:
                        restrictions_str += _("%s Max. estancia entrada: %s\n") % (restriction.room_type_id.default_code, restriction.max_stay_arrival)
            if len(restrictions_str) > 0:
                return restrictions_str
            return False

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
        allowed_countries = [
            {
                "id": False,
                "name": "",
            }
        ]
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
