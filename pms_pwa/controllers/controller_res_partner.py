import json
from datetime import datetime

from odoo import _, http
from odoo.exceptions import MissingError
from odoo.http import request
from odoo.tools.misc import get_lang


class ResPartner(http.Controller):
    @http.route(
        "/partner/search",
        csrf=False,
        auth="public",
        website=True,
        type="http",
        methods=["GET"],
    )
    def suggest_search(self, keywords, **params):
        if not keywords:
            return json.dumps([])

        Partner = request.env["res.partner"].with_context(bin_size=True)

        domain = [
            "|",
            "|",
            ("name", "ilike", keywords),
            ("email", "ilike", keywords),
            ("mobile", "ilike", keywords),
        ]

        partners = Partner.search(domain, limit=10)
        partners = [dict(id=p.id, name=p.name, type="p") for p in partners]

        return json.dumps(partners)

    @http.route(
        ["/partner/<int:partner_id>"],
        csrf=False,
        auth="public",
        website=True,
        type="json",
        methods=["POST"],
    )
    def partner_detail(self, partner_id=None, **kw):
        if partner_id:
            partner = (
                request.env["res.partner"].sudo().search([("id", "=", int(partner_id))])
            )
            if not partner:
                raise MissingError(_("This partner does not exist."))
            return {"result": True, "partner": partner.parse_res_partner()}
        elif kw.get("reservation_id"):
            reservation = (
                request.env["pms.reservation"]
                .sudo()
                .search([("id", "=", int(kw.get("reservation_id")))])
            )

            partner_data = {
                "id": None,
                "reservation_id": kw.get("reservation_id"),
                "firstname": reservation.partner_name
                if reservation.partner_name
                else None,
                "lastname": None,
                "lastname2": None,
                "birthdate_date": None,
                "document_ids": None,
                "email": None,
                "mobile": reservation.mobile if reservation.mobile else None,
                "image_128": None,
                "gender": None,
                "nationality_id": {
                    "id": False,
                    "name": False,
                },
                "state_id": {
                    "id": False,
                    "name": False,
                },
                "is_agency": None,
                # "channel_type_id": {
                #    "id": self.channel_type_id.id if self.channel_type_id else False,
                #    "name": self.channel_type_id.name if self.channel_type_id else False,
                # },
                "is_company": None,
                "vat": None,
                "street": None,
                "street2": None,
                "city": None,
                "zip": None,
                "country_id": {
                    "id": False,
                    "name": False,
                },
                "comment": None,
                "lang": None,
                "allowed_channel_types": request.env[
                    "pms.property"
                ]._get_allowed_channel_type_ids(),
                "allowed_country_ids": request.env[
                    "pms.property"
                ]._get_allowed_countries(),
                "allowed_states": [],
            }
            return {"result": True, "partner": partner_data}
        else:
            return {"result": False, "message": _("Partner not indicated")}

    @http.route(
        ["/new_partner"],
        csrf=False,
        auth="public",
        website=True,
        type="json",
        methods=["POST"],
    )
    def new_partner(self, **kw):
        if kw.get("submit"):
            try:
                values = {
                    "firstname": kw.get("firstname"),
                    "lastname": kw.get("lastname"),
                    "lastname2": kw.get("lastname2"),
                    "birthdate_date": datetime.strptime(
                        kw.get("birthdate_date"), get_lang(request.env).date_format
                    ).date()
                    if kw.get("birthdate_date")
                    else None,
                    # "document_ids": [
                    #    (
                    #        0,
                    #        0,
                    #        {
                    #            "document_type": params.get("document_type"),
                    #            "document_number": params.get("document_number"),
                    #            "document_expedition_date": params.get(
                    #                "document_expedition_date"
                    #            ),
                    #        },
                    #    )
                    # ],
                    "email": kw.get("email"),
                    "mobile": kw.get("mobile"),
                    "image_128": kw.get("image_128"),
                    "gender": kw.get("gender"),
                    "nationality_id": int(kw.get("nationality_id")),
                    "state_id": int(kw.get("state_id")),
                    "is_agency": kw.get("is_agency"),
                    # "channel_type_id": params.get("channel_type_id"),
                    "is_company": kw.get("is_company"),
                    "vat": kw.get("vat"),
                    "street": kw.get("street"),
                    "street2": kw.get("street2"),
                    "city": kw.get("city"),
                    "zip": kw.get("zip"),
                    "country_id": int(kw.get("country_id")),
                    "comment": kw.get("comment"),
                    "lang": kw.get("lang"),
                }

                if kw.get("id"):
                    partner = request.env["res.partner"].browse(int(kw.get("id")))
                    partner.write(values)
                else:
                    partner = request.env["res.partner"].sudo().create(values)
                return {"result": True, "partner": partner.parse_res_partner()}
            except Exception as e:
                return {"result": False, "message": str(e)}
        else:
            allowed_states = []
            if kw.get("country_id"):
                for state in request.env["res.country.state"].search(
                    [("country_id", "=", int(kw["country_id"]))]
                ):
                    allowed_states.append(
                        {
                            "id": state.id,
                            "name": state.name,
                        }
                    )
            data_json = {
                "allowed_langs": request.env["pms.property"]._get_langs(),
                "allowed_channel_types": request.env[
                    "pms.property"
                ]._get_allowed_channel_type_ids(),
                "allowed_country_ids": request.env[
                    "pms.property"
                ]._get_allowed_countries(),
                "allowed_states": allowed_states,
                "country_id": {
                    "id": int(kw.get("country_id")) if kw.get("country_id") else None,
                    "name": None,
                },
                "nationality_id": {
                    "id": int(kw.get("nationality_id"))
                    if kw.get("nationality_id")
                    else None,
                    "name": None,
                },
            }
            return json.dumps(data_json)
