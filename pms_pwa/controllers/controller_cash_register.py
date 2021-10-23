import json
import logging
from odoo.tools.misc import get_lang

from odoo import http, _
import datetime
from odoo.http import request

from ..utils import pwa_utils

_logger = logging.getLogger(__name__)


class CashRegister(http.Controller):

    @http.route(
        "/cash_register/close",
        type="json",
        auth="public",
        csrf=False,
        website=True,
    )
    def cash_register_close(self, **kw):
        _logger.info("FUNCTION: cash_register_close")
        _logger.info("USER: {}".format(request.env.user))
        _logger.info("PARAMS: {}".format(kw))
        pms_property_id = request.env.user.pms_pwa_property_id.id
        statement = (
            request.env["account.bank.statement"]
            .sudo()
            .search(
                [
                    ("journal_id.type", "=", "cash"),
                    ("pms_property_id", "=", pms_property_id),
                    ("state", "=", "open"),
                ]
            )
        )
        if not statement:
            return json.dumps(
                {"result": False, "message": _("No existe ninguna sesión de caja abierta, la caja se abrirá automáticamente al registrar un pago o un cobro.")}
            )
        if statement.create_uid != request.env.user:
            return json.dumps(
                {"result": False, "message": _("La caja debe ser cerrada por " + statement.create_uid.name + ", ponte en contacto con un responsable")}
            )
        statement.balance_end_real = statement.balance_end
        statement.button_post()
        return json.dumps(
            {"result": True, "message": _("Sesión de caja cerrada correctamente!.")}
        )

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
            journal = request.env["account.journal"].browse(journal_id)
            description = post.get("description")
            pms_property_id = request.env.user.pms_pwa_property_id.id
            date = datetime.datetime.today()
            if journal.type == "cash":
                amount = -float(post.get("amount"))
                statement = (
                    request.env["account.bank.statement"]
                    .sudo()
                    .search(
                        [
                            ("journal_id", "=", journal_id),
                            ("pms_property_id", "=", pms_property_id),
                            ("state", "=", "open"),
                        ]
                    )
                )
                if not statement:
                    # TODO: cash control option
                    st_values = {
                        "journal_id": journal_id,
                        "user_id": request.env.user.id,
                        "pms_property_id": pms_property_id,
                        "name": datetime.datetime.now().strftime(get_lang(request.env).date_format),
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
                    })],
                })
            else:
                amount = float(post.get("amount"))
                vals = {
                    "journal_id": journal.id,
                    "amount": amount,
                    "date": date,
                    "payment_type": "outbound",
                    "partner_type": "supplier",
                    "state": "draft",
                }
                pay = request.env["account.payment"].create(vals)
                pay.action_post()

            return json.dumps(
                {"result": True, "message": _("Pago registrado!")}
            )
        except Exception as e:
            return json.dumps({"result": False, "message": str(e)})
