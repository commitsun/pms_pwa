# Copyright 2020 Comunitea SL / Alejandro Núñez Liz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import _, api, fields, models
from odoo.tools import DEFAULT_SERVER_DATE_FORMAT
from odoo.tools.misc import get_lang


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
                "date": line.date.strftime(get_lang(self.env).date_format),
                "price_unit": line.price_unit,
            }
        print("LINES SERVICES")
        print(service_line_ids)
        return service_line_ids
