import json
import logging
from odoo.tools.misc import get_lang
from odoo.exceptions import UserError

from odoo import http, _
import datetime
from odoo.http import request

from ..utils import pwa_utils
from odoo.tools import DEFAULT_SERVER_DATE_FORMAT


_logger = logging.getLogger(__name__)


class FolioInvoice(http.Controller):

    @http.route(
        "/reservation/<int:reservation_id>/invoice",
        type="json",
        auth="public",
        csrf=False,
        website=True,
    )
    def reservation_invoice(self, reservation_id=None, **kw):
        if reservation_id:
            reservation = (
                request.env["pms.reservation"]
                .sudo()
                .search([("id", "=", int(reservation_id))])
            )
            if reservation:

                folio = request.env["pms.folio"].browse(reservation.folio_id.id)
                submit = False
                invoice_ids = []
                new_invoice = {}
                
                payload = http.request.jsonrequest["params"]

                if "new_invoice" in payload:
                    new_invoice = payload["new_invoice"]
                if "invoice_ids" in payload:
                    invoice_ids = payload["invoice_ids"]
                if "submit" in payload:
                    submit = payload["submit"]
                
                wizard_invoice = {}
                wizard_invoice["reservation_id"] = reservation.id
                wizard_invoice["total_amount"] = folio.amount_total
                wizard_invoice["total_to_invoice"] = self._get_total_to_invoice(folio)
                wizard_invoice["invoice_ids"] = self._get_invoice_ids(folio, invoice_ids)
                wizard_invoice["new_invoice"] = self._prepare_new_invoice(folio, new_invoice)
                
                if submit:
                    try:
                        partner_invoice = self._get_partner(wizard_invoice["new_invoice"]["partner"])
                        if not partner_invoice._check_enought_invoice_data():
                            raise UserError(
                                _(
                                    "No se pudo crear la factura. Por favor, complete los datos del cliente."
                                )
                            )
                        lines_to_invoice = dict()
                        for line in wizard_invoice["new_invoice"]["lines"]:
                            lines_to_invoice[line["id"]] = line["qty_to_invoice"]
                        invoices = reservation.folio_id._create_invoices(
                            lines_to_invoice=lines_to_invoice,
                            partner_invoice_id=partner_invoice.id,
                            grouped=True,
                        )
                        # Overwrite description line invoice with vals
                        for line in wizard_invoice["new_invoice"]["lines"]:
                            inv_line = invoices.invoice_line_ids.filtered(
                                lambda x: x.folio_line_ids in line["id"]
                            )
                            if inv_line and inv_line.name != line["description"]:
                                inv_line.name = line["description"]

                        invoices.action_post()
                    except Exception as e:
                        return json.dumps({"result": False, "message": str(e)})
                    return json.dumps(
                        {
                            "result": True,
                            "message": _("Operation completed successfully."),
                            "wizard_invoice": wizard_invoice,
                        }
                    )
                return wizard_invoice
            return json.dumps({"result": False, "message": _("Reservation not found")})

    def _get_total_to_invoice(self, folio):
        total_to_invoice = 0
        for line in folio.sale_line_ids:
            if line.qty_to_invoice > 0:
                total_to_invoice += self._get_amount_line(line.id, line.qty_to_invoice)
        return total_to_invoice

    def _get_invoice_ids(self, folio, invoice_ids):
        invoice_ids = []
        for invoice in folio.move_ids:
            invoice_ids.append({
                "id": invoice.id,
                "name": invoice.name,
                "url": invoice.get_portal_url(),
                "state": invoice.state,
            })
        if len(invoice_ids) == 0:
            invoice_ids = False
        return invoice_ids

    def _prepare_new_invoice(self, folio, new_invoice):
        if folio.invoice_status != "to_invoice":
            return False
        # new_invoice["amount_to_invoice"] = 0
        if not new_invoice:
            new_invoice = {}
            new_invoice["amount_to_invoice"] = 0
            new_lines = []
            for sale_line in folio.sale_line_ids:
                if sale_line.qty_to_invoice > 0:
                    new_lines.append({
                        "id": sale_line.id,
                        "qty_to_invoice": sale_line.qty_to_invoice,
                        "max_qty": sale_line.qty_to_invoice,
                        "description": sale_line.name,
                        "amount": sale_line.price_total,
                        "included": True,
                    })
                # new_invoice["amount_to_invoice"] += line["amount"]
        else:
            new_invoice["amount_to_invoice"] = 0
            new_lines = []
            for line in new_invoice["lines"]:
                new_line = self._parse_line(line)
                new_lines.append(new_line)
                if new_line["qty_to_invoice"] > 0 and new_line["included"]:
                    new_invoice["amount_to_invoice"] += new_line["amount"]
        new_invoice["lines"] = new_lines
        new_invoice["partner"] = self._prepare_partner(new_invoice["partner"] if "partner" in new_invoice else False)
        return new_invoice

    def _get_amount_line(self, sale_line_id, qty_to_invoice):
        sale_line = request.env["folio.sale.line"].browse(sale_line_id)
        price = sale_line.price_unit * (1 - (sale_line.discount or 0.0) / 100.0)
        taxes = sale_line.tax_ids.compute_all(
            price,
            sale_line.folio_id.currency_id,
            qty_to_invoice,
            product=sale_line.product_id,
        )
        return taxes["total_included"]

    def _parse_line(self, line):
        return {
            "id": line["id"],
            "qty_to_invoice": line["qty_to_invoice"],
            "max_qty": line["max_qty"],
            "description": line["description"],
            "amount": self._get_amount_line(line["id"], line["qty_to_invoice"]),
            "included": line["included"],
        }

    def _prepare_partner(self, partner_vals):
        partner_name = partner_vat = partner_email = partner_mobile = \
            partner_invoice_street = partner_zip = partner_city = \
            partner_state_id = partner_country_id = False
        if partner_vals:
            if partner_vals.get("name"):
                partner_name = partner_vals["name"]
            if partner_vals.get("vat"):
                partner_vat = partner_vals["vat"]
            if partner_vals.get("email"):
                partner_email = partner_vals["email"]
            if partner_vals.get("mobile"):
                partner_mobile = partner_vals["mobile"]
            if partner_vals.get("invoice_street"):
                partner_invoice_street = partner_vals["invoice_street"]
            if partner_vals.get("invoice_zip"):
                partner_zip = partner_vals["invoice_zip"]
            if partner_vals.get("invoice_city"):
                partner_city = partner_vals["invoice_city"]
            if partner_vals.get("invoice_state_id"):
                partner_state_id = partner_vals["invoice_state_id"]
            if partner_vals.get("invoice_country_id"):
                partner_country_id = partner_vals["invoice_country_id"]

        partner = self._get_partner_invoice(partner_vals)
        if not partner_name:
            partner_name = partner.name if partner else False
        if not partner_vat:
            partner_vat = partner.vat if partner else False
        if not partner_email:
            partner_email = partner.email if partner else False
        if not partner_mobile:
            partner_mobile = partner.mobile if partner else False
        if not partner_invoice_street:
            partner_invoice_street = partner.street if partner else False
        if not partner_zip:
            zip_code = partner.zip if partner else False
            partner_zip = zip_code.name if zip_code else False
        else:
            zip_code = request.env["res.partner.zip"].search(
                [("name", "=", partner_zip)]
            )
        if not partner_city:
            partner_city = zip_code.city_id.name if zip_code else False
            if not partner_city and partner:
                partner_city = partner.city
        if not partner_state_id:
            if zip_code:
                partner_state_id = {
                    "id": zip_code.state_id.id,
                    "name": zip_code.state_id.name,
                }
            elif partner:
                partner_state_id = {
                    "id": partner.state_id.id,
                    "name": partner.state_id.name,
                }
            else:
                partner_state_id = False
            
        if not partner_country_id:
            if zip_code:
                partner_country_id = {
                    "id": zip_code.country_id.id,
                    "name": zip_code.country_id.name,
                }
            elif partner:
                partner_country_id = {
                    "id": partner.country_id.id,
                    "name": partner.country_id.name,
                }
            else:
                partner_country_id = False

        return {
            "name": partner_name,
            "vat": partner_vat,
            "email": partner_email,
            "mobile": partner_mobile,
            "invoice_street": partner_invoice_street,
            "invoice_zip": partner_zip,
            "invoice_city": partner_city,
            "invoice_state_id": partner_state_id,
            "invoice_country_id": partner_country_id,
        }

    def _get_partner_invoice(self, partner_vals):
        if partner_vals and partner_vals.get("id"):
            return request.env["res.partner"].browse(partner_vals.get("id"))
        if partner_vals and  partner_vals.get("vat"):
            return request.env["res.partner"].search([("vat", "=", partner_vals.get("vat"))])
        return False

    def _get_partner(self, partner_vals):
        partner = False
        if partner_vals.get("id"):
            return request.env["res.partner"].browse(partner_vals.get("id"))
