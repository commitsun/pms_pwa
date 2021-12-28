# Copyright 2021 Comunitea Servicios Tecnológicos
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import _, fields, models, api


class PmsUserCalendarProperty(models.Model):
    _name = "pms.user.calendar.property"

    pms_property_id = fields.Many2one(
        string="PMS Property",
        help="tecnical field to save property config calendar",
        comodel_name="pms.property",
    )
    user_id = fields.Many2one(
        string="User",
        help="tecnical field to save user defaults calendar",
        comodel_name="res.users",
    )
    select_pricelist = fields.Many2one(
        string="Default Pricelist",
        help="tecnical field to save pricelist defaults calendar",
        comodel_name="product.pricelist",
    )
    select_availability_plan = fields.Many2one(
        string="Default Avail Plan",
        help="tecnical field to save availability plan defaults calendar",
        comodel_name="pms.availability.plan",
    )
    date_start = fields.Date()

