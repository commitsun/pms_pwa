import json
import logging

from odoo import http, _
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
        return json.dumps(
            {"result": True, "message": _("Operation completed successfully.")}
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
            return json.dumps(
                {"result": True, "message": _("Operation completed successfully.")}
            )
        except Exception as e:
            return json.dumps({"result": False, "message": str(e)})
