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
                        "document_type": {"id": document.document_type.id, "name": document.document_type.name},
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

        allowed_channel_types = []
        if self.is_agency:
            domain = [("channel_type", "=", "indirect")]
            channel_types = self.env["pms.sale.channel"].search(domain)
            for channel in channel_types:
                allowed_channel_types.append({"id": channel.id, "name": channel.name})

        partner_json = {
            "id": self.id,
            "partner_type": "agency" if self.is_agency else self.company_type,
            "firstname": self.firstname or False,
            "lastname": self.lastname or False,
            "lastname2": self.lastname2 or False,
            "birthdate_date": self.birthdate_date.strftime(
                get_lang(self.env).date_format
            ) if self.birthdate_date else False,
            "parent_id": self.parent_id.id if self.parent_id else False,
            "document_type": documents[0]["document_type"]["id"] if documents else False,
            "document_number": documents[0]["document_number"] if documents else False,
            "document_expedition_date": documents[0]["document_expedition_date"] if documents else False,
            "email": self.email or False,
            "mobile": self.mobile or False,
            "image_128": self.image_128 or False,
            "gender": self.gender or False,
            "nationality_id": {
                "id": self.nationality_id and self.nationality_id.id or False,
                "name": self.nationality_id and self.nationality_id.name or False,
            },
            "invoice_state_id": {
                "id": self.state_id and self.state_id.id or False,
                "name": self.state_id and self.state_id.name or False,
            },
            "sale_channel_id": {
                "id": self.sale_channel_id.id,
                "name": self.sale_channel_id.name,
            } if self.sale_channel_id else False,
            "vat": self.vat or False,
            "invoice_street": self.street or False,
            "invoice_street2": self.street2 or False,
            "invoice_city": self.city or False,
            "invoice_zip": self.zip or False,
            "invoice_country_id": {
                "id": self.country_id and self.country_id.id or False,
                "name": self.country_id and self.country_id.name or False,
            } if self.country_id else False,
            "comment": self.comment or False,
            # "lang": [(self.lang.code, self.lang.name)] if self.lang else False,
            "allowed_channel_types": allowed_channel_types,
            "allowed_invoice_country_ids": self.env[
                "pms.property"
            ]._get_allowed_countries(),
            "allowed_invoice_states": allowed_states,
        }
        return partner_json
