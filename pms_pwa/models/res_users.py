# Copyright 2021 Comunitea Servicios Tecnológicos
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import _, fields, models

class ResPartner(models.Model):
    _inherit = "res.users"

    pms_pwa_property_ids = fields.Many2many(
        string="PMS PWA Allowed Properties",
        help="The properties selected in pms_pwa for this user",
        comodel_name="pms.property",
        relation="pms_pwa_property_users_rel",
        column1="user_id",
        column2="pms_property_id",
        domain="[('company_id','in',company_ids)]",
    )

    pms_pwa_property_id = fields.Many2one(
        string="PMS PWA Active Property",
        help="The active property selected in pms_pwa for this user",
        comodel_name="pms.property",
        domain="[('company_id','in',company_ids)]",
    )