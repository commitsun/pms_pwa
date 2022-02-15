import json
import logging
from odoo.tools.misc import get_lang

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
        amount = float(kw["amount"])
        pms_property_id = request.env.user.pms_pwa_property_id.id
        journal_id = int(kw.get("payment_method"))
        journal = request.env["account.journal"].browse(journal_id)
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
                request.env["account.bank.statement"].create({
                    "name": datetime.datetime.today().strftime(
                        get_lang(request.env).date_format
                    ) + " (" + request.env.user.login + ")",
                    "date": datetime.datetime.today(),
                    "balance_start": amount,
                    "journal_id": journal.id,
                    "pms_property_id": pms_property_id,
                })
                return json.dumps(
                    {"result": True, "force": False, "message": _("Caja abierta correctamente!")}
                )
            else:
                dif = amount - statement.balance_end_real
                return json.dumps(
                    {"result": False, "force": True, "message": _("Existe una diferencia de " + str(dif) + " entre el último cierre y el valor introducido, revisa la caja y si el valor introducido es correcto fuerza la apertura")}
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
                statement.balance_end_real = amount
                statement.button_post()
                return json.dumps(
                    {"result": True, "force": False, "message": _("Caja cerrarda correctamente!")}
                )
            elif kw.get("force"):
                # Not call to button post to avoid create profit/loss line (_check_balance_end_real_same_as_computed)
                if not statement.name:
                    statement._set_next_sequence()

                statement.write({'state': 'posted'})
                lines_of_moves_to_post = statement.line_ids.filtered(lambda line: line.move_id.state != 'posted')
                if lines_of_moves_to_post:
                    lines_of_moves_to_post.move_id._post(soft=False)
                return json.dumps(
                    {"result": True, "force": False, "message": _("Caja cerrarda correctamente!")}
                )
            # TODO: Close with profit/loss lines?
            else:
                dif = amount - statement.balance_end
                return json.dumps(
                    {"result": False, "force": True, "message": _("Existe una diferencia de " + str(dif) + " entre el importe calculado y el introducido, revisa la caja y los pagos registrados para lo localizar el error. Puedes forzar el cierre para revisarlo más adelante")}
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
            partner_id = post.get("partner_id") and int(post.get("partner_id"))
            journal = request.env["account.journal"].browse(journal_id)
            description = post.get("description")
            pms_property_id = request.env.user.pms_pwa_property_id.id
            date = datetime.datetime.today()
            if journal.type == "cash":
                amount = float(post.get("amount"))
                amount = -amount if amount > 0 else amount
                self._create_statement_line(pms_property_id, journal_id, date, amount, description, partner_id)
            amount = float(post.get("amount"))
            if not post.get("target_payment_method"):
                vals = {
                    "journal_id": journal.id,
                    "amount": -amount if amount < 0 else amount,
                    "date": date,
                    "payment_type": "outbound",
                    "partner_type": "supplier",
                    "state": "draft",
                    "ref": description,
                    "partner_id": partner_id,
                }
                pay = request.env["account.payment"].create(vals)
                pay.action_post()
                mens = "Pago registrado correctamente"
            else:
                target_journal_id = int(post.get("target_payment_method"))
                target_journal = request.env["account.journal"].browse(target_journal_id)
                partner_id = target_journal.company_id.id
                if target_journal.type == "cash":
                    amount = float(post.get("amount"))
                    amount = amount if amount > 0 else -amount
                    self._create_statement_line(pms_property_id, target_journal_id, date, amount, description, partner_id)
                    payment_vals = {
                        "journal_id": target_journal.id,
                        "amount": -amount if amount < 0 else amount,
                        "date": date,
                        "payment_type": "inbound",
                        "state": "draft",
                        "ref": description,
                        "partner_id": partner_id,
                        "is_internal_transfer": True,
                        "destination_account_id": journal.payment_debit_account_id.id,
                        "partner_bank_id": journal.bank_account_id.id,
                    }
                else:
                    payment_vals = {
                        "journal_id": journal.id,
                        "amount": -amount if amount < 0 else amount,
                        "date": date,
                        "payment_type": "outbound",
                        "state": "draft",
                        "ref": description,
                        "partner_id": partner_id,
                        "is_internal_transfer": True,
                        "destination_account_id": target_journal.payment_debit_account_id.id,
                        "partner_bank_id": target_journal.bank_account_id.id,
                    }
                pay = request.env["account.payment"].create(payment_vals)
                pay.action_post()
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
                "name": datetime.datetime.today().strftime(get_lang(request.env).date_format),
            }
            ctx = dict(request.env.context, company_id=request.env.user.pms_pwa_property_id.company_id.id)
            statement = (
                request.env["account.bank.statement"]
                .with_context(ctx)
                .sudo()
                .create(st_values)
            )
        statement.write({
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
            new_journal = request.env["account.journal"].browse(new_journal_id)
            # new_date = datetime.datetime.strptime(
            #     kw.get("date", False),
            #     DEFAULT_SERVER_DATE_FORMAT,
            # )
            new_amount = float(kw.get("amount", False))
            new_pay_type = "inbound" if new_amount > 0 else "outbound"
            payment = (
                request.env["account.payment"]
                .sudo()
                .browse(int(kw.get("id")))
            )
            # TODO: al eliminar y crear uno nuevo, no se actualiza el id. en el segundo cambio falla.
            # result False actualiza la página sin devolver ningun mensaje ¿?
            if not payment:
                return json.dumps(
                    {"result": True, "message": _("No se ha podido actualizar el pago, por favor, actualiza la página y vuelve a intentarlo.")}
                )
            old_journal = payment.journal_id
            old_pay_type = payment.payment_type
            old_date = payment.date
            old_amount = payment.amount if payment.payment_type == "inbound" else -payment.amount

            if (
                new_journal != old_journal
                or new_pay_type != old_pay_type
                # or new_date != old_date
                or new_amount != old_amount
            ):
                if payment.reconciled_statement_ids and any(payment.reconciled_statement_ids.state == "posted"):
                    return json.dumps(
                        {"result": True, "message": _("El pago está registrado en un estracto ya conciliado, Para rectificarlo ponte en contacto con el responsable de administración.")}
                    )
                payment.action_draft()
                payment.action_cancel()
                payment.unlink()
                if new_pay_type == "inbound":
                    folio.do_payment(
                        new_journal,
                        new_journal.suspense_account_id,
                        request.env.user,
                        abs(new_amount),
                        folio,
                        partner=folio.partner_id,
                        date=new_date,
                    )
                else:
                    folio.do_refund(
                        new_journal,
                        new_journal.suspense_account_id,
                        request.env.user,
                        abs(new_amount),
                        folio,
                        partner=folio.partner_id,
                        date=new_date,
                    )
        except Exception as e:
            return json.dumps(
                {
                    "result": False,
                    "message": str(e),
                }
            )
        return json.dumps({"result": True, "message": _("Pago actualizado correctamente!")})
