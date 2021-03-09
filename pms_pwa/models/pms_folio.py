from odoo import api, fields, models
from odoo.osv import expression


def _get_search_domain(search=False, **post):
    domains = []
    search_exists = False
    if search:
        search_exists = True
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
    domain_fields = []
    for k, v in post.items():
        if v and k in ["name", "vat", "email"]:
            domain_fields.append(("reservation_ids.partner_id." + k, "=", v))
        elif v and k in ["checkin", "checkout"]:
            domain_fields.append(("reservation_ids." + k, "=", v))
        elif v and k == "checkin_from":
            domain_fields.append(("reservation_ids.checkin", ">=", v))
        elif v and k == "checkout_from":
            domain_fields.append(("reservation_ids.checkout", ">=", v))
        elif v and k == "checkin_to":
            domain_fields.append(("reservation_ids.checkin", "<=", v))
        elif v and k == "checkout_to":
            domain_fields.append(("reservation_ids.checkout", "<=", v))
        elif v and k == "created_from":
            domain_fields.append(("reservation_ids.create_date", ">=", v))
        elif v and k == "modified_from":
            domain_fields.append(("reservation_ids.write_date", ">=", v))
        elif v and k == "created_to":
            domain_fields.append(("reservation_ids.create_date", "<=", v))
        elif v and k == "modified_to":
            domain_fields.append(("reservation_ids.write_date", "<=", v))
        elif v and k == "origin":
            domain_fields.extend(
                ["|", ("agency_id.name", "=", v), ("channel_type_id.name", "=", v)]
            )
    # TODO: text_dialog  (chatter)

    domain_fields.append(("reservation_ids", "!=", False))
    if search_exists:
        return expression.AND([domain_fields, (domains[0])])
    else:
        return domain_fields


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
    def search_folios_pwa(self, search, order=False, limit=False, offset=False, **post):

        rdo = self.env["pms.folio"].search(
            _get_search_domain(search, **post), order=order, limit=limit, offset=offset
        )
        return rdo
