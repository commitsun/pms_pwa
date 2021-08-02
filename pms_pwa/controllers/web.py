# Part of Odoo. See LICENSE file for full copyright and licensing details.

# -*- coding: utf-8 -*-

import datetime
from inspect import isdatadescriptor
import json
import logging
import pprint
from calendar import monthrange
from datetime import timedelta

from odoo import _, fields, http, SUPERUSER_ID
from odoo.exceptions import MissingError
from odoo.http import request, Response, content_disposition
from odoo.tools.misc import format_date, formatLang, get_lang

from odoo.addons.web.controllers.main import Home
import re

from . import room_types, rooms

pp = pprint.PrettyPrinter(indent=4)

_logger = logging.getLogger(__name__)


class PWAHome(Home):
    @http.route()
    def index(self, *args, **kw):
        if request.session.uid and request.env["res.users"].sudo().browse(
            request.session.uid
        ).has_group("pms_pwa.group_pms_property_user"):
            return http.local_redirect(
                "/calendar", query=request.params, keep_hash=True
            )

        return http.redirect_with_hash("/web/login")
        # return super(PWAHome, self).index(*args, **kw)

    def _login_redirect(self, uid, redirect=None):
        if not redirect and request.env["res.users"].sudo().browse(uid).has_group(
            "pms_pwa.group_pms_property_user"
        ):
            return "/calendar"
        return super(PWAHome, self)._login_redirect(uid, redirect=redirect)


