from odoo import _, http
from odoo.http import request
import json
from odoo.exceptions import MissingError


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

        domain = []
        domain += [("name", "ilike", keywords)]

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
                request.env["res.partner"]
                .sudo()
                .search([("id", "=", int(partner_id))])
            )
            if not partner:
                raise MissingError(_("This partner does not exist."))
            return json.dumps({"result": True, "partner": partner.parse_res_partner()})
        return json.dumps({"result": False, "message": _("Partner not indicated")})

    @http.route(
        ["/new_partner"],
        csrf=False,
        auth="public",
        website=True,
        type="json",
        methods=["POST"],
    )
    def new_partner(self, **kw):
        params = http.request.jsonrequest.get("params")
        if params.get("submit"):
            try:
                partner = request.env["res.partner"].sudo().create(
                    {
                        "firstname": params.get("name"),
                        "lastname": params.get("lastname"),
                        "lastname2": params.get("lastname2"),
                        "birthdate_date": params.get("birthdate_date"),
                        "document_ids": [
                            (
                                0,
                                0,
                                {
                                    "document_type": params.get("document_type"),
                                    "document_number": params.get("document_number"),
                                    "document_expedition_date": params.get(
                                        "document_expedition_date"
                                    ),
                                },
                            )
                        ],
                        "email": params.get("email"),
                        "mobile": params.get("mobile"),
                        "image_128": params.get("image_128"),
                        "gender": params.get("gender"),
                        "nationality_id": params.get("country_id"),
                        "state_id": params.get("state_id"),
                        "is_agency": params.get("is_agency"),
                        "channel_type_id": params.get("channel_type_id"),
                        "is_company": params.get("is_company"),
                        "vat": params.get("vat"),
                        "street": params.get("street"),
                        "street2": params.get("street2"),
                        "city": params.get("city"),
                        "zip": params.get("zip"),
                        "country_id": params.get("country_id"),
                        "comment": params.get("comment"),
                        "lang": params.get("lang"),
                    }
                )
                return json.dumps({"result": True, "partner": partner.parse_res_partner()})
            except Exception as e:
                return json.dumps({"result": False, "message": str(e)})
        else:
            if params.get("country_id"):
                allowed_states = []
                for state in request.env["res.country.state"].search(
                    [("country_id", "=", int(params["country_id"]))]
                ):
                    allowed_states.append(
                        {
                            "id": state.id,
                            "name": state.name,
                        }
                    )
            data_json = {
                "allowed_langs": request.env["pms.property"]._get_langs(),
                "allowed_channel_types": request.env["pms.property"].get_allowed_channel_type_ids(),
                "allowed_country_ids": request.env["pms.property"]._get_allowed_countries(),
                "allowed_states": allowed_states,
            }
            return json.dumps(data_json)
