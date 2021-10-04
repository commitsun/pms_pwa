# Copyright 2021 Comunitea Servicios Tecnológicos
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import _, fields, models, api


class ResPartner(models.Model):
    _inherit = "res.users"

    pms_pwa_property_ids = fields.Many2many(
        string="PMS PWA Allowed Properties",
        help="The properties selected in pms_pwa for this user",
        comodel_name="pms.property",
        relation="pms_pwa_property_users_rel",
        column1="user_id",
        column2="pms_property_id",
        domain="[('id','in',pms_property_ids)]",
    )

    pms_pwa_property_id = fields.Many2one(
        string="PMS PWA Active Property",
        help="The active property selected in pms_pwa for this user",
        comodel_name="pms.property",
        domain="[('id','in',pms_property_ids)]",
        compute="_compute_pms_pwa_property_id",
        readonly=False,
        store=True,
    )

    @api.depends("pms_property_ids", "pms_property_id")
    def _compute_pms_pwa_property_id(self):
        for record in self:
            if not record.pms_pwa_property_id or \
                    record.pms_pwa_property_id not in record.pms_property_ids:
                if record.pms_property_id:
                    record.pms_pwa_property_id = record.pms_property_id
                else:
                    record.pms_pwa_property_id = False
