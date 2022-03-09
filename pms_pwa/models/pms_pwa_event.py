# Copyright 2021 Comunitea Servicios Tecnológicos
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import _, fields, models, api


class PmsPwaEvent(models.Model):
    _name = "pms.pwa.event"

    pms_property_ids = fields.Many2many(
        string="PMS Properties",
        help="tecnical field to save property config calendar",
        comodel_name="pms.property",
    )
    date = fields.Date(string="Date", required=True, index=True)
    description = fields.Text(string="Description", required=True)
