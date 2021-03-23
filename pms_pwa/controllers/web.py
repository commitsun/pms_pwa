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


class Home(Home):
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
        return super(Home, self)._login_redirect(uid, redirect=redirect)


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
                try:
                    account_journals = (
                        reservation.folio_id.pms_property_id._get_payment_methods()
                    )
                    journal = account_journals.browse(payload["payment_method"])
                    reservation.folio_id.do_payment(
                        journal,
                        journal.suspense_account_id,
                        request.env.user,
                        payload["amount"],
                        reservation.folio_id,
                        partner=reservation.partner_id,
                        date=fields.date.today(),
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
                payload = http.request.jsonrequest.get("invoice_lines")
                try:
                    lines_to_invoice = dict()
                    for value in payload:
                        lines_to_invoice[value["id"]] = value["qty"]
                    reservation.folio_id._create_invoices(
                        lines_to_invoice=lines_to_invoice
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

        values.update(
            {
                "tasks": ["task 01", "task 02", "task 03"],
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
                "evolution": {
                    "billing": {
                        "current": [
                            {"date": "05/10/2020", "amount": 3250},
                            {"date": "06/10/2020", "amount": 3750},
                        ],
                        "compare": [
                            {"date": "05/10/2019", "amount": 2150},
                            {"date": "06/10/2019", "amount": 3650},
                        ],
                    },
                    "revenue": {
                        "current": [
                            {"date": "05/10/2020", "amount": 3250},
                            {"date": "06/10/2020", "amount": 3750},
                        ],
                        "compare": [
                            {"date": "05/10/2019", "amount": 2150},
                            {"date": "06/10/2019", "amount": 3650},
                        ],
                    },
                    "ocupation": {
                        "current": [
                            {"date": "05/10/2020", "amount": 15},
                            {"date": "06/10/2020", "amount": 20},
                        ],
                        "compare": [
                            {"date": "05/10/2019", "amount": 6},
                            {"date": "06/10/2019", "amount": 19},
                        ],
                    },
                },
                "kpi": {
                    "ocupation": {
                        "arrivals": 14,
                        "departures": 7,
                        "no_show": 5,
                        "ratio": 3.99,
                    },
                    "reservations_by_channel": {
                        "phone": 14,
                        "booking": 7,
                        "other": 5,
                        "ratio": 4.21,
                    },
                    "income_by_channel": {
                        "phone": 1400,
                        "booking": 700,
                        "other": 500,
                        "ratio": 4.66,
                    },
                    "cleaning_score": {
                        "good": 54,
                        "acceptable": 24,
                        "bad": 14,
                        "ratio": 3.16,
                    },
                    "attention_score": {
                        "good": 55,
                        "acceptable": 20,
                        "bad": 11,
                        "ratio": 4.05,
                    },
                    "general_score": {
                        "good": 64,
                        "acceptable": 34,
                        "bad": 4,
                        "ratio": 4.25,
                    },
                },
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
            "invoice": reservation,
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
            if counter == 0:
                primary_button = (
                    "<button url='"
                    + buttons[keysList[counter]]
                    + "' class='btn o_pms_pwa_abutton o_pms_pwa_button_"
                    + str(keysList[counter].lower())
                    + "' type='button'>"
                    + keysList[counter]
                    + "</button>"
                )
            else:
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
            "checkins_ratio": reservation.checkins_ratio,
            "ratio_checkin_data": reservation.ratio_checkin_data,
            "adults": reservation.adults,
            "checkin_partner_ids": reservation._get_checkin_partner_ids(),
            "pms_property_id": reservation.pms_property_id.id,
            "service_ids": reservation._get_service_ids(),
            "primary_button": primary_button,
            "secondary_buttons": secondary_buttons,
        }

        return reservation_values

    @http.route(
        ["/reservation/onchange_data"],
        type="json",
        auth="public",
        methods=["POST"],
        website=True,
    )
    def reservation_onchange_data(self, reservation_id=None, **kw):
        if reservation_id:
            reservation = (
                request.env["pms.reservation"]
                .sudo()
                .search([("id", "=", int(reservation_id))])
            )
        if not reservation:
            raise MissingError(_("This document does not exist."))
        # TODO something with the data and give back the new values
        params = http.request.jsonrequest.get("params")

        if "nights" in params:
            reservation_values = {}
        else:
            reservation_values = {
                "nights": 4,
            }

        return reservation_values

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
    def calendar(self, date=False, **kw):
        if not date:
            date = datetime.now()
        date_start = date + timedelta(days=-1)
        Room = request.env["pms.room.type"]
        rooms = Room.search([])
        date_list = [date_start + timedelta(days=x) for x in range(7)]

        values = {
            "date": date,
            "page_name": "Calendar",
            # "reservations": reservations,
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
                        "habitacion": {
                            "id": "20",
                            "nombre": "normal",
                            "status": 2,
                        },
                        "ocupation": [
                            {
                                "date": "22/03/2021",
                                "reservation_info": False,
                            },
                            {
                                "date": "23/03/2021",
                                "reservation_info": {
                                    "id": 1,
                                    "partner_name": "Sabela Gómez G",
                                    "img": "pms_pwa/static/img/logo_mobil.png",
                                    "price": 240,
                                    "status": "done",
                                    "nigth": 2,
                                },
                            },
                            {
                                "date": "24/03/2021",
                                "reservation_info": {
                                    "id": 1,
                                    "partner_name": "Sabela Gómez G",
                                    "img": "pms_pwa/static/img/logo_mobil.png",
                                    "price": 240,
                                    "status": "done",
                                    "nigth": 2,
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
                                    "id": 1,
                                    "partner_name": "Sabela Gómez G",
                                    "img": "pms_pwa/static/img/logo_mobil.png",
                                    "price": 120,
                                    "status": "done",
                                    "nigth": 1,
                                },
                            },
                            {
                                "date": "28/03/2021",
                                "reservation_info": False,
                            },
                        ],
                    },
                    {
                        "habitacion": {
                            "id": "20",
                            "nombre": "doble",
                            "status": 2,
                        },
                        "ocupation": [
                            {
                                "date": "22/03/2021",
                                "reservation_info": {
                                    "id": 1,
                                    "partner_name": "Sabela Gómez G",
                                    "img": "pms_pwa/static/img/logo_mobil.png",
                                    "price": 240,
                                    "status": "done",
                                    "nigth": 2,
                                },
                            },
                            {
                                "date": "23/03/2021",
                                "reservation_info": {
                                    "id": 1,
                                    "partner_name": "Sabela Gómez G",
                                    "img": "pms_pwa/static/img/logo_mobil.png",
                                    "price": 240,
                                    "status": "done",
                                    "nigth": 2,
                                },
                            },
                            {
                                "date": "24/03/2021",
                                "reservation_info": False,
                            },
                            {
                                "date": "25/03/2021",
                                "reservation_info": {
                                    "id": 1,
                                    "partner_name": "Sabela Gómez G",
                                    "img": "pms_pwa/static/img/logo_mobil.png",
                                    "price": 120,
                                    "status": "done",
                                    "nigth": 1,
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
