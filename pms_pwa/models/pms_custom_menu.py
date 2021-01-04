# Copyright 2020 Comunitea SL / Alejandro Núñez Liz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import _, fields, models


class RoomdooWebsiteMenu(models.Model):
    _inherit = "website.menu"
    img = fields.Binary(string="Image menu")
