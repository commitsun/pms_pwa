from odoo import api, fields, models
from odoo.osv import expression


def _get_search_domain(pms_property_id, search=False, **post):
    domains = []
    search_exists = False
    if search:
        search_exists = True
        for srch in search.split(" "):
            subdomains = [
                [("reservation_ids.name", "in", [srch])],
                [("reservation_ids.partner_id.phone", "ilike", srch)],
                [("reservation_ids.partner_id.mobile", "ilike", srch)],
                [("reservation_ids.partner_id.name", "ilike", srch)],
                [("reservation_ids.partner_id.vat", "ilike", srch)],
                [("reservation_ids.partner_id.email", "ilike", srch)],
            ]
            domains.append(expression.OR(subdomains))
    domain_fields = [("pms_property_id", "=", pms_property_id)]
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


class PmsFolio(models.Model):
    _inherit = "pms.folio"
    # REVIEW: location of this field [pms|pms_pwa]
    folio_total_adults = fields.Integer(
        string="Folio nº adults", compute="_compute_folio_adults"
    )
    checkin_folio = fields.Date(
        string="Check In Folio",
        compute="_compute_checkin_folio",
        store=True,
        help="Only set when all bookings on the folio have the same check-in date",
    )
    checkout_folio = fields.Date(
        string="Check Out Folio",
        help="Only set when all bookings on the folio have the same check-out date",
        compute="_compute_checkout_folio",
        store=True,
    )

    def _compute_folio_adults(self):
        for record in self:
            adults = 0
            for res in record.reservation_ids:
                adults += res.adults
            record.folio_total_adults = adults

    @api.depends("reservation_ids.checkin")
    def _compute_checkin_folio(self):
        for record in self:
            if (
                record.reservation_ids
                and len(set(record.reservation_ids.mapped("checkin"))) == 1
            ):
                record.checkin_folio = record.reservation_ids[0].checkin
            else:
                record.checkin_folio = False

    @api.depends("reservation_ids.checkout")
    def _compute_checkout_folio(self):
        for record in self:
            if (
                record.reservation_ids
                and len(set(record.reservation_ids.mapped("checkout"))) == 1
            ):
                record.checkout_folio = record.reservation_ids[0].checkout
            else:
                record.checkout_folio = False

    @api.model
    def search_count_folios_pwa(self, search, **post):
        pms_property_id = self.env.user.get_active_property_ids()[0]
        rdo = self.env["pms.folio"].search_count(
            _get_search_domain(pms_property_id, search, **post)
        )
        return rdo

    @api.model
    def search_folios_pwa(self, search, order=False, limit=False, offset=False, **post):
        pms_property_id = self.env.user.get_active_property_ids()[0]
        rdo = self.env["pms.folio"].search(
            _get_search_domain(pms_property_id, search, **post),
            order=order,
            limit=limit,
            offset=offset,
        )
        return rdo
