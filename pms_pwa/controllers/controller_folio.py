# Part of Odoo. See LICENSE file for full copyright and licensing details.

# -*- coding: utf-8 -*-

import json
import logging
import pprint

from odoo import _, fields, http
from odoo.exceptions import MissingError
from odoo.http import request
from odoo.tools.misc import get_lang

from ..utils import pwa_utils

pp = pprint.PrettyPrinter(indent=4)

_logger = logging.getLogger(__name__)


class PmsFolio(http.Controller):
    @http.route(
        "/folio/<int:folio_id>/assign",
        type="json",
        auth="public",
        csrf=False,
        website=True,
    )
    def folio_assign(self, folio_id=None, **kw):
        if folio_id:
            folio = request.env["pms.folio"].sudo().search([("id", "=", int(folio_id))])
            try:
                for reservation in folio.reservation_ids.filtered(
                    lambda r: r.to_assign == False
                ):
                    reservation.action_assign()
            except Exception as e:
                return json.dumps({"result": False, "message": str(e)})
            return json.dumps(
                {"result": True, "message": _("Operation completed successfully.")}
            )
        return json.dumps({"result": False, "message": _("Reservation not found")})

    @http.route(
        "/folio/<int:folio_id>/cancel",
        type="json",
        auth="public",
        csrf=False,
        website=True,
    )
    def folio_cancel(self, folio_id=None, **kw):
        if folio_id:
            folio = request.env["pms.folio"].sudo().search([("id", "=", int(folio_id))])
            try:
                folio.action_cancel()
            except Exception as e:
                return json.dumps({"result": False, "message": str(e)})
            return json.dumps(
                {"result": True, "message": _("Operation completed successfully.")}
            )
        return json.dumps({"result": False, "message": _("Reservation not found")})

    @http.route(
        "/folio/<int:folio_id>/checkout",
        type="json",
        auth="public",
        csrf=False,
        website=True,
    )
    def folio_checkout(self, folio_id=None, **kw):
        if folio_id:
            folio = request.env["pms.folio"].sudo().search([("id", "=", int(folio_id))])

            try:
                folio.action_done()
            except Exception as e:
                return json.dumps({"result": False, "message": str(e)})
            return json.dumps(
                {"result": True, "message": _("Operation completed successfully.")}
            )
        return json.dumps({"result": False, "message": _("Reservation not found")})

    @http.route(
        "/reservation/<int:folio_id>/payment",
        type="json",
        auth="public",
        csrf=False,
        website=True,
    )
    def folio_payment(self, folio_id=None, **kw):
        if folio_id:
            folio = request.env["pms.folio"].sudo().search([("id", "=", int(folio_id))])
            if folio:
                payload = http.request.jsonrequest.get("params")
                payment_method = int(payload["payment_method"])
                payment_amount = float(payload["amount"])
                if "folio_id" in payload:
                    payment_partner_id = int(payload["partner_id"])
                else:
                    payment_partner_id = folio.partner_id.id
                try:
                    account_journals = folio.pms_property_id._get_payment_methods()
                    journal = account_journals.browse(payment_method)
                    partner = request.env["res.partner"].browse(int(payment_partner_id))
                    if folio.payment_state != "paid":
                        folio.folio_id.with_context(cash_register=True).do_payment(
                            journal,
                            journal.suspense_account_id,
                            request.env.user,
                            payment_amount,
                            folio,
                            partner=partner if partner else folio.partner_id,
                            date=fields.date.today(),
                        )
                    else:
                        return json.dumps(
                            {"result": False, "message": _("Reservation already paid.")}
                        )
                except Exception as e:
                    return json.dumps({"result": False, "message": str(e)})
                return json.dumps(
                    {"result": True, "message": _("Operation completed successfully.")}
                )
            return json.dumps({"result": False, "message": _("Reservation not found")})

    @http.route(
        "/ammenities",
        type="json",
        website=True,
        auth="public",
    )
    def list_available_ammenities(self):
        payload = http.request.jsonrequest.get("params")
        pms_property = request.env["pms.property"].browse(int(payload["pms_property"]))
        return pms_property.get_available_ammenities()
