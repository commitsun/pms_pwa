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


class FolioMessages(http.Controller):

    @http.route(
        "/reservation/<int:reservation_id>/messages",
        type="json",
        auth="public",
        csrf=False,
        website=True,
    )
    def reservation_messages(self, reservation_id=None, **kw):
        # defino message_folios
        message_folios = {}
        if reservation_id:
            reservation = (
                request.env["pms.reservation"]
                .sudo()
                .search([("id", "=", int(reservation_id))])
            )
            if reservation:
                folio = request.env["pms.folio"].browse(reservation.folio_id.id)
                # mail confirmación
                message_folios["allowed_confirmation_mail"] = any(res.state not in ["done", "cancel"] for res in folio.reservation_ids)
                # mail cancelación
                message_folios["allowed_cancellation_mail"] = all(res.state in ["cancel"] for res in folio.reservation_ids)
                # mail salida
                message_folios["allowed_departure_mail"] = all(res.state in ["done"] for res in folio.reservation_ids)
                message_folios['messages_list'] = self.parse_messages(folio.message_ids.message_format())

                # TODO: Add message_reservations and merge messages
                result = {
                    "result": True,
                    "message_folios": message_folios,
                    "default_email_to": folio.email or "",
                }
                _logger.info(message_folios)
                return result

            return json.dumps({"result": False, "message": _("Reservation not found")})

    def parse_messages(self, messages):
        messages_list = []
        for message in messages:
            message_dict = {}
            author_id = message.get("author_id")[0]
            message_body = self.parse_message_body(message)
            if message.get("message_type") == "email":
                subject = "Email enviado: " + message.get("subject")
            else:
                subject = message.get("subject")
            message_dict["message"] = message_body
            message_dict["subject"] = subject
            message_dict["date"] = message.get("date").strftime(
                "%d/%m/%y %H:%M:%S"
            )
            message_dict["author"] = message.get("email_from") if message.get("email_from") else message.get("author_id")[1]
            message_dict["avatar"] = author_id,
            message_dict["message_type"] = message.get("message_type")
            message_dict["model"] = message.get("model")
            message_dict["res_id"] = message.get("res_id")
            messages_list.append(message_dict)
        return messages_list

    def parse_message_body(self, message):
        message_body = ''
        if message.get("body"):
            message_body = message.get("body")
        elif message.get("tracking_value_ids"):
            for tracking_value in message.get("tracking_value_ids"):
                changed_field = str(tracking_value.get("changed_field")) or ""
                old_value = str(tracking_value.get("old_value")) or ""
                new_value = str(tracking_value.get("new_value")) or ""
                message_body += '<p>' + changed_field + ': ' + old_value + ' -> ' + new_value + '</p>'
        return message_body

    @http.route(
        "/reservation/<int:reservation_id>/template_mail",
        type="json",
        auth="public",
        csrf=False,
        website=True,
    )
    def reservation_mail(self, reservation_id=None, **kw):
        if reservation_id:
            reservation = (
                request.env["pms.reservation"]
                .sudo()
                .search([("id", "=", int(reservation_id))])
            )
            if reservation:
                folio = request.env["pms.folio"].browse(reservation.folio_id.id)
                mail_type = kw.get("mail_type")  # confirmation, modification, cancelation
                # partner_to = kw.get("partner_to")
                # if partner_to:
                #     email_to = partner_to.email
                # else:
                email_to = kw.get("email_to")
                email_values = {
                    "email_from": folio.pms_property_id.partner_id.email,
                    "email_to": email_to,
                    "auto_delete": False,
                }
                if mail_type == "confirmation":
                    template = folio.pms_property_id.property_confirmed_template
                    res_id = folio.id
                elif mail_type == "modification":
                    template = folio.pms_property_id.property_modified_template
                    res_id = folio.id
                if mail_type == "cancelation":
                    template = folio.pms_property_id.property_canceled_template
                    res_id = reservation.id
                template.send_mail(
                    res_id, force_send=True, email_values=email_values
                )
                reservation.to_send_mail = False
                return json.dumps({"result": True, "message": _("Correo Enviado")})
            return json.dumps({"result": False, "message": _("Reservation not found")})

    # @http.route(
    #     "/reservation/<int:reservation_id>/message_mail",
    #     type="json",
    #     auth="public",
    #     csrf=False,
    #     website=True,
    # )
    # def reservation_message(self, reservation_id=None, **kw):
    #     if reservation_id:
    #         reservation = (
    #             request.env["pms.reservation"]
    #             .sudo()
    #             .search([("id", "=", int(reservation_id))])
    #         )
    #         if reservation:
    #             folio = request.env["pms.folio"].browse(reservation.folio_id.id)
    #             partner_to = kw.get("partner_to")
    #             if partner_to:
    #                 email_to = partner_to.email
    #             else:
    #                 email_to = kw.get("email_to")
    #             email_values = {
    #                 "email_from": folio.pms_property_id.partner_id.email,
    #                 "email_to": email_to,
    #                 "subject": kw.get("subject"),
    #                 "body": kw.get("body"),
    #             }
    #             template.send_mail(
    #                 res_id, force_send=True, email_values=email_values
    #             )
    #             return json.dumps({"result": True})
    #         return json.dumps({"result": False, "message": _("Reservation not found")})

