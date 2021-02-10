from odoo import api, fields, models
from odoo.osv import expression


def _get_search_domain(search=False, **post):
    domains = []
    if search:
        for srch in search.split(" "):
            subdomains = [
                [("reservation_ids.localizator", "in", [srch])],
                [("reservation_ids.partner_id.phone", "ilike", srch)],
                [("reservation_ids.partner_id.mobile", "ilike", srch)],
                [("reservation_ids.partner_id.name", "ilike", srch)],
                [("reservation_ids.partner_id.vat", "ilike", srch)],
                [("reservation_ids.partner_id.email", "ilike", srch)],
            ]
            domains.append(expression.OR(subdomains))
    # REVIEW: Use lib to this
    # post send a filters with key: "operator&field"
    # to build a odoo domain:
    for k, v in post.items():
        if "&" in v:
            domains.append((k[v.index("&") :], k[: v.index("&"), v]))
    return expression.AND(domains)


class PmsReservation(models.Model):
    _inherit = "pms.folio"
    # REVIEW: location of this field [pms|pms_pwa]
    folio_total_adults = fields.Integer(
        string="Folio nº adults", compute="_compute_folio_adults"
    )

    def _compute_folio_adults(self):
        for record in self:
            adults = 0
            for res in record.reservation_ids:
                adults += res.adults
            record.folio_total_adults = adults

    @api.model
    def search_count_folios_pwa(self, search, **post):
        rdo = self.env["pms.folio"].search_count(_get_search_domain(search, **post))
        return rdo

    @api.model
    def search_folios_pwa(self, search, order, limit, offset, **post):
        rdo = self.env["pms.folio"].search(
            _get_search_domain(search, **post), order=order, limit=limit, offset=offset
        )
        return rdo
