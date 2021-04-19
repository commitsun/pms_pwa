# Copyright 2020 Comunitea SL / Alejandro Núñez Liz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from datetime import datetime

from odoo import _, api, fields, models
from odoo.tools import DEFAULT_SERVER_DATE_FORMAT


class PmsService(models.Model):
    _inherit = "pms.service"

    def _get_service_line_ids(self):
        """
        @return: Return dict with service_line_ids
         [
          id: {"day_qty": day_qty, "date": date, "price": price},
          id: {"day_qty": day_qty, "date": date, "price": price},
          ...
          id: {"day_qty": day_qty, "date": date, "price": price},
         ]
        """
        self.ensure_one()
        service_line_ids = {}
        for line in self.service_line_ids:
            service_line_ids[line.id] = {
                "day_qty": line.day_qty,
                "date": datetime.strftime(line.date, DEFAULT_SERVER_DATE_FORMAT),
                "price": line.price_unit,
            }
        return service_line_ids
