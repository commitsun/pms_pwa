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


class CashRegister(http.Controller):

    @http.route(
        "/cash_register/open-close",
        type="json",
        auth="public",
        csrf=False,
        website=True,
    )
    def cash_register__open_close(self, **kw):
        print("kw", kw)
        amount = round(float(kw["amount"]), 2)
        pms_property_id = request.env.user.pms_pwa_property_id.id
        journal_id = int(kw.get("payment_method"))
        journal = request.env["account.journal"].sudo().browse(journal_id)
        if kw["type"] == "open":
            statement = (
                request.env["account.bank.statement"]
                .sudo()
                .search(
                    [
                        ("journal_id", "=", journal.id),
                    ], limit=1,
                )
            )
            if statement.balance_end_real == amount or kw.get("force"):
                request.env["account.bank.statement"].sudo().create({
                    "name": datetime.date.today().strftime(
                        get_lang(request.env).date_format
                    ) + " (" + request.env.user.login + ")",
                    "date": datetime.date.today(),
                    "balance_start": amount,
                    "journal_id": journal.id,
                    "pms_property_id": pms_property_id,
                })
                return json.dumps(
                    {"result": True, "force": False, "message": _("Caja abierta correctamente!")}
                )
            else:
                dif = round(amount - statement.balance_end_real, 2)
                return json.dumps(
                    {"result": False, "force": True, "message": _("Existe una diferencia de " + str(dif) + " Euros entre el último cierre y el valor introducido, revisa la caja y si el valor introducido es correcto fuerza la apertura")}
                )
        elif kw["type"] == "close":
            statement = (
                request.env["account.bank.statement"]
                .sudo()
                .search(
                    [
                        ("journal_id", "=", journal.id),
                        ("state", "=", "open"),
                    ], limit=1,
                )
            )
            if statement.balance_end == amount:
                statement.sudo().balance_end_real = amount
                statement.sudo().button_post()
                return json.dumps(
                    {"result": True, "force": False, "message": _("Caja cerrarda correctamente!")}
                )
            elif kw.get("force"):
                # Not call to button post to avoid create profit/loss line (_check_balance_end_real_same_as_computed)
                if not statement.name:
                    statement.sudo()._set_next_sequence()
                statement.sudo().balance_end_real = amount
                statement.write({'state': 'posted'})
                lines_of_moves_to_post = statement.line_ids.filtered(lambda line: line.move_id.state != 'posted')
                if lines_of_moves_to_post:
                    lines_of_moves_to_post.move_id._post(soft=False)
                return json.dumps(
                    {"result": True, "force": False, "message": _("Caja cerrarda correctamente!")}
                )
            # TODO: Close with profit/loss lines?
            else:
                dif = round(amount - statement.balance_end, 2)
                return json.dumps(
                    {"result": False, "force": True, "message": _("Existe una diferencia de " + str(dif) + " Euros entre el importe calculado y el introducido, revisa la caja y los pagos registrados para localizar el error. Puedes forzar el cierre para revisarlo más adelante")}
                )
        # if kw.get("force"):
        #     return json.dumps(
        #         {"result": True, "force": False, "message": _("No existe ninguna sesión de caja abierta, la caja se abrirá automáticamente al registrar un pago o un cobro.")}
        #     )

    @http.route(
        ["/cash_register/add"],
        csrf=False,
        auth="user",
        website=True,
        type="json",
        methods=["GET", "POST"],
    )
    def cash_register_payment(self, **post):
        _logger.info("FUNCTION: cash_register_payment")
        _logger.info("USER: {}".format(request.env.user))
        _logger.info("PARAMS: {}".format(post))

        try:
            if "payment_method" not in post or "amount" not in post or "description" not in post:
                return json.dumps({"result": False, "message": "Los campos método de pago, cantidad y descripción son obligatorios"})
            journal_id = int(post.get("payment_method"))
            partner_id = False
            if post.get("partner_id") and post.get("partner_id") != "":
                partner_id = int(post.get("partner_id"))
            journal = request.env["account.journal"].sudo().browse(journal_id)
            description = post.get("description")
            if not description:
                return json.dumps({"result": False, "message": "La descripción es obligatoria"})
            pms_property_id = request.env.user.pms_pwa_property_id.id
            date = datetime.datetime.strptime(
                post.get("date", datetime.date.today()),
                get_lang(request.env).date_format,
            )
            amount = float(post.get("amount"))
            amount = amount if amount >= 0 else -amount
            # Supplier Payment
            if not post.get("target_payment_method"):
                if journal.type == "cash":
                    amount = float(post.get("amount"))
                    self._create_statement_line(pms_property_id, journal_id, date, -amount, description, partner_id)
                vals = {
                    "journal_id": journal.id,
                    "amount": amount,
                    "date": date,
                    "payment_type": "outbound",
                    "partner_type": "supplier",
                    "state": "draft",
                    "ref": description,
                    "partner_id": partner_id,
                }
                pay = request.env["account.payment"].sudo().create(vals)
                pay.sudo().action_post()
                mens = "Pago registrado correctamente"
            # Internal Transfer
            else:
                target_journal_id = int(post.get("target_payment_method"))
                target_journal = request.env["account.journal"].sudo().browse(target_journal_id)
                partner_id = target_journal.company_id.partner_id.id
                if journal.type == "cash":
                    statement1 = self._create_statement_line(pms_property_id, journal_id, date, -amount, description, partner_id)
                payment_vals = {
                    "journal_id": journal.id,
                    "amount": amount,
                    "date": date,
                    "payment_type": "outbound",
                    "state": "draft",
                    "ref": description,
                    "partner_id": partner_id,
                    "is_internal_transfer": True,
                    "partner_bank_id": target_journal.bank_account_id.id,
                }
                pay1 = request.env["account.payment"].sudo().create(payment_vals)
                pay1.sudo().action_post()
                if target_journal.type == "cash":
                    statement2 = self._create_statement_line(pms_property_id, target_journal_id, date, amount, description, partner_id)
                payment_vals = {
                    "journal_id": target_journal.id,
                    "amount": amount,
                    "date": date,
                    "payment_type": "inbound",
                    "state": "draft",
                    "ref": description,
                    "partner_id": partner_id,
                    "is_internal_transfer": True,
                }
                pay2 = request.env["account.payment"].sudo().create(payment_vals)
                pay2.action_post()
                mens = "Transferencia registrada correctamente"

            return json.dumps(
                {"result": True, "message": mens}
            )
        except Exception as e:
            return json.dumps({"result": False, "message": str(e)})

    def _create_statement_line(self, pms_property_id, journal_id, date, amount, description, partner_id):
        statement = (
            request.env["account.bank.statement"]
            .sudo()
            .search(
                [
                    ("journal_id", "=", journal_id),
                    ("pms_property_id", "=", pms_property_id),
                    ("state", "=", "open"),
                    ("date", "=", date),
                ]
            )
        )
        if not statement:
            # TODO: cash control option
            st_values = {
                "journal_id": journal_id,
                "user_id": request.env.user.id,
                "pms_property_id": pms_property_id,
                "name": datetime.date.today().strftime(get_lang(request.env).date_format),
            }
            ctx = dict(request.env.context, company_id=request.env.user.pms_pwa_property_id.company_id.id)
            statement = (
                request.env["account.bank.statement"]
                .with_context(ctx)
                .sudo()
                .create(st_values)
            )
        statement.sudo().write({
            "line_ids": [(0, 0, {
                "date": date,
                "amount": amount,
                "payment_ref": description,
                "statement_id": statement.id,
                "journal_id": statement.journal_id.id,
                "partner_id": partner_id,
            })],
        })

    @http.route(
        "/cash_register/edit",
        csrf=False,
        auth="user",
        website=True,
        type="json",
        methods=["POST"],
    )
    def cash_register_edit(self, **kw):
        print(kw)
        try:
            new_journal_id = int(kw.get("journal_id", False))
            new_journal = request.env["account.journal"].sudo().browse(new_journal_id)
            new_date = datetime.datetime.strptime(
                kw.get("date", datetime.date.today()),
                get_lang(request.env).date_format,
            )
            new_amount = round(float(kw.get("amount", False)), 2)
            payment_ref = kw.get("name", False)
            new_pay_type = "inbound" if new_amount > 0 else "outbound"
            old_payment = (
                request.env["account.payment"]
                .sudo()
                .browse(int(kw.get("id")))
            )
            # TODO: al eliminar y crear uno nuevo, no se actualiza el id. en el segundo cambio falla.
            # result False actualiza la página sin devolver ningun mensaje ¿?
            if not old_payment:
                return json.dumps(
                    {"result": False, "message": _("No se ha podido actualizar el pago, por favor, actualiza la página y vuelve a intentarlo.")}
                )
            old_journal = old_payment.journal_id
            old_pay_type = old_payment.payment_type
            old_date = old_payment.date
            old_amount = old_payment.amount
            old_ref = old_payment.ref

            is_internal_transfer = old_payment.is_internal_transfer
            if is_internal_transfer:
                return json.dumps(
                    {"result": False, "message": _("No se puede editar una transferencia interna. Ponte en contacto con un responsable de administración.")}
                )
            if (
                new_journal != old_journal
                or new_pay_type != old_pay_type
                or new_date != old_date
                or new_amount != old_amount
            ):
                if old_payment.reconciled_statement_ids and any(old_payment.reconciled_statement_ids.state == "posted"):
                    return json.dumps(
                        {"result": False, "message": _("El pago está registrado en un estracto ya conciliado, Para rectificarlo ponte en contacto con el responsable de administración.")}
                    )
                old_statement_line = False
                if old_journal.type == "cash":
                    old_statement_line = request.env["account.bank.statement.line"].sudo().search([
                        ("date", "=", old_date),
                        ("amount", "=", old_amount if old_pay_type == "inbound" else -old_amount),
                        ("payment_ref", "=", old_ref),
                        ("statement_id.journal_id", "=", old_journal.id),
                    ])
                    if not old_statement_line:
                        raise UserError(_("No se ha encontrado la línea de extracto para el pago. Ponte en contacto con el responsable de administración."))

                if new_journal.type == "cash" and new_journal != old_journal:
                    if old_date != datetime.date.today():
                        return json.dumps(
                            {"result": False, "message": _("No se puede modificar movimientos de efectivo en cajas ya conciliadas, Para rectificarlo ponte en contacto con el responsable de administración.")}
                        )
                    self._create_statement_line(request.env.user.pms_pwa_property_id.id, new_journal.id, new_date, new_amount, old_payment.ref, old_payment.partner_id.id)

                new_payment_vals = {
                    "journal_id": new_journal.id,
                    "amount": abs(new_amount),
                    "date": new_date,
                    "payment_type": old_payment.payment_type,
                    "partner_type": old_payment.partner_type,
                    "state": "draft",
                    "partner_id": old_payment.partner_id.id,
                    "folio_ids": [(6, 0, old_payment.folio_ids.ids)],
                    "ref": payment_ref,
                }
                pay = request.env["account.payment"].sudo().create(new_payment_vals)
                pay.sudo().action_post()

                old_payment.sudo().action_draft()
                old_payment.sudo().action_cancel()
                old_payment.sudo().unlink()
                if old_statement_line:
                    old_statement_line.sudo().unlink()

        except Exception as e:
            return json.dumps(
                {
                    "result": False,
                    "message": str(e),
                }
            )
        return json.dumps({"result": True, "message": _("Pago actualizado correctamente!")})
