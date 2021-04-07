# Part of Odoo. See LICENSE file for full copyright and licensing details.

# -*- coding: utf-8 -*-

import json
import logging
from datetime import datetime, timedelta

from odoo import _, fields, http
from odoo.exceptions import MissingError
from odoo.http import request

from odoo.addons.web.controllers.main import Home

_logger = logging.getLogger(__name__)


class PWAHome(Home):
    @http.route()
    def index(self, *args, **kw):
        if request.session.uid and request.env["res.users"].sudo().browse(
            request.session.uid
        ).has_group("pms_pwa.group_pms_property_user"):
            return http.local_redirect("/", query=request.params, keep_hash=True)
        return super(Home, self).index(*args, **kw)

    def _login_redirect(self, uid, redirect=None):
        if not redirect and request.env["res.users"].sudo().browse(uid).has_group(
            "pms_pwa.group_pms_property_user"
        ):
            return "/"
        return super(PWAHome, self)._login_redirect(uid, redirect=redirect)


# Frontend controllers to test
class TestFrontEnd(http.Controller):
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
        paginate_by = 10

        # TODO: ORDER STUFF's
        # searchbar_sortings = {
        #     "priority":
        #         {
        #             "label": _("Priority"),
        #             "order": "priority"
        #         },
        #     }
        # if not sortby:
        #     sortby = "priority"
        # sort_folio = searchbar_sortings[sortby]["order"]
        # sortby = 'priority'
        # / ORDER STUFF's

        pager = request.website.pager(
            url="/reservation/list",
            total=request.env["pms.folio"].search_count_folios_pwa(search, **post),
            page=page,
            step=paginate_by,
            url_args=post,
        )

        values = {
            "folios": request.env["pms.folio"].search_folios_pwa(
                search=search,
                # order=sort_folio,  #TODO: REVIEW SORTING
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
                reservation.pwa_action_checkin(params["guests_list"], reservation_id)
            except Exception as e:
                return json.dumps({"result": False, "message": str(e)})
            return json.dumps(
                {"result": True, "message": _("Operation completed successfully.")}
            )
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
                    if reservation.folio_payment_state == "not_paid":
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
        "/",
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
        }
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
                )
                reservation_lines += folio.sale_line_ids.filtered(
                    lambda x: x.service_id.reservation_id.id in reservation_ids
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
        if reservation_id:
            reservation = (
                request.env["pms.reservation"]
                .sudo()
                .search([("id", "=", int(reservation_id))])
            )
        if not reservation:
            raise MissingError(_("This document does not exist."))

        buttons = json.loads(reservation.pwa_action_buttons)
        keys = buttons.keys()
        keysList = [key for key in keys]

        primary_button = ""
        secondary_buttons = []

        counter = 0
        for _key in keysList:
            if counter == 0 or keysList[counter] == "Ver Detalle":
                primary_button = (
                    "<button url='"
                    + buttons[keysList[counter]]
                    + "' class='btn o_pms_pwa_abutton o_pms_pwa_button_"
                    + str(keysList[counter].lower())
                    + "' type='button'>"
                    + keysList[counter]
                    + "</button>"
                )
            elif keysList[counter] != "Ver Detalle":
                secondary_buttons.append(
                    "<button url='"
                    + buttons[keysList[counter]]
                    + "' class='dropdown-item  o_pms_pwa_abutton o_pms_pwa_button_"
                    + str(keysList[counter].lower())
                    + "' type='button'>"
                    + keysList[counter]
                    + "</button>"
                )
            counter += 1

        reservation_values = {
            "id": reservation.id,
            "name": reservation.name,
            "partner_id": {
                "id": reservation.partner_id.id,
                "name": reservation.partner_id.name,
                "mobile": reservation.partner_id.mobile or reservation.partner_id.phone,
            },
            "unread_msg": 2,
            "messages": ["Lorem ipsum", "Unread short message"],
            "room_type_id": {
                "id": reservation.room_type_id.id,
                "name": reservation.room_type_id.name,
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
            },
            "nights": reservation.nights,
            "checkin": reservation.checkin,
            "arrival_hour": reservation.arrival_hour,
            "checkout": reservation.checkout,
            "departure_hour": reservation.departure_hour,
            "folio_id": {
                "id": reservation.folio_id.id,
                "amount_total": reservation.folio_id.amount_total,
                "outstanding_vat": 15.69,
            },
            "state": reservation.state,
            "origin": reservation.origin,
            "detail_origin": reservation.detail_origin,
            "credit_card_details": reservation.credit_card_details,
            "price_total": reservation.price_total,
            "price_tax": reservation.price_tax,
            "folio_pending_amount": reservation.folio_pending_amount,
            "folio_internal_comment": reservation.folio_internal_comment,
            "payment_methods": self._get_allowed_payments_journals(),
            "reservation_types": self._get_reservation_types(),
            "checkins_ratio": reservation.checkins_ratio,
            "ratio_checkin_data": reservation.ratio_checkin_data,
            "adults": reservation.adults,
            "checkin_partner_ids": reservation._get_checkin_partner_ids(),
            "pms_property_id": reservation.pms_property_id.id,
            "service_ids": reservation._get_service_ids(),
            "primary_button": primary_button,
            "secondary_buttons": secondary_buttons,
            "pricelist_id": reservation.pricelist_id.id,
        }
        return reservation_values

    @http.route(
        ["/reservation/<int:reservation_id>/onchange_data"],
        type="json",
        auth="public",
        methods=["POST"],
        website=True,
    )
    def reservation_onchange_data(self, reservation_id=None, **kw):
        old_reservation_type = None
        old_values = None
        if reservation_id:
            reservation = (
                request.env["pms.reservation"]
                .sudo()
                .search([("id", "=", int(reservation_id))])
            )
        if not reservation:
            raise MissingError(_("This document does not exist."))
        if reservation:
            try:
                params = http.request.jsonrequest.get("params")
                for param in params.keys():
                    # ADULTS
                    if param == "adults":
                        params["adults"] = int(params["adults"])

                    # ROOM TYPE
                    elif param == "room_type_id":
                        params["room_type_id"] = request.env["pms.room.type"].browse(
                            int(params["room_type_id"])
                        )

                    # PREFERRED ROOM ID
                    elif param == "preferred_room_id":
                        params["preferred_room_id"] = request.env["pms.room"].browse(
                            int(params["preferred_room_id"])
                        )

                    #  PRICE TOTAL REVIEW
                    elif param == "price_total":
                        # params[param] = float(params[param])
                        pass
                    # CHECKIN & CHECKOUT TODO process both as an unit
                    elif param in ["checkin", "checkout"]:
                        pass

                    # ARRIVAL HOUR, DEPARTURE HOUR TODO
                    elif param in ["arrival_hour", "departure_hour"]:
                        pass

                    # ELIF CHANGE QTY BOARD SERVICES
                    elif param == "board_service":
                        # reservation_id, board_service_line, board_service_line_id, qty
                        # get service_line & service_line_ids and change qty
                        board_service = params["board_service"]
                        service_id = board_service["service_id"]
                        service_line_id = board_service["service_line_id"]
                        qty = board_service["qty"]

                        service = reservation.folio_id.service_ids.browse(
                            int(service_id)
                        )
                        service_line = service.service_line_ids.browse(
                            int(service_line_id)
                        )
                        service_line.day_qty = int(qty)

                    # RESERVATION TYPE

                    elif param == "reservation_type":
                        old_reservation_type = reservation.folio_id.reservation_type
                        reservation.folio_id.reservation_type = params[param]

                if "reservation_type" in params:
                    del params["reservation_type"]
                if "board_service" in params:
                    del params["board_service"]
                old_values = parse_reservation(reservation)
                if "price_total" in params:
                    del params["price_total"]
                del params["reservation_id"]
                reservation.write(params)
            except Exception as e:
                # REVIEW
                reservation.write(old_values)
                reservation.flush()
                reservation.folio_id.reservation_type = old_reservation_type
                return json.dumps(
                    {
                        "result": False,
                        "message": str(e),
                        "reservation": parse_reservation(reservation),
                    }
                )
            # print(parse_reservation(reservation))
            return json.dumps(
                {
                    "result": True,
                    "message": _("Operation completed successfully."),
                    "reservation": parse_reservation(reservation),
                }
            )
        else:
            return json.dumps({"result": False, "message": _("Reservation not found")})

    @http.route(
        ["/reservation/virtual"],
        type="json",
        auth="public",
        methods=["POST"],
        website=True,
    )
    def create_virtual_reservation(self):
        reservation_values = http.request.jsonrequest.get("params")

        # return reservation_values
        checkin_date = datetime.strptime(
            reservation_values["check_in_date"], "%d/%m/%Y"
        )
        checkout_date = datetime.strptime(
            reservation_values["check_out_date"], "%d/%m/%Y"
        )

        pricelist_id = reservation_values["pricelist_id"]
        room_type_id = reservation_values["room_type_id"]
        pms_property_id = reservation_values["pms_property_id"]

        pricelist = (
            request.env["product.pricelist"].sudo().search([("id", "=", pricelist_id)])
        )
        room_type = (
            request.env["pms.room.type"].sudo().search([("id", "=", room_type_id)])
        )
        pms_property = (
            request.env["pms.property"].sudo().search([("id", "=", pms_property_id)])
        )

        reservation = request.env["pms.reservation"].new(
            {
                "checkin": checkin_date,
                "checkout": checkout_date,
                "room_type_id": room_type,
                "pricelist_id": pricelist,
                "pms_property_id": pms_property,
            }
        )
        reservation.flush()
        # print(reservation.price_total)
        # print("name", reservation.preferred_room_id.name)
        # print(reservation.reservation_line_ids.mapped("room_id"))
        # print(reservation.reservation_line_ids.mapped("price"))

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

    @http.route(
        "/calendar",
        type="http",
        auth="user",
        methods=["GET", "POST"],
        website=True,
    )
    def calendar(self, date=False, **post):
        if not date:
            date = datetime.now()
        date_start = date + timedelta(days=-1)
        if post.get("next"):
            date = datetime.strptime(post.get("next"), "%Y-%m-%d")
            date_start = date + timedelta(days=+7)
        if post.get("previous"):
            date = datetime.strptime(post.get("previous"), "%Y-%m-%d")
            date_start = date + timedelta(days=-7)

        Room = request.env["pms.room.type"]
        rooms = Room.search([])
        date_list = [date_start + timedelta(days=x) for x in range(7)]

        Pricelist = request.env["product.pricelist"]
        pricelist = Pricelist.search([])
        default_pricelist = pricelist[0].id
        if post and "pricelist" in post:
            default_pricelist = int(post["pricelist"])

        values = {
            "today": datetime.now(),
            "date_start": date_start,
            "page_name": "Calendar",
            "pricelist": pricelist,
            "default_pricelist": default_pricelist,
            "rooms_list": rooms,
            "date_list": date_list,
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
        # if not date:
        #     date = datetime.now()
        # date_end = date + timedelta(days=7)
        # Reservation = request.env["pms.reservation"]
        # domain = self._get_search_domain(search, **post)

        # domain += [
        #     ("checkin", ">=", date),
        #     ("checkout", "<=", date_end),
        # ]
        # reservations = Reservation.search(domain)
        # Ejemplo json
        values = {}
        values.update(
            {
                "reservations": [
                    {
                        "room": {
                            "id": "20",
                            "name": "normal-101",
                            "status": "Estado ahora",
                        },
                        "ocupation": [
                            {
                                "date": "22/03/2021",
                                "reservation_info": False,
                            },
                            {
                                "date": "23/03/2021",
                                "reservation_info": {
                                    "id": 58,
                                    "partner_name": "Sabela Gómez G",
                                    "img": "/web/image/res.partner/3/image_128",
                                    "price": 240,
                                    "status": "danger",
                                    "nigths": 2,
                                },
                            },
                            {
                                "date": "25/03/2021",
                                "reservation_info": False,
                            },
                            {
                                "date": "26/03/2021",
                                "reservation_info": False,
                            },
                            {
                                "date": "27/03/2021",
                                "reservation_info": {
                                    "id": 10,
                                    "partner_name": "Sabela Gómez G",
                                    "img": "/web/image/res.partner/3/image_128",
                                    "price": 120,
                                    "status": "success",
                                    "nigths": 1,
                                },
                            },
                            {
                                "date": "28/03/2021",
                                "reservation_info": False,
                            },
                        ],
                    },
                    {
                        "room": {
                            "id": "20",
                            "name": "doble-202",
                            "status": "limpia",
                        },
                        "ocupation": [
                            {
                                "date": "22/03/2021",
                                "reservation_info": {
                                    "id": 52,
                                    "partner_name": "Sabela Gómez G",
                                    "img": "/web/image/res.partner/3/image_128",
                                    "price": 240,
                                    "status": "success",
                                    "nigths": 2,
                                },
                            },
                            {
                                "date": "24/03/2021",
                                "reservation_info": False,
                            },
                            {
                                "date": "25/03/2021",
                                "reservation_info": {
                                    "id": 8,
                                    "partner_name": "Sabela Gómez G",
                                    "img": "/web/image/res.partner/3/image_128",
                                    "price": 120,
                                    "status": "warning",
                                    "nigths": 1,
                                },
                            },
                            {
                                "date": "26/03/2021",
                                "reservation_info": False,
                            },
                            {
                                "date": "27/03/2021",
                                "reservation_info": False,
                            },
                            {
                                "date": "28/03/2021",
                                "reservation_info": False,
                            },
                        ],
                    },
                ]
            }
        )
        return values

    @http.route(
        ["/reservation/single_reservation_onchange"],
        type="json",
        auth="public",
        methods=["POST"],
        website=True,
    )
    def single_reservation_onchange(self, **kw):
        # TODO something with the data and give back the new values
        params = http.request.jsonrequest.get("params")
        if "rooms" in params:
            reservation_values = {}
        else:
            reservation_values = {
                "total": 260,
            }

        return reservation_values

    @http.route(
        ["/reservation/multiple_reservation_onchange"],
        type="json",
        auth="public",
        methods=["POST"],
        website=True,
    )
    def multiple_reservation_onchange(self, **kw):
        # TODO something with the data and give back the new values
        params = http.request.jsonrequest.get("params")

        if "rooms" in params:
            reservation_values = {}
        else:
            reservation_values = {
                "total": 260,
            }

        return reservation_values

    @http.route(
        ["/reservation/single_reservation_new"],
        type="json",
        auth="public",
        methods=["POST"],
        website=True,
    )
    def single_reservation_new(self, **kw):
        # TODO something with the data and give back the new values
        params = http.request.jsonrequest.get("params")
        return json.dumps(
            {
                "result": True,
                "message": _("Operation completed successfully."),
                "id": 8,
            }
        )
        # """ OR """
        # return json.dumps(
        #     {"result": False, "message": _("Unnable to create the reservation")}
        # )

    @http.route(
        ["/reservation/multiple_reservation_new"],
        type="json",
        auth="public",
        methods=["POST"],
        website=True,
    )
    def multiple_reservation_new(self, **kw):
        # TODO something with the data and give back the new values
        params = http.request.jsonrequest.get("params")
        return json.dumps(
            {
                "result": True,
                "message": _("Operation completed successfully."),
                "id": 25,
            }
        )
        # """ OR """
        # return json.dumps(
        #     {"result": False, "message": _("Unnable to create the reservation")}
        # )

    @http.route(
        "/calendar/config",
        type="http",
        auth="user",
        methods=["GET", "POST"],
        website=True,
    )
    def calendar_config(self, date=False, **post):
        if not date:
            date = datetime.now()
        date_start = date + timedelta(days=-1)
        if post.get("next"):
            date = datetime.strptime(post.get("next"), "%Y-%m-%d")
            date_start = date + timedelta(days=+7)
        if post.get("previous"):
            date = datetime.strptime(post.get("previous"), "%Y-%m-%d")
            date_start = date + timedelta(days=-7)

        Room = request.env["pms.room.type"]
        rooms = Room.search([])
        date_list = [date_start + timedelta(days=x) for x in range(7)]

        Pricelist = request.env["product.pricelist"]
        pricelist = Pricelist.search([])
        default_pricelist = pricelist[0].id
        if post and "pricelist" in post:
            default_pricelist = int(post["pricelist"])

        values = {
            "today": datetime.now(),
            "date_start": date_start,
            "page_name": "Calendar config",
            "pricelist": pricelist,
            "default_pricelist": default_pricelist,
            "rooms_list": rooms,
            "date_list": date_list,
        }
        return http.request.render(
            "pms_pwa.roomdoo_calendar_config_page",
            values,
        )


def parse_reservation(reservation):
    reservation_values = dict()
    reservation_values["id"] = reservation.id
    reservation_values["room_type_id"] = int(reservation.room_type_id.id)
    reservation_values["preferred_room_id"] = int(reservation.preferred_room_id.id)
    reservation_values["adults"] = reservation.adults
    reservation_values["reservation_type"] = reservation.folio_id.reservation_type

    reservation_values["arrival_hour"] = reservation.arrival_hour
    reservation_values["departure_hour"] = reservation.departure_hour
    reservation_values["price_total"] = reservation.price_total
    reservation_values["folio_pending_amount"] = reservation.folio_pending_amount

    return reservation_values
