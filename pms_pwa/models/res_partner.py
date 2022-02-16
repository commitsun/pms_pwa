# Copyright 2020 Comunitea SL / Alejandro Núñez Liz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import _, api, fields, models
from odoo.tools import DEFAULT_SERVER_DATE_FORMAT
from odoo.tools.misc import get_lang


class ResPartner(models.Model):
    _inherit = "res.partner"

    def parse_res_partner(self):
        self.ensure_one()
        documents = []
        if len(self.id_numbers) >= 1:
            for document in self.id_numbers:
                documents.append(
                    {
                        "document_type": document.category_id.name,
                        "document_number": document.name,
                        "document_expedition_date": document.valid_from.strftime(
                            get_lang(self.env).date_format
                        ),
                    }
                )
        allowed_states = [
            {
                "id": False,
                "name": "",
            }
        ]
        if self.country_id:
            for state in self.env["res.country.state"].search(
                [("country_id", "=", self.country_id.id)]
            ):
                allowed_states.append(
                    {
                        "id": state.id,
                        "name": state.name,
                    }
                )

        partner_json = {
            "id": self.id,
            "firstname": self.firstname or None,
            "lastname": self.lastname or None,
            "lastname2": self.lastname2 or None,
            "birthdate_date": self.birthdate_date.strftime(
                get_lang(self.env).date_format
            ) if self.birthdate_date else None,
            "document_ids": documents,
            "email": self.email or None,
            "mobile": self.mobile or None,
            "image_128": self.image_128 or None,
            "gender": self.gender or None,
            "nationality_id": {
                "id": self.nationality_id and self.nationality_id.id or False,
                "name": self.nationality_id and self.nationality_id.name or False,
            },
            "state_id": {
                "id": self.state_id and self.state_id.id or False,
                "name": self.state_id and self.state_id.name or False,
            },
            "is_agency": self.is_agency or None,
            # "channel_type_id": {
            #    "id": self.channel_type_id.id if self.channel_type_id else False,
            #    "name": self.channel_type_id.name if self.channel_type_id else False,
            # },
            "is_company": self.is_company or None,
            "vat": self.vat or None,
            "street": self.street or None,
            "street2": self.street2 or None,
            "city": self.city or None,
            "zip": self.zip or None,
            "country_id": {
                "id": self.country_id and self.country_id.id or False,
                "name": self.country_id and self.country_id.name or False,
            },
            "comment": self.comment or None,
            "lang": self.lang or None,
            "allowed_channel_types": self.env[
                "pms.property"
            ]._get_allowed_channel_type_ids(),
            "allowed_country_ids": self.env[
                "pms.property"
            ]._get_allowed_countries(),
            "allowed_states": allowed_states,
        }
        return partner_json
