import datetime

from odoo.http import request
from odoo.tools.misc import get_lang

from . import controllers, models


class PwaUtils:
    def parse_params_record(self, origin_values, model):
        new_values = {}
        for k, v in origin_values.items():
            field = model._fields[k]
            if field.type in ("float", "monetary"):
                new_values[k] = float(v)
            if field.type in ("integer", "many2one"):
                new_values[k] = int(v)
            if field.type == "date":
                new_values[k] = datetime.datetime.strptime(
                    v, get_lang(request.env).date_format
                ).date()
            if field.type in ("one2many", "many2many"):
                relational_model = request.env[field.comodel_name]
                cmds = []
                for record_id, value in v.items():
                    cmds.append(
                        (
                            1,
                            int(record_id),
                            self.parse_params_record(
                                origin_values=value, model=relational_model
                            ),
                        )
                    )
                new_values[k] = cmds
        return new_values


pwa_utils = PwaUtils()
