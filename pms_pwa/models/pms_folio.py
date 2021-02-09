from odoo import fields, models


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
