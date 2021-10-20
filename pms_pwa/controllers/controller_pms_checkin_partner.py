import json

from odoo import http
from odoo.http import request


class PmsCheckinPartner(http.Controller):
    @http.route(
        "/pms_checkin_partner/search",
        csrf=False,
        auth="public",
        website=True,
        type="http",
        methods=["GET"],
    )
    def suggest_search(self, keywords, **params):
        if not keywords:
            return json.dumps([])

        if not params or not params.get("model", False):
            return json.dumps([])
        else:
            checkin_partner = params.get("id", False)
            if checkin_partner:
                checkin_partner = request.env["pms.checkin.partner"].browse(
                    int(params.get("id"))
                )

            model = request.env[params.get("model")].with_context(bin_size=True)

            domain = [
                ("name", "ilike", keywords),
            ]

            if params.get("model") == "res.country" and checkin_partner:
                domain.append(("id", "in", checkin_partner.allowed_countries.ids))
            elif params.get("model") == "res.country.state" and checkin_partner:
                domain.append(("id", "in", checkin_partner.allowed_states.ids))

            results = model.search(domain, limit=10)
            results = [dict(id=p.id, name=p.name, type="p") for p in results]

            return json.dumps(results)
