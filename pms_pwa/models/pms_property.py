# Copyright 2020 Comunitea SL / Alejandro Núñez Liz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import _, api, fields, models
from odoo.tools import DEFAULT_SERVER_DATE_FORMAT
from odoo.tools.misc import get_lang


class PmsProperty(models.Model):
    _inherit = "pms.property"

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
        payment_methods = (
            self.env["account.journal"]
            .sudo()
            .search([("type", "in", ["bank", "cash"])])
        )
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
