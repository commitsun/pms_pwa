from odoo import _, http
from odoo.http import request
import json


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
