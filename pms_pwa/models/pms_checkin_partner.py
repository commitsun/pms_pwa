# Copyright 2017  Dario Lodeiros
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import avinit

from odoo import _, api, fields, models


class PmsCheckinPartner(models.Model):
    _inherit = "pms.checkin.partner"

    partner_image_128 = fields.Image(
        string="Image",
        help="Partner Image, it corresponds with Partner Image associated or name initials",
        store=True,
        compute="_compute_partner_image_128",
    )
    image_autogenerated = fields.Boolean(
        string="Autogenerate image",
        help="Indicates if the image was auto-generated to overwrite if renamed",
        default=False,
    )

    @api.depends("partner_id", "partner_id.image_128", "firstname", "lastname")
    def _compute_partner_image_128(self):
        for record in self:
            if record.partner_id:
                record.partner_image_128 = record.partner_id.image_128
            elif (record.firstname or record.lastname) and (not record.partner_image_128 or record.image_autogenerated):
                name = record.firstname or False
                if name and record.lastname:
                    name = (name + ' ' + record.lastname)
                elif not name:
                    name = record.lastname
                avatar = avinit.get_avatar_data_url(name)
                record.partner_image_128 = avatar[26:]
            elif not record.partner_image_128:
                record.partner_image_128 = False
