# Part of Odoo. See LICENSE file for full copyright and licensing details.

# -*- coding: utf-8 -*-

import datetime
from inspect import isdatadescriptor
import json
import logging
import pprint
from calendar import monthrange
from datetime import timedelta
from ..utils import pwa_utils
from odoo import _, fields, http
from odoo.exceptions import MissingError
from odoo.http import request
from odoo.tools.misc import get_lang

pp = pprint.PrettyPrinter(indent=4)

_logger = logging.getLogger(__name__)

class PmsReservation(http.Controller):

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
                        "reservation": reservation.parse_reservation(),
                    }
                )
            else:
                return reservation.parse_reservation()

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

        return reservation.parse_reservation()

    @http.route(
        ["/reservation/<int:reservation_id>/onchange_data"],
        type="json",
        auth="public",
        methods=["POST"],
        website=True,
    )
    # flake8: noqa: C901
    def reservation_onchange_data(self, reservation_id=None, **kw):
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
                            pwa_utils.parse_params_record(
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
                            pwa_utils.parse_params_record(
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
                        "reservation": reservation.parse_reservation(),
                    }
                )
            return json.dumps(
                {
                    "result": True,
                    "message": _("Operation completed successfully."),
                    "reservation": reservation.parse_reservation(),
                }
            )
        else:
            return json.dumps({"result": False, "message": _("Reservation not found")})

    @http.route(
        "/print-checkins",
        csrf=False,
        auth="public",
        website=True,
        type="json",
        methods=["POST"],
    )
    def print_checkin(self, reservation_id=None, **kw):
        reservations = False
        if reservation_id:
            reservations = (
                request.env["pms.reservation"]
                .sudo()
                .search([("id", "=", int(reservation_id))])
            )
        return reservations.print_all_checkins()