# Frontend controllers to test
class TestFrontEnd(http.Controller):
    def _get_reservation_types(self):
        return [
            {"id": "out", "name": "Out of service"},
            {"id": "normal", "name": "Normal"},
            {"id": "staff", "name": "Staff"},
        ]

    def _get_allowed_payments_journals(self):
        """
        @return: Return dict with journals
         [
          {"id": id, "name": name},
          {"id": id, "name": name},
          ...
          {"id": id, "name": name},
         ]
        """
        payment_methods = (
            request.env["account.journal"]
            .sudo()
            .search([("type", "in", ["bank", "cash"])])
        )
        allowed_journals = []
        for journal in payment_methods:
            allowed_journals.append({"id": journal.id, "name": journal.name})
        return allowed_journals

    def _get_allowed_channel_type_ids(self):
        domain = [("is_on_line", "=", False)]
        channel_types = request.env["pms.sale.channel"].search(domain)
        allowed_channel_types = []
        for channel in channel_types:
            allowed_channel_types.append({"id": channel.id, "name": channel.name})
        return allowed_channel_types

    def _get_allowed_agency_ids(self, channel_type_id=False):
        domain = [("is_on_line", "=", False)]
        if channel_type_id:
            domain.append(("id", "=", channel_type_id))
        channel_types_ids = (
            request.env["pms.sale.channel"].search(domain).ids
        )
        agencies = request.env["res.partner"].search(
            [
                ("is_agency", "=", True),
                ("sale_channel_id", "in", channel_types_ids),
            ]
        )
        allowed_agencies = [{"id": False, "name": ""}]
        for agency in agencies:
            allowed_agencies.append({"id": agency.id, "name": agency.name})
        return allowed_agencies

    @http.route(
        ["/reservation/list", "/reservation/list/page/<int:page>"],
        type="http",
        auth="user",
        methods=["GET", "POST"],
        website=True,
    )
    def reservation_list(self, page=0, search=False, sortby=None, **post):
        if post and "original_search" in post:
            if not search:
                search = post["original_search"]
            post.pop("original_search")

        # REVIEW: magic number
        paginate_by = 15

        # searchbar_sortings = {
        #     "priority":
        #         {
        #             "label": _("Priority"),
        #             "order": "max_reservation_priority"
        #         },
        #     }
        if not sortby:
            sortby = "max_reservation_priority"

        pager = request.website.pager(
            url="/reservation/list",
            total=request.env["pms.folio"].search_count_folios_pwa(search, **post),
            page=page,
            step=paginate_by,
            url_args=post,
        )
        today = datetime.datetime.today().strftime(get_lang(request.env).date_format)

        values = {
            "today": today,
            "folios": request.env["pms.folio"].search_folios_pwa(
                search=search,
                order=sortby,
                limit=paginate_by,
                offset=pager["offset"],
                **post
            ),
            "page_name": "Reservations",
            "pager": pager,
            "search": search if search else None,
            "default_url": "",
            "post": post if post else None,
            # "searchbar_sortings": searchbar_sortings, #TODO: REVIEW SORTING
            "sortby": sortby,
        }

        return http.request.render("pms_pwa.roomdoo_reservation_list", values)

    @http.route(
        "/reservation/<int:reservation_id>/assign",
        type="json",
        auth="public",
        csrf=False,
        website=True,
    )
    def reservation_assign(self, reservation_id=None, **kw):
        if reservation_id:
            reservation = (
                request.env["pms.reservation"]
                .sudo()
                .search([("id", "=", int(reservation_id))])
            )
            reservation.action_assign()
            return json.dumps(
                {"result": True, "message": _("Operation completed successfully.")}
            )
        return json.dumps({"result": False, "message": _("Reservation not found")})

    @http.route(
        "/reservation/<int:reservation_id>/cancel",
        type="json",
        auth="public",
        csrf=False,
        website=True,
    )
    def reservation_cancel(self, reservation_id=None, **kw):
        if reservation_id:
            reservation = (
                request.env["pms.reservation"]
                .sudo()
                .search([("id", "=", int(reservation_id))])
            )
            try:
                reservation.action_cancel()
            except Exception as e:
                return json.dumps({"result": False, "message": str(e)})
            return json.dumps(
                {"result": True, "message": _("Operation completed successfully.")}
            )
        return json.dumps({"result": False, "message": _("Reservation not found")})

    @http.route(
        "/reservation/<int:reservation_id>/checkout",
        type="json",
        auth="public",
        csrf=False,
        website=True,
    )
    def reservation_checkout(self, reservation_id=None, **kw):
        if reservation_id:
            reservation = (
                request.env["pms.reservation"]
                .sudo()
                .search([("id", "=", int(reservation_id))])
            )

            try:
                reservation.action_reservation_checkout()
            except Exception as e:
                return json.dumps({"result": False, "message": str(e)})
            return json.dumps(
                {"result": True, "message": _("Operation completed successfully.")}
            )
        return json.dumps({"result": False, "message": _("Reservation not found")})

    @http.route(
        "/reservation/<int:reservation_id>/checkin",
        type="json",
        auth="public",
        csrf=False,
        website=True,
    )
    def reservation_checkin(self, reservation_id=None, **kw):
        if reservation_id:
            reservation = (
                request.env["pms.reservation"]
                .sudo()
                .search([("id", "=", int(reservation_id))])
            )
            try:
                params = http.request.jsonrequest.get("params")
                _logger.info(params)
                res = reservation.pwa_action_checkin(
                    params["guests_list"], reservation_id, params.get("action_on_board")
                )
            except Exception as e:
                return json.dumps({"result": False, "message": str(e)})
            if res and params.get("action_on_board"):
                return json.dumps(
                    {
                        "result": True,
                        "message": _("Operation completed successfully."),
                        "reservation": self.parse_reservation(reservation),
                    }
                )
            else:
                return self.parse_reservation(reservation)

        return json.dumps({"result": False, "message": _("Reservation not found")})

    @http.route(
        "/reservation/<int:reservation_id>/payment",
        type="json",
        auth="public",
        csrf=False,
        website=True,
    )
    def reservation_payment(self, reservation_id=None, **kw):
        if reservation_id:
            reservation = (
                request.env["pms.reservation"]
                .sudo()
                .search([("id", "=", int(reservation_id))])
            )
            if reservation:
                payload = http.request.jsonrequest.get("params")
                payment_method = int(payload["payment_method"])
                payment_amount = float(payload["amount"])
                if "partner_id" in payload:
                    payment_partner_id = int(payload["partner_id"])
                else:
                    payment_partner_id = reservation.partner_id.id
                try:
                    account_journals = (
                        reservation.folio_id.pms_property_id._get_payment_methods()
                    )
                    journal = account_journals.browse(payment_method)
                    partner_id = request.env["res.partner"].browse(
                        int(payment_partner_id)
                    )
                    if reservation.folio_payment_state != "paid":
                        reservation.folio_id.do_payment(
                            journal,
                            journal.suspense_account_id,
                            request.env.user,
                            payment_amount,
                            reservation.folio_id,
                            partner=partner_id
                            if partner_id
                            else reservation.partner_id,
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
                payload = http.request.jsonrequest["params"]["data"]
                invoice_lines = payload[0]["lines_to_invoice"]
                partner_invoice_id = payload[0]["partner_to_invoice"]
                partner_invoice_values = payload[0]["partner_values"][0]
                try:
                    if partner_invoice_id:
                        partner_invoice_id = (
                            request.env["res.partner"]
                            .sudo()
                            .search([("id", "=", int(partner_invoice_id))])
                        )
                    else:
                        partner_invoice_id = request.env["res.partner"].create(
                            partner_invoice_values
                        )
                    lines_to_invoice = dict()
                    for value in invoice_lines:
                        lines_to_invoice[value[0]["id"]] = value[0]["qty"]
                    reservation.folio_id._create_invoices(
                        lines_to_invoice=lines_to_invoice,
                        partner_invoice_id=partner_invoice_id,
                    )
                except Exception as e:
                    return json.dumps({"result": False, "message": str(e)})
                return json.dumps(
                    {
                        "result": True,
                        "message": _("Operation completed successfully."),
                        "invoices": reservation.folio_id.move_ids.ids,
                    }
                )
            return json.dumps({"result": False, "message": _("Reservation not found")})

    @http.route(
        "/dashboard",
        type="http",
        auth="user",
        methods=["GET", "POST"],
        website=True,
    )
    def dashboard(self, **post):
        values = {}

        def _get_user_activities(uid=False):
            activities = []
            if uid:
                activities = [
                    activity
                    for activity in request.env["mail.activity"].search(
                        [("user_id", "in", [uid])]
                    )
                ]
            return activities

        values.update(
            {
                "tasks": _get_user_activities(
                    request.session.uid if request.session.uid else False
                ),
                "arrivals": {
                    "today": {
                        "date": "14/10/2020",
                        "to_arrive": 10,
                        "to_check_in": 2,
                    },
                    "tomorrow": {
                        "date": "15/10/2020",
                        "to_arrive": 8,
                    },
                },
                "departures": {
                    "today": {
                        "date": "14/10/2020",
                        "to_leave": 10,
                        "to_check_out": 2,
                    },
                    "tomorrow": {
                        "date": "15/10/2020",
                        "to_leave": 8,
                    },
                },
                "rooms": {
                    "date": "14/10/2020",
                    "available": 10,
                    "out_of_service": 2,
                    "taken": 8,
                    "ready": 1,
                    "dirty": 1,
                    "cleaning": 2,
                },
                "clocking_in": [
                    {"name": "Juan Manuel Díaz", "date": "15/10/2020 10:19:25"},
                    {"name": "Paula Sánchez", "date": "15/10/2020 10:54:25"},
                ],
                "deliveries": [
                    {"name": "Envío fichero a la policía", "date": "15/10/2020"},
                    {"name": "Envío facturas al gestor", "date": "15/10/2020"},
                ],
                "history": [
                    {
                        "date": "15/10/2020",
                        "hour": "10:14:58",
                        "name": "Nueva reserva",
                        "description": "Lorem ipsum dolor sit amet, consectetur"
                        " adipiscing elit. Nulla sit amet enim sit amet ex laoreet dictum.",
                    },
                    {
                        "date": "15/10/2020 10:54:25",
                        "hour": "10:14:58",
                        "name": "Nueva reserva",
                        "description": "Lorem ipsum dolor sit amet, consectetur"
                        " adipiscing elit. Nulla sit amet enim sit amet ex laoreet dictum.",
                    },
                ],
                "evolutions": [
                    {
                        "name": "Billing",
                        "selector": "billing",
                        "labels": "5 oct,6 oct,7 oct,8 oct,9 oct",
                        "label_1": "2019",
                        "data_1": "12,24,13,3,54",
                        "backgroundColor_1": "#E5F8FC",
                        "borderColor_1": "#00B5E2",
                        "label_2": "2020",
                        "data_2": "15,19,25,69,12",
                        "backgroundColor_2": "#CEF2E8",
                        "borderColor_2": "#00BA39",
                    },
                    {
                        "name": "Revenue",
                        "selector": "revenue",
                        "labels": "19 nov,20 nov,21 nov,22 nov,23 nov",
                        "label_1": "2019",
                        "data_1": "200,210,130,36,540",
                        "backgroundColor_1": "#E5F8FC",
                        "borderColor_1": "#00B5E2",
                        "label_2": "2020",
                        "data_2": "150,190,250,690,120",
                        "backgroundColor_2": "#CEF2E8",
                        "borderColor_2": "#00BA39",
                    },
                    {
                        "name": "Ocupation",
                        "selector": "ocupation",
                        "labels": "5 sept,6 sept,7 sept",
                        "label_1": "2019",
                        "data_1": "315,850,130",
                        "backgroundColor_1": "#E5F8FC",
                        "borderColor_1": "#00B5E2",
                        "label_2": "2020",
                        "data_2": "150,650,250",
                        "backgroundColor_2": "#CEF2E8",
                        "borderColor_2": "#00BA39",
                    },
                ],
                "kpis": [
                    {
                        "name": "Ocupation",
                        "labels": "Arrivals,Departures,No show",
                        "label": "",
                        "data": "12,24,18",
                        "backgroundColor": "#FF5733,#B5BFBD,#00B5E2",
                        "borderColor": "#FF5733,#B5BFBD,#00B5E2",
                        "ratio": 3.99,
                    },
                    {
                        "name": "Reservations by channel",
                        "labels": "Phone,Booking,Other",
                        "label": "",
                        "data": "14,7,5",
                        "backgroundColor": "#FF5733,#B5BFBD,#00B5E2",
                        "borderColor": "#FF5733,#B5BFBD,#00B5E2",
                        "ratio": 4.21,
                    },
                    {
                        "name": "Income by channel",
                        "labels": "Phone,Booking,Other",
                        "label": "",
                        "data": "1400,700,500",
                        "backgroundColor": "#FF5733,#B5BFBD,#00B5E2",
                        "borderColor": "#FF5733,#B5BFBD,#00B5E2",
                        "ratio": 4.66,
                    },
                    {
                        "name": "Cleaning score",
                        "labels": "Good,Acceptable,Bad",
                        "label": "",
                        "data": "54,24,14",
                        "backgroundColor": "#FF5733,#B5BFBD,#00B5E2",
                        "borderColor": "#FF5733,#B5BFBD,#00B5E2",
                        "ratio": 3.16,
                    },
                    {
                        "name": "Attention score",
                        "labels": "Good,Acceptable,Bad",
                        "label": "",
                        "data": "55,20,11",
                        "backgroundColor": "#FF5733,#B5BFBD,#00B5E2",
                        "borderColor": "#FF5733,#B5BFBD,#00B5E2",
                        "ratio": 4.05,
                    },
                    {
                        "name": "General score",
                        "labels": "Good,Acceptable,Bad",
                        "label": "",
                        "data": "64,34,4",
                        "backgroundColor": "#FF5733,#B5BFBD,#00B5E2",
                        "borderColor": "#FF5733,#B5BFBD,#00B5E2",
                        "ratio": 4.25,
                    },
                ],
                "compare_options": [
                    {
                        "id": 1,
                        "value": "Previous year",
                    },
                    {
                        "id": 2,
                        "value": "Two years ago",
                    },
                ],
            }
        )

        return http.request.render("pms_pwa.roomdoo_dashboard_page", values)

    @http.route(
        "/reservation/<int:reservation_id>",
        type="http",
        auth="user",
        methods=["GET", "POST"],
        website=True,
    )
    def reservation_detail(self, reservation_id, **post):
        reservation = request.env["pms.reservation"].browse([reservation_id])
        if not reservation:
            raise MissingError(_("This document does not exist."))
        values = {
            "page_name": "Reservation",
            "reservation": reservation,
            "readonly_fields": ["arrival_hour", "departure_hour"],
            "required_fields": [],
        }
        print(values)
        if post and "message" in post:
            try:
                reservation.message_post(
                    subject=_("PWA Message"),
                    body=post["message"],
                    message_type="comment",
                )
            except Exception as e:
                _logger.critical(e)
        return http.request.render("pms_pwa.roomdoo_reservation_detail", values)

    @http.route(
        "/reservation/reservation_lines",
        type="json",
        auth="public",
        csrf=False,
        methods=["POST"],
        website=True,
    )
    def reservation_lines_json(
        self, reservation_ids=False, invoice_lines=False, folio_id=False, **kw
    ):
        if folio_id and reservation_ids:
            folio = request.env["pms.folio"].sudo().search([("id", "=", int(folio_id))])
            if not folio:
                raise MissingError(_("This document does not exist."))
            if reservation_ids:
                # TODO resisar si se puede hacer de otra forma.
                reservation_lines = folio.sale_line_ids.filtered(
                    lambda x: x.reservation_id.id in reservation_ids
                    and x.display_type == False
                )
                reservation_show_lines = [
                    {
                        "id": x.id,
                        "name": x.product_id.name,
                        "qty_to_invoice": x.qty_to_invoice,
                        "qty_invoiced": x.qty_invoiced,
                        "price_total": x.price_total,
                        "price_subtotal": x.price_subtotal,
                        "product_uom_qty": x.product_uom_qty,
                    }
                    for x in reservation_lines
                ]
                if invoice_lines:
                    reservation_show_lines = [
                        x for x in reservation_show_lines if x["id"] in invoice_lines
                    ]
                total_amount = sum(
                    [float(x["price_total"]) for x in reservation_show_lines]
                )
                data = {
                    "reservation_lines": reservation_show_lines,
                    "total_amount": total_amount,
                }
                return data
        return json.dumps({"result": False, "message": _("Reservation not found")})

    @http.route(
        ["/reservation/json_data"],
        type="json",
        auth="public",
        methods=["POST"],
        website=True,
    )
    def reservation_detail_json(self, reservation_id=None, **kw):
        reservation = False
        if reservation_id:
            reservation = (
                request.env["pms.reservation"]
                .sudo()
                .search([("id", "=", int(reservation_id))])
            )
        if not reservation:
            raise MissingError(_("This document does not exist."))

        primary_button, secondary_buttons = self.generate_reservation_style_buttons(
            reservation
        )

        if reservation.partner_id:
            partner_vals = {
                "id": reservation.partner_id.id,
                "name": reservation.partner_id.name,
                "mobile": reservation.partner_id.mobile or reservation.partner_id.phone,
            }
        else:
            partner_vals = {
                "id": False,
                "name": reservation.partner_name,
                "mobile": reservation.mobile,
            }
        notifications = []
        if reservation.partner_internal_comment:
            notifications.append(
                {
                    "title": "Notas sobre Cliente",
                    "content": reservation.partner_internal_comment,
                }
            )
        if reservation.folio_internal_comment:
            notifications.append(
                {
                    "title": "Notas sobre Reserva",
                    "content": reservation.folio_internal_comment,
                }
            )

        if reservation.partner_requests:
            notifications.append(
                {
                    "title": "Peticiones de Cliente",
                    "content": reservation.partner_requests,
                }
            )

        reservation_values = {
            "id": reservation.id,
            "name": reservation.name,
            "splitted": reservation.splitted,
            "partner_id": partner_vals,
            "unread_msg": len(notifications),
            "messages": notifications,
            "room_type_id": {
                "id": reservation.room_type_id.id,
                "name": reservation.room_type_id.name,
                "default_code": reservation.room_type_id.default_code,
            },
            "preferred_room_id": {
                "id": reservation.preferred_room_id.id
                if reservation.preferred_room_id
                else False,
                "name": reservation.preferred_room_id.name
                if reservation.preferred_room_id
                else reservation.rooms,
            },
            "channel_type_id": {
                "id": reservation.channel_type_id.id
                if reservation.channel_type_id
                else False,
                "name": reservation.channel_type_id.name
                if reservation.channel_type_id
                else False,
            },
            "agency_id": {
                "id": reservation.agency_id.id if reservation.agency_id else False,
                "name": reservation.agency_id.name if reservation.agency_id else False,
                "url": request.website.image_url(reservation.agency_id, 'image_128') if reservation.agency_id else False,
            },
            "user_name": reservation.user_id.name if reservation.user_id else False,
            "nights": reservation.nights,
            "checkin": reservation.checkin.strftime(get_lang(request.env).date_format),
            "arrival_hour": reservation.arrival_hour,
            "checkout": reservation.checkout.strftime(
                get_lang(request.env).date_format
            ),
            "departure_hour": reservation.departure_hour,
            "folio_id": {
                "id": reservation.folio_id.id,
                "amount_total": reservation.folio_id.amount_total,
                "outstanding_vat": round(reservation.folio_pending_amount, 2),
            },
            "state": reservation.state,
            "credit_card_details": reservation.credit_card_details,
            "price_total": round(reservation.price_total, 2),
            "price_tax": reservation.price_tax,
            "folio_pending_amount": round(reservation.folio_pending_amount, 2),
            "folio_internal_comment": reservation.folio_internal_comment,
            "payment_methods": self._get_allowed_payments_journals(),
            "reservation_types": self._get_reservation_types(),
            "reservation_type": reservation.reservation_type,
            "checkins_ratio": reservation.checkins_ratio,
            "ratio_checkin_data": reservation.ratio_checkin_data,
            "adults": reservation.adults,
            "checkin_partner_ids": reservation._get_checkin_partner_ids(),
            "pms_property_id": reservation.pms_property_id.id,
            "service_ids": reservation._get_service_ids(),
            "reservation_line_ids": reservation._get_reservation_line_ids(),
            "allowed_board_service_room_ids": reservation._get_allowed_board_service_room_ids(),
            "board_service_room_id": reservation.board_service_room_id.id
            if reservation.board_service_room_id
            else False,
            "board_service_room_id_name": reservation.board_service_room_id.pms_board_service_id.name
            if reservation.board_service_room_id and reservation.board_service_room_id.pms_board_service_id
            else False,
            "allowed_service_ids": reservation._get_allowed_service_ids(),
            "primary_button": primary_button,
            "secondary_buttons": secondary_buttons,
            "pricelist_id": reservation.pricelist_id.id,
            "allowed_pricelists": reservation._get_allowed_pricelists(),
            "allowed_segmentations": reservation._get_allowed_segmentations(),
            "allowed_channel_type_ids": self._get_allowed_channel_type_ids(),
            "allowed_agency_ids": self._get_allowed_agency_ids(
                channel_type_id = reservation.channel_type_id.id if reservation.channel_type_id else False
            ),
            "readonly_fields": ["arrival_hour", "departure_hour"],
            "required_fields": [],
        }

        pp.pprint(reservation_values)
        return reservation_values

    @http.route(
        ["/reservation/<int:reservation_id>/onchange_data"],
        type="json",
        auth="public",
        methods=["POST"],
        website=True,
    )
    # flake8: noqa: C901
    def reservation_onchange_data(self, reservation_id=None, **kw):
        old_reservation_type = None
        reservation = False
        params = http.request.jsonrequest.get("params")
        _logger.info(params)
        # TEMP FIX
        ##############################################################################
        if (
            "checkin" in params
            and "checkout" in params
            and datetime.datetime.strptime(
                params["checkin"].strip(), get_lang(request.env).date_format
            )
            >= datetime.datetime.strptime(
                params["checkout"].strip(), get_lang(request.env).date_format
            )
        ):
            return
        ##############################################################################
        if reservation_id:
            reservation = (
                request.env["pms.reservation"]
                .sudo()
                .search([("id", "=", int(reservation_id))])
            )
        if not reservation:
            raise MissingError(_("This reservation does not exist."))
        if reservation:
            try:
                params = http.request.jsonrequest.get("params")
                reservation_line_cmds = []
                reservation_values = {}
                for param in params.keys():
                    # DEL SERVICE
                    if param == "del_service":
                        reservation_values["service_ids"] = [
                            (2, int(params["del_service"]))
                        ]

                    # ADD SERVICE
                    if param == "add_service":
                        reservation_values["service_ids"] = [
                            (0, 0, {"product_id": int(params["add_service"])})
                        ]
                    # ADULTS
                    if (
                        param == "adults"
                        and int(params["adults"]) != reservation.adults
                    ):
                        reservation_values["adults"] = int(params["adults"])

                    # ROOM TYPE
                    elif (
                        param == "room_type_id"
                        and int(params["room_type_id"]) != reservation.room_type_id
                    ):
                        reservation_values["room_type_id"] = request.env[
                            "pms.room.type"
                        ].browse(int(params["room_type_id"]))

                    # PREFERRED ROOM ID
                    elif (
                        param == "preferred_room_id"
                        and int(params["preferred_room_id"])
                        != reservation.preferred_room_id.id
                    ):
                        reservation_values["preferred_room_id"] = (
                            request.env["pms.room"]
                            .browse(int(params["preferred_room_id"]))
                            .id
                        )

                    # CHECKIN & CHECKOUT TODO process both as an unit
                    elif (
                        param == "checkin"
                        and datetime.datetime.strptime(
                            params["checkin"].strip(), get_lang(request.env).date_format
                        ).date()
                        != reservation.checkin
                    ):
                        # TODO:  Delete Strip
                        reservation_values["checkin"] = datetime.datetime.strptime(
                            params["checkin"].strip(), get_lang(request.env).date_format
                        )
                    elif (
                        param == "checkout"
                        and datetime.datetime.strptime(
                            params["checkout"].strip(),
                            get_lang(request.env).date_format,
                        ).date()
                        != reservation.checkout
                    ):
                        reservation_values["checkout"] = datetime.datetime.strptime(
                            params["checkout"], get_lang(request.env).date_format
                        )

                    # BOARD_SERVICE
                    elif (
                        param == "board_service_room_id"
                        and int(params["board_service_room_id"])
                        != reservation.board_service_room_id.id
                    ):
                        reservation_values["board_service_room_id"] = (
                            request.env["pms.board.service.room.type"]
                            .browse(int(params["board_service_room_id"]))
                            .id
                        )

                    # SEGMENTATION
                    # TODO

                    # RESERVATION_LINE
                    elif param == "reservation_line_ids":
                        reservation_values.update(
                            self.parse_params_record(
                                origin_values={
                                    "reservation_line_ids": params[
                                        "reservation_line_ids"
                                    ]
                                },
                                model=request.env["pms.reservation"],
                            )
                        )

                    # ELIF CHANGE SERVICES LINES
                    elif param == "service_ids":
                        reservation_values.update(
                            self.parse_params_record(
                                origin_values={"service_ids": params["service_ids"]},
                                model=request.env["pms.reservation"],
                            ),
                        )
                    elif (
                        param == "reservation_type"
                        and params["reservation_type"] != reservation.reservation_type
                    ):
                        reservation_values.reservation_type = params[param]

                if "add_service" in params:
                    del params["add_service"]
                if "del_service" in params:
                    del params["del_service"]
                if "reservation_type" in params:
                    del params["reservation_type"]
                if "board_service" in params:
                    del params["board_service"]
                if "price_total" in params:
                    del params["price_total"]
                # del params["reservation_id"]
                pp.pprint(reservation_values)
                reservation.write(reservation_values)
            except Exception as e:
                return json.dumps(
                    {
                        "result": False,
                        "message": str(e),
                        "reservation": self.parse_reservation(reservation),
                    }
                )
            # print(parse_reservation(reservation))
            return json.dumps(
                {
                    "result": True,
                    "message": _("Operation completed successfully."),
                    "reservation": self.parse_reservation(reservation),
                }
            )
        else:
            return json.dumps({"result": False, "message": _("Reservation not found")})

    @http.route(
        "/calendar",
        type="http",
        auth="user",
        methods=["GET", "POST"],
        website=True,
    )
    def calendar(self, **post):
        date = datetime.date.today()
        date_start = date + timedelta(days=-1)
        if post.get("selected_date"):
            date = datetime.datetime.strptime(
                post.get("selected_date"), get_lang(request.env).date_format
            ).date()
            date_start = date

        if post.get("next_day"):
            date = datetime.datetime.strptime(
                post.get("next_day"), get_lang(request.env).date_format
            ).date()
            date_start = date + timedelta(days=+1)
        if post.get("previous_day"):
            date = datetime.datetime.strptime(
                post.get("previous_day"), get_lang(request.env).date_format
            ).date()
            date_start = date + timedelta(days=-1)
        if post.get("next_month"):
            date = datetime.datetime.strptime(
                post.get("next_month"), get_lang(request.env).date_format
            ).date()
            date_start = date + timedelta(days=30)
        if post.get("previous_month"):
            date = datetime.datetime.strptime(
                post.get("previous_month"), get_lang(request.env).date_format
            ).date()
            date_start = date + timedelta(days=-30)

        pms_property_id = request.env.user.get_active_property_ids()[0]
        Room = request.env["pms.room"]
        rooms = Room.search([("pms_property_id", "=", pms_property_id)])
        room_types = request.env["pms.room.type"].browse(
            rooms.mapped("room_type_id.id")
        )
        ubications = request.env["pms.ubication"].browse(
            rooms.mapped("ubication_id.id")
        )
        # Add default dpr and dpr_select_values

        dpr = 15
        if post.get("dpr"):
            dpr = int(post.get("dpr"))
        date_list = [date_start + timedelta(days=x) for x in range(dpr)]
        # get the days of the month
        month_days = monthrange(date.year, date.month)[1]
        dpr_select_values = {7, 15, month_days}
        Pricelist = request.env["product.pricelist"]
        pricelists = Pricelist.search(
            [
                "|",
                ("pms_property_ids", "=", False),
                ("pms_property_ids", "in", pms_property_id),
            ]
        )
        pricelist = (
            request.env["pms.property"].browse(pms_property_id).default_pricelist_id.id
        )
        display_select_options = [
            {"name": "Room type", "value": "room_type"},
            {"name": "Ubications", "value": "ubication"},
        ]
        obj_list = room_types
        selected_display = "room_type"
        if post and "display_option" in post:
            if post["display_option"] == "room_type":
                obj_list = room_types
                selected_display = "room_type"
            elif post["display_option"] == "ubication":
                obj_list = ubications
                selected_display = "ubication"

        if post and "pricelist" in post:
            pricelist = int(post["pricelist"])

        pms_property = request.env["pms.property"].browse(pms_property_id)
        values = {
            "today": datetime.datetime.now(),
            "date_start": date_start,
            "page_name": "Calendar",
            "pricelist": pricelists,
            "pms_property": pms_property,
            "default_pricelist": pricelist,
            "obj_list": obj_list,
            "date_list": date_list,
            "dpr": dpr,
            "display_select_options": display_select_options,
            "selected_display": selected_display,
            "dpr_select_values": dpr_select_values,
            "selected_date": date_start,
        }
        return http.request.render(
            "pms_pwa.roomdoo_calendar_page",
            values,
        )

    @http.route(
        "/calendar/line",
        type="json",
        auth="public",
        csrf=False,
        methods=["POST"],
        website=True,
    )
    def calendar_list(self, date=False, search="", **post):
        # TODO: Evitar el uso de eval
        dates = [item for item in eval(post.get("range_date"))]
        from_date = min(dates)
        to_date = max(dates)
        pms_property_id = request.env.user.get_active_property_ids()[0]
        Reservation = request.env["pms.reservation"]
        ReservationLine = request.env["pms.reservation.line"]

        domain = [
            ("date", ">=", from_date),
            ("date", "<=", to_date),
            ("state", "!=", "cancel"),
        ]
        reservation_lines = ReservationLine.search(domain)
        reservations = Reservation.browse(reservation_lines.mapped("reservation_id.id"))
        values = {}
        # REVIEW: revisar estructura
        values["reservations"] = []
        room_ids = []
        if post.get("selected_display") == "room_type":
            room_ids = (
                request.env["pms.room"]
                .search(
                    [
                        ("pms_property_id", "=", pms_property_id),
                        ("room_type_id", "=", int(post.get("data_id"))),
                    ]
                )
                .ids
            )
        elif post.get("selected_display") == "ubication":
            room_ids = (
                request.env["pms.room"]
                .search(
                    [
                        ("pms_property_id", "=", pms_property_id),
                        ("ubication_id", "=", int(post.get("data_id"))),
                    ]
                )
                .ids
            )
        for room_id in room_ids:
            free_dates = dates.copy()
            room = request.env["pms.room"].browse(room_id)
            rooms_reservation_values = []
            for reservation in reservations.filtered(
                lambda r: r.preferred_room_id.id == room_id
                and r.pms_property_id.id == pms_property_id
            ):
                min_reservation_date = min(
                    reservation.reservation_line_ids.filtered(
                        lambda d: d.date in dates
                    ).mapped("date")
                )
                max_reservation_date = max(
                    reservation.reservation_line_ids.filtered(
                        lambda d: d.date in dates
                    ).mapped("date")
                )
                for d in reservation.reservation_line_ids.mapped("date"):
                    if d in free_dates:
                        free_dates.remove(d)
                rooms_reservation_values.append(
                    {
                        "date": min_reservation_date,
                        "reservation_info": {
                            "id": reservation.id,
                            "partner_name": reservation.partner_name,
                            "img": "/web/image/pms.reservation/"
                            + str(reservation.id)
                            + "/partner_image_128",
                            "price": round(reservation.folio_pending_amount, 2),
                            "status": reservation.color_state,
                            "icon_payment": reservation.icon_payment,
                            "nigths": (
                                max_reservation_date
                                + timedelta(days=1)
                                - min_reservation_date
                            ).days,
                            "days": (
                                max_reservation_date
                                + timedelta(days=1)
                                - min_reservation_date
                            ).days
                            + 1,
                            "checkin_in_range": False
                            if min_reservation_date == reservation.checkin
                            else True,
                            "checkout_in_range": False
                            if max_reservation_date + timedelta(days=1)
                            != reservation.checkout
                            else True,
                        },
                    }
                )
            splitted_reservations_lines = reservations.filtered(
                lambda r: r.splitted
            ).reservation_line_ids.filtered(lambda l: l.room_id.id == room_id)
            for split in splitted_reservations_lines.sorted("date"):
                rooms_reservation_values.append(
                    {
                        "date": day,
                        "reservation_info": False,
                    }
                )
                continue
                main_split = False
                reservation = split.reservation_id
                nights = 0
                if split.date == reservation.checkin:
                    main_split = True
                for date_iterator in [
                    split.date + timedelta(days=x)
                    for x in range(0, (reservation.checkout - split.date).days)
                ]:
                    line = reservation.reservation_line_ids(
                        lambda l: l.date == date_iterator
                    )
                    if line and line.room_id == split.room_id:
                        nights += 1
                        free_dates.remove(line.date)
                        splitted_reservations_lines.remove(line)
                rooms_reservation_values.append(
                    {
                        "splitted": True,
                        "main_split": main_split,
                        "date": reservation.checkin,
                        "reservation_info": {
                            "id": reservation.id,
                            "partner_name": reservation.partner_name
                            if main_split
                            else False,
                            "img": "/web/image/pms.reservation/"
                            + str(reservation.id)
                            + "/partner_image_128"
                            if main_split
                            else False,
                            "price": round(reservation.folio_pending_amount, 2)
                            if main_split
                            else False,
                            "status": color_state,
                            "icon_payment": reservation.icon_payment,
                            "nigths": nights,
                        },
                    }
                )
            for day in free_dates:
                rooms_reservation_values.append(
                    {
                        "date": day,
                        "reservation_info": False,
                    }
                )
            rooms_reservation_values = sorted(
                rooms_reservation_values, key=lambda item: item["date"]
            )
            for item in rooms_reservation_values:
                item["date"] = item["date"].strftime(get_lang(request.env).date_format)
            values["reservations"].append(
                {
                    "room": {
                        "id": room.id,
                        "room_type_id": room.room_type_id.id,
                        "name": room.name,
                        "status": "Limpia",  # TODO
                    },
                    "ocupation": rooms_reservation_values,
                }
            )
        pp.pprint(values)
        return values

    @http.route(
        ["/reservation/single_reservation_new"],
        type="json",
        auth="public",
        methods=["POST"],
        website=True,
    )
    def single_reservation_new(self, **kw):
        reservation_values = http.request.jsonrequest.get("params")
        vals = {}
        print("reservation_values: {}".format(reservation_values))
        if reservation_values["checkin"]:
            checkin = (
                datetime.datetime.strptime(
                    reservation_values["checkin"], get_lang(request.env).date_format
                ).date()
                if "checkin" in reservation_values
                else datetime.datetime.today()
            )
        else:
            checkin = datetime.datetime.today()
        if reservation_values["checkout"]:
            checkout = (
                datetime.datetime.strptime(
                    reservation_values["checkout"].strip(),
                    get_lang(request.env).date_format,
                ).date()
                if "checkout" in reservation_values
                else checkin + timedelta(days=1)
            )
        else:
            checkout = checkin + timedelta(days=1)

        pms_property_id = False
        pms_property = False
        if request.env.user.get_active_property_ids():
            pms_property_id = request.env.user.get_active_property_ids()[0]
            pms_property = request.env["pms.property"].browse(pms_property_id)

        pricelist = False
        if reservation_values.get("pricelist_id"):
            pricelist = request.env["product.pricelist"].search(
                [("id", "=", int(reservation_values.get("pricelist_id")))]
            )
        if not pricelist and pms_property:
            pricelist = pms_property.default_pricelist_id

        vals = {
            "checkin": checkin,
            "checkout": checkout,
            "pricelist_id": pricelist.id,
            "pms_property_id": pms_property.id if pms_property else False,
        }
        print(vals)
        if reservation_values.get("preferred_room_id") and reservation_values.get("preferred_room_id") != '':
            vals["preferred_room_id"] = (
                request.env["pms.room"]
                .search([("id", "=", int(reservation_values.get("preferred_room_id")))])
                .id
            )

        if reservation_values.get("room_type_id") and reservation_values.get("room_type_id") != '':
            vals["room_type_id"] = (
                request.env["pms.room.type"]
                .search([("id", "=", int(reservation_values.get("room_type_id")))])
                .id
            )

        if reservation_values.get("partner_name") and reservation_values.get("partner_name") != '':
            vals["partner_name"] = reservation_values.get("partner_name")


        if reservation_values.get("reservation_type"):
            vals["reservation_type"] = reservation_values.get("reservation_type")
        else:
            vals["reservation_type"] = 'normal'

        # REVIEW: Avoid send 'false' to controller
        if (
            reservation_values.get("board_service_room_id")
            and reservation_values.get("board_service_room_id") != "false"
        ):
            vals["board_service_room_id"] = (
                request.env["pms.board.service.room.type"]
                .search(
                    [("id", "=", int(reservation_values.get("board_service_room_id")))]
                )
                .id
            )

        if reservation_values.get("adults") and reservation_values.get("adults") != '0':
            vals["adults"] = int(reservation_values.get("adults"))

        if reservation_values.get("channel_type_id") and reservation_values.get("channel_type_id") != '':
            vals["channel_type_id"] = int(reservation_values.get("channel_type_id"))

        if reservation_values.get("segmentation_id"):
            vals["segmentation_id"] = int(reservation_values.get("segmentation_id"))

        # REVIEW: Avoid send 'false' to controller
        if reservation_values.get("agency_id") and reservation_values.get("agency_id") != "false":
            vals["agency_id"] = int(reservation_values.get("agency_id"))
            vals["channel_type_id"] = request.env["res.partner"].browse(vals["agency_id"]).sale_channel_id.id

        if reservation_values.get("submit"):
            reservation = request.env["pms.reservation"].create(vals)
            return self.parse_reservation(reservation)
        else:
            reservation = request.env["pms.reservation"].new(vals)
            reservation.flush()
            return self.parse_reservation(reservation)

    @http.route(
        ["/reservation/multiple_reservation_onchange"],
        type="json",
        auth="public",
        methods=["POST"],
        website=True,
    )
    def multiple_reservation_onchange(self, **kw):
        params = http.request.jsonrequest.get("params")
        booking_engine = False
        print("params: {}".format(params))
        vals = {}

        if params.get("id"):
            booking_engine = request.env["pms.booking.engine"].browse(
                int(params.get("id"))
            )
        if booking_engine:
            start_date = booking_engine.start_date

        if not booking_engine or params.get("checkin"):
            vals["start_date"] = (
                datetime.datetime.strptime(
                    params["checkin"], get_lang(request.env).date_format
                ).date()
                if "checkin" in params
                else datetime.datetime.today().date()
            )
            start_date = vals["start_date"]
        if not booking_engine or params.get("checkout"):
            vals["end_date"] = (
                datetime.datetime.strptime(
                    params["checkout"].strip(),
                    get_lang(request.env).date_format,
                ).date()
                if "checkout" in params
                else start_date + timedelta(days=1).date()
            )

        pms_property = False

        if request.env.user.get_active_property_ids():
            vals["pms_property_id"] = request.env.user.get_active_property_ids()[0]
            pms_property = request.env["pms.property"].browse(vals["pms_property_id"])


        partner_name = booking_engine.partner_name if booking_engine else ""
        if params.get("partner_name") and params.get("partner_name") != partner_name:
            vals["partner_name"] = params.get("partner_name")

        channel_type_id = booking_engine.channel_type_id.id if booking_engine else False
        if params.get("channel_type_id") and params.get("channel_type_id") != channel_type_id:
            vals["channel_type_id"]  = int(params.get("channel_type_id") if params.get("channel_type_id") else False)

        internal_comment = booking_engine.internal_comment if booking_engine else ""
        if params.get("internal_comment") and params.get("internal_comment") != internal_comment:
            vals["internal_comment"] = params.get("internal_comment")

        agency_id = booking_engine.agency_id.id if booking_engine else False
        if params.get("agency_id") and params.get("agency_id") != agency_id and params.get("agency_id") != "false":
            # REVIEW: why send 'false' to controller
            vals["agency_id"]  = int(params.get("agency_id"))
            vals["channel_type_id"] = request.env["res.partner"].browse(vals["agency_id"]).sale_channel_id.id

        pricelist = booking_engine.pricelist_id if booking_engine else False
        if params.get("pricelist_id") and params.get("pricelist_id") != pricelist.id:
            vals["pricelist_id"] = request.env["product.pricelist"].search(
                [("id", "=", int(params.get("pricelist_id")))]
            ).id
        if not pricelist and pms_property:
            vals["pricelist_id"] = pms_property.default_pricelist_id.id

        if params.get("reservation_type") and params.get("reservation_type") != booking_engine.reservation_type:
            vals["reservation_type"] = params.get("reservation_type")
        elif not booking_engine or not booking_engine.reservation_type:
            vals["reservation_type"] = 'normal'

        if not booking_engine:
            booking_engine = request.env["pms.booking.engine"].create(vals)
            booking_engine.flush()
        else:
            old_num_selected = {}
            old_board_service = {}
            for room_line in booking_engine.availability_results:
                if room_line.value_num_rooms_selected > 0:
                    old_num_selected[room_line.room_type_id] = room_line.value_num_rooms_selected
                if room_line.board_service_room_id:
                    old_board_service[room_line.room_type_id] = room_line.board_service_room_id
            if len(vals) > 0:
                booking_engine.write(vals)
                for k, v in old_num_selected.items():
                    room_line = booking_engine.availability_results.filtered(lambda a: a.room_type_id == k)
                    room_line.value_num_rooms_selected = v if room_line.num_rooms_available >= v else room_line.num_rooms_available
                for k, v in old_board_service.items():
                    room_line = booking_engine.availability_results.filtered(lambda a: a.room_type_id == k)
                    room_line.board_service_room_id = v
                booking_engine.flush()
        board_service_room_id = booking_engine.availability_results.board_service_room_id.pms_board_service_id.ids if booking_engine and booking_engine.availability_results.board_service_room_id.pms_board_service_id else False
        if params.get("board_service_room_id") and params.get("board_service_room_id") != 'false':
                board_service_room_id = int(params.get("board_service_room_id"))
                for room_line in booking_engine.availability_results:
                    if (
                    board_service_room_id in room_line.room_type_id.board_service_room_type_ids.mapped("pms_board_service_id.id")
                    ):
                        room_line.board_service_room_id = board_service_room_id
        elif board_service_room_id:
            board_service_room_id = board_service_room_id[0]

        if params.get("lines"):
            for line_id, values in params.get("lines").items():
                room_line = booking_engine.availability_results.filtered(
                    lambda r: r.id == int(line_id)
                )
                room_line.value_num_rooms_selected = int(values["value_num_rooms_selected"])

                booking_engine.flush()



        return self.parse_booking_engine(booking_engine, board_service_room_id)

    @http.route(
        ["/reservation/multiple_reservation_new"],
        type="json",
        auth="public",
        methods=["POST"],
        website=True,
    )
    def multiple_reservation_new(self, **kw):
        params = http.request.jsonrequest.get("params")
        print("params: {}".format(params))
        try:
            if params.get("id"):
                booking_engine = request.env["pms.booking.engine"].browse(
                    int(params.get("id"))
                )
            folio_action = booking_engine.create_folio()
            id_reservation = (
                request.env["pms.folio"]
                .browse(folio_action["res_id"])
                .reservation_ids[0]
                .id
            )
            return json.dumps(
                {
                    "result": True,
                    "message": _("Operation completed successfully."),
                    "id": id_reservation,
                }
            )
        except Exception as e:
            _logger.critical(e)
            # return json.dumps({"result": False, "message": str(e)})

    @http.route(
        "/calendar/config",
        type="http",
        auth="user",
        methods=["GET", "POST"],
        website=True,
    )
    def calendar_config(self, date=False, **post):
        date = datetime.date.today()
        date_start = date + timedelta(days=-1)
        if post.get("selected_date"):
            date = datetime.datetime.strptime(
                post.get("selected_date"), get_lang(request.env).date_format
            ).date()
            date_start = date
        if post.get("next_day"):
            date = datetime.datetime.strptime(
                post.get("next_day"), get_lang(request.env).date_format
            ).date()
            date_start = date + timedelta(days=+1)
        if post.get("previous_day"):
            date = datetime.datetime.strptime(
                post.get("previous_day"), get_lang(request.env).date_format
            ).date()
            date_start = date + timedelta(days=-1)
        if post.get("next_month"):
            date = datetime.datetime.strptime(
                post.get("next_month"), get_lang(request.env).date_format
            ).date()
            date_start = date + timedelta(days=30)
        if post.get("previous_month"):
            date = datetime.datetime.strptime(
                post.get("previous_month"), get_lang(request.env).date_format
            ).date()
            date_start = date + timedelta(days=-30)

        # Add default dpr and dpr_select_values
        dpr = 7
        if post.get("dpr"):
            dpr = int(post.get("dpr"))
        date_list = [date_start + timedelta(days=x) for x in range(dpr)]
        # get the days of the month
        month_days = monthrange(date.year, date.month)[1]
        dpr_select_values = {7, 15, month_days}

        Room = request.env["pms.room.type"]
        rooms = Room.search([])

        pms_property_id = request.env.user.get_active_property_ids()[0]
        Pricelist = request.env["product.pricelist"]

        pricelist = Pricelist.search(
            [
                "|",
                ("pms_property_ids", "=", False),
                ("pms_property_ids", "in", pms_property_id),
            ]
        )
        # TODO: Add pricelist not daily in readonly mode (only price)

        select_pricelist = 0
        default_pricelist = pricelist[0].id
        if post and post.get("pricelist"):
            default_pricelist = int(post["pricelist"])
            # pricelist = (
            #     request.env["pms.property"].browse(pms_property_id).default_pricelist_id.id
            # )
            select_pricelist = int(post["pricelist"])

        values = {
            "today": datetime.datetime.now(),
            "date_start": date_start,
            "page_name": "Calendar config",
            "pricelist": pricelist,
            "default_pricelist": default_pricelist,
            "select_pricelist": select_pricelist,
            "rooms_list": rooms,
            "date_list": date_list,
            "dpr": dpr,
            "dpr_select_values": dpr_select_values,
            "selected_date": date_start,
        }
        return http.request.render(
            "pms_pwa.roomdoo_calendar_config_page",
            values,
        )

    @http.route(
        "/calendar/config/save",
        type="json",
        auth="public",
        csrf=False,
        methods=["POST"],
        website=True,
    )
    def calendar_config_list(self, search="", **post):
        params = http.request.jsonrequest.get("params")
        try:
            pms_property_id = request.env.user.get_active_property_ids()[0]
            _logger.info(params)
            for room_type_id, pricelists in params["room_type"].items():
                room_type = request.env["pms.room.type"].browse(int(room_type_id))
                for pricelist_id, dates in pricelists["pricelist_id"].items():
                    pricelist = request.env["product.pricelist"].browse(
                        int(pricelist_id)
                    )
                    for date_str, items in dates["date"].items():
                        item_date = datetime.datetime.strptime(
                            date_str, get_lang(request.env).date_format
                        ).date()
                        availability_plan = pricelist.availability_plan_id
                        # price
                        if "price" in items[0]:
                            # REVIEW: Necesary date (sale) start/end = False???
                            price_item = request.env["product.pricelist.item"].search(
                                [
                                    ("product_id", "=", room_type.product_id.id),
                                    ("date_start_consumption", "=", item_date),
                                    ("date_end_consumption", "=", item_date),
                                    ("pricelist_id", "=", pricelist.id),
                                    ("pms_property_ids", "in", pms_property_id),
                                ]
                            )
                            if price_item:
                                price_item.write(
                                    {"fixed_price": float(items[0]["price"])}
                                )
                            else:
                                price_item.create(
                                    {
                                        "applied_on": "0_product_variant",
                                        "product_id": room_type.product_id.id,
                                        "date_start_consumption": item_date,
                                        "date_end_consumption": item_date,
                                        "pricelist_id": pricelist.id,
                                        "pms_property_ids": [pms_property_id],
                                        "fixed_price": float(items[0]["price"]),
                                    }
                                )
                        if availability_plan:
                            avail_vals = {}
                            if "quota" in items[0]:
                                avail_vals["quota"] = int(items[0]["quota"])
                            if "min_stay" in items[0]:
                                avail_vals["min_stay"] = int(items[0]["min_stay"])
                            if "max_stay" in items[0]:
                                avail_vals["max_stay"] = int(items[0]["max_stay"])
                            if "closed" in items[0]:
                                avail_vals["closed"] = bool(items[0]["closed"])
                            if "min_stay_arrival" in items[0]:
                                avail_vals["min_stay_arrival"] = int(
                                    items[0]["min_stay_arrival"]
                                )
                            if "max_stay_arrival" in items[0]:
                                avail_vals["max_stay_arrival"] = int(
                                    items[0]["max_stay_arrival"]
                                )
                            if any(avail_vals):
                                avail_rule_item = request.env[
                                    "pms.availability.plan.rule"
                                ].search(
                                    [
                                        ("room_type_id", "=", room_type.id),
                                        ("date", "=", item_date),
                                        (
                                            "availability_plan_id",
                                            "=",
                                            availability_plan.id,
                                        ),
                                        ("pms_property_id", "=", pms_property_id),
                                    ]
                                )
                                if avail_rule_item:
                                    avail_rule_item.write(avail_vals)
                                else:
                                    avail_vals.update(
                                        {
                                            "room_type_id": room_type.id,
                                            "date": item_date,
                                            "availability_plan_id": availability_plan.id,
                                            "pms_property_id": pms_property_id,
                                        }
                                    )
                                    avail_rule_item.create(avail_vals)
            return json.dumps(
                {
                    "result": True,
                    "message": _("Operation completed successfully."),
                }
            )
        except Exception as e:
            return json.dumps({"result": False, "message": str(e)})

    def parse_reservation(self, reservation):
        primary_button, secondary_buttons = self.generate_reservation_style_buttons(
            reservation
        )

        if reservation.partner_id:
            partner_vals = {
                "id": reservation.partner_id.id,
                "name": reservation.partner_id.name if reservation.partner_name else "",
                "mobile": reservation.partner_id.mobile or reservation.partner_id.phone,
            }
        else:
            partner_vals = {
                "id": False,
                "name": reservation.partner_name if reservation.partner_name else "",
                "mobile": reservation.mobile,
            }
        notifications = []
        if reservation.partner_internal_comment:
            notifications.append(
                {
                    "title": "Notas sobre Cliente",
                    "content": reservation.partner_internal_comment,
                }
            )
        if reservation.folio_internal_comment:
            notifications.append(
                {
                    "title": "Notas sobre Reserva",
                    "content": reservation.folio_internal_comment,
                }
            )
        if reservation.partner_requests:
            notifications.append(
                {
                    "title": "Peticiones de Cliente",
                    "content": reservation.partner_requests,
                }
            )
        reservation_values = dict()

        reservation_values = {
            "id": reservation.id,
            "name": reservation.name if reservation.name else "",
            "splitted": reservation.splitted,
            "partner_id": partner_vals,
            "unread_msg": len(notifications),
            "messages": notifications,
            "room_type_id": reservation.room_type_id.id,
            "preferred_room_id": reservation.preferred_room_id.id,
            "channel_type_id": reservation.channel_type_id.id
            if reservation.channel_type_id
            else False,
            "agency_id": reservation.agency_id.id if reservation.agency_id else False,
            "nights": reservation.nights,
            "checkin": reservation.checkin.strftime(get_lang(request.env).date_format),
            "arrival_hour": reservation.arrival_hour,
            "checkout": reservation.checkout.strftime(
                get_lang(request.env).date_format
            ),
            "departure_hour": reservation.departure_hour,
            "folio_id": {
                "id": reservation.folio_id.id,
                "amount_total": round(reservation.folio_id.amount_total, 2),
                "outstanding_vat": round(reservation.folio_pending_amount, 2),
            },
            "state": reservation.state,
            "credit_card_details": reservation.credit_card_details,
            "price_total": round(reservation.price_room_services_set, 2),
            "price_tax": round(reservation.price_tax, 2),
            "folio_pending_amount": round(reservation.folio_pending_amount, 2),
            "folio_internal_comment": reservation.folio_internal_comment,
            "reservation_type": reservation.reservation_type,
            "payment_methods": self._get_allowed_payments_journals(),
            "reservation_types": self._get_reservation_types(),
            "checkins_ratio": reservation.checkins_ratio,
            "ratio_checkin_data": reservation.ratio_checkin_data,
            "adults": reservation.adults,
            "pms_property_id": reservation.pms_property_id.id,
            "allowed_board_service_room_ids": reservation._get_allowed_board_service_room_ids(),
            "board_service_room_id": reservation.board_service_room_id.id
            if reservation.board_service_room_id
            else False,
            "allowed_service_ids": reservation._get_allowed_service_ids(),
            # TODO: Review error buttons view
            # "primary_button": primary_button,
            # "secondary_buttons": secondary_buttons,
            "pricelist_id": reservation.pricelist_id.id,
            "allowed_pricelists": reservation._get_allowed_pricelists(),
            "allowed_segmentations": reservation._get_allowed_segmentations(),
            "allowed_channel_type_ids": self._get_allowed_channel_type_ids(),
            "allowed_agency_ids": self._get_allowed_agency_ids(
                channel_type_id=reservation.channel_type_id.id if reservation.channel_type_id else False
            ),
            "segmentation_ids": reservation.segmentation_ids.ids,
            "room_numbers": rooms.Rooms._get_available_rooms(
                self=self,
                payload={
                    "pms_property_id": reservation.pms_property_id.id,
                    "pricelist_id": reservation.pricelist_id.id,
                    "checkin": reservation.checkin,
                    "checkout": reservation.checkout,
                    "reservation_id": reservation.id,
                },
            ),
            "room_types": room_types.RoomTypes._get_available_room_types(
                self=self,
                payload={
                    "pms_property_id": reservation.pms_property_id.id,
                    "pricelist_id": reservation.pricelist_id.id,
                    "checkin": reservation.checkin,
                    "checkout": reservation.checkout,
                    "reservation_id": reservation.id,
                },
            ),
            "readonly_fields": ["arrival_hour", "departure_hour"],
            "required_fields": [],
        }

        # avoid send reservation_line_ids on new single reservation modal
        if isinstance(reservation.id, int):
            reservation_values[
                "reservation_line_ids"
            ] = reservation._get_reservation_line_ids()

        # avoid send reservation_line_ids on new single reservation modal
        if isinstance(reservation.id, int):
            reservation_values["service_ids"] = reservation._get_service_ids()

        if isinstance(reservation.id, int):
            reservation_values["checkin_partner_ids"] = reservation._get_checkin_partner_ids(),

        _logger.info("Values from controller to Frontend (reservation onchange):")
        pp.pprint(reservation_values)
        return reservation_values

    def parse_params_record(self, origin_values, model):
        new_values = {}
        for k, v in origin_values.items():
            field = model._fields[k]
            if field.type in ("float", "monetary"):
                new_values[k] = float(v)
            if field.type in ("integer", "many2one"):
                new_values[k] = int(v)
            if field.type == "date":
                new_values[k] = datetime.datetime.strptime(
                    v, get_lang(request.env).date_format
                ).date()
            if field.type in ("one2many", "many2many"):
                relational_model = request.env[field.comodel_name]
                cmds = []
                for record_id, value in v.items():
                    cmds.append(
                        (
                            1,
                            int(record_id),
                            self.parse_params_record(
                                origin_values=value, model=relational_model
                            ),
                        )
                    )
                new_values[k] = cmds
        return new_values

    def parse_booking_engine(self, wizard, board_service_room_id=False):
        wizard_values = dict()
        wizard_values["id"] = wizard.id
        wizard_values["partner_name"] = wizard.partner_name if wizard.partner_name else ""
        wizard_values["reservation_type"] = wizard.reservation_type
        wizard_values["reservation_types"] = self._get_reservation_types()
        wizard_values["checkin"] = wizard.start_date.strftime(
            get_lang(request.env).date_format
        )
        wizard_values["checkout"] = wizard.end_date.strftime(
            get_lang(request.env).date_format
        )
        wizard_values["total_price_folio"] = wizard.total_price_folio
        wizard_values["discount"] = wizard.discount
        wizard_values["pricelist_id"] = wizard.pricelist_id.id
        wizard_values["allowed_pricelists"] = request.env[
            "pms.reservation"
        ]._get_allowed_pricelists()
        wizard_values["allowed_segmentations"] = request.env[
            "pms.reservation"
        ]._get_allowed_segmentations()
        wizard_values["channel_type_id"] = wizard.channel_type_id.id
        wizard_values["agency_id"] = wizard.agency_id.id
        wizard_values["allowed_channel_type_ids"] = self._get_allowed_channel_type_ids()
        wizard_values["allowed_agency_ids"] = self._get_allowed_agency_ids(
            channel_type_id=wizard.channel_type_id.id if wizard.channel_type_id else False
        )
        wizard_values["segmentation_ids"] = wizard.segmentation_ids.ids
        wizard_values["board_service_room_id"] = board_service_room_id
        wizard_values["internal_comment"] = wizard.internal_comment if wizard.internal_comment else ""

        # Compute allowed board service room ids
        room_types = wizard.availability_results.mapped("room_type_id")
        allowed_board_services = []
        for room_type in room_types:
            board_rooms = room_type._get_allowed_board_service_room_ids(
                room_type_id=room_type.id,
                pms_property_id=wizard.pms_property_id.id,
            )
            if not board_rooms:
                board_rooms = []
            boards = request.env["pms.board.service.room.type"].search([
                ("id", "in", [board["id"] for board in board_rooms])
            ]).mapped("pms_board_service_id")
            for board in boards:
                if all([board["id"] != allowed_board["id"] for allowed_board in allowed_board_services]):
                    allowed_board_services.append({"id": board["id"], "name": board["name"]})
        wizard_values["allowed_board_service_room_ids"] = allowed_board_services

        lines = {}
        for line in wizard.availability_results:
            lines[line.id] = {
                "room_type_id": line.room_type_id.display_name,
                "num_rooms_available": line.num_rooms_available,
                "value_num_rooms_selected": line.value_num_rooms_selected,
                "price_per_room": line.price_per_room,
                "price_total": line.price_total,
                "board_service_room_id": line.board_service_room_id.id,
                "board_service_room_name": line.board_service_room_id.pms_board_service_id.name if line.board_service_room_id else "No",
            }
        wizard_values["lines"] = lines
        _logger.info("Values from controller to Frontend (multi reservation creation):")
        pp.pprint(wizard_values)

        return wizard_values

    @http.route(
        "/partner/search",
        csrf=False,
        auth="public",
        website=True,
        type="http",
        methods=["GET"],
    )
    def suggest_search(self, keywords, **params):
        if not keywords:
            return json.dumps([])

        Partner = request.env["res.partner"].with_context(bin_size=True)

        domain = []
        domain += [("name", "ilike", keywords)]

        partners = Partner.search(domain, limit=10)
        partners = [dict(id=p.id, name=p.name, type="p") for p in partners]

        return json.dumps(partners)

    @http.route(
        ['/checkins/pdf/<int:reservation_id>'],
        csrf=False,
        auth="user",
        website=True,
        type="http",
        methods=["GET", "POST"],
    )
    def print_checkin(self, reservation_id=None, **kw):
        reservations = False
        report_type = "html"
        download = False
        if reservation_id:
            reservations = (
                request.env["pms.reservation"]
                .sudo()
                .search([("id", "=", int(reservation_id))])
            )
        checkins = reservations.checkin_partner_ids
        pdf = request.env.ref("pms.action_traveller_report").sudo()._render_qweb_pdf(checkins.ids)[0]
        pdfhttpheaders = [
            ('Content-Type', 'application/pdf'),
            ('Content-Length', len(pdf)),
            # ('Content-Disposition', content_disposition('checkins.pdf')),
        ]
        return request.make_response(pdf, headers=pdfhttpheaders)

    def generate_reservation_style_buttons(self, reservation):
        buttons = json.loads(reservation.pwa_action_buttons)
        keys = buttons.keys()
        keysList = [key for key in keys]

        primary_button = ""
        secondary_buttons = ""

        counter = 0
        primary = 0
        for _key in keysList:
            if (primary == 0 and buttons[keysList[counter]]) or keysList[
                counter
            ] == "Ver Detalle":
                if buttons[keysList[counter]]:
                    primary_button = (
                        "<button url='"
                        + buttons[keysList[counter]]
                        + "' data-id='"
                        + str(reservation.id)
                        + "' class='btn o_pms_pwa_default_button_name"
                        + " o_pms_pwa_abutton o_pms_pwa_button_"
                        + str(keysList[counter].lower())
                        + "' type='button'>"
                        + keysList[counter]
                        + "</button>"
                    )
                    primary = 1
                else:
                    primary_button = (
                        "<button"
                        + " class='disabled btn o_pms_pwa_default_button_name"
                        + " o_pms_pwa_abutton o_pms_pwa_button_"
                        + str(keysList[counter].lower())
                        + "' data-id='"
                        + str(reservation.id)
                        + "' type='button'>"
                        + keysList[counter]
                        + "</button>"
                    )
            else:
                if buttons[keysList[counter]]:
                    secondary_buttons += (
                        "<button url='"
                        + buttons[keysList[counter]]
                        + "' class='dropdown-item  o_pms_pwa_abutton o_pms_pwa_button_"
                        + str(keysList[counter].lower())
                        + "' data-id='"
                        + str(reservation.id)
                        + "' type='button'>"
                        + keysList[counter]
                        + "</button>"
                    )
                else:
                    secondary_buttons += (
                        "<button class='disabled dropdown-item"
                        + " o_pms_pwa_abutton o_pms_pwa_button_"

                        + str(keysList[counter].lower())
                        + "' data-id='"
                        + str(reservation.id)
                        + "' type='button'>"
                        + keysList[counter]
                        + "</button>"
                    )
            counter += 1
        return (primary_button, secondary_buttons)
