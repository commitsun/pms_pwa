# Part of Odoo. See LICENSE file for full copyright and licensing details.

# -*- coding: utf-8 -*-

from inspect import isdatadescriptor
import logging
import pprint
from calendar import monthrange
from datetime import timedelta
import datetime

from odoo import _, fields, http
from odoo.http import request
from odoo.tools.misc import get_lang

pp = pprint.PrettyPrinter(indent=4)

_logger = logging.getLogger(__name__)


class PmsCalendar(http.Controller):
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

        pms_property = request.env.user.pms_pwa_property_id
        pms_property_id = pms_property.id
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
        if post.get("dpr") and post.get("dpr").isnumeric():
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
            {"name": "Hoteles", "value": "pms_property"},
            {"name": "Tipo de Habitación", "value": "room_type"},
            {"name": "Zonas Hotel", "value": "ubication"},
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
            elif post["display_option"] == "pms_property":
                obj_list = request.env.user.pms_pwa_property_ids
                selected_display = "pms_property"

        if post and "pricelist" in post:
            pricelist = int(post["pricelist"])

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
        pms_property_id = request.env.user.pms_pwa_property_id.id
        if post.get("selected_display") == "pms_property":
            pms_property_id = int(post.get("data_id"))
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
        elif post.get("selected_display") == "pms_property":
            room_ids = (
                request.env["pms.room"]
                .search(
                    [
                        ("pms_property_id", "=", pms_property_id),
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
                        "name": room.display_name,
                        "status": "Limpia",  # TODO
                    },
                    "ocupation": rooms_reservation_values,
                }
            )
        pp.pprint(values)
        return values

    @http.route(
        "/reduced-calendar",
        type="http",
        auth="user",
        methods=["GET", "POST"],
        website=True,
    )
    def reduced_calendar(self, **post):
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

        pms_property_id = request.env.user.pms_property_id.id
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
            "pms_pwa.roomdoo_reduced_calendar_page",
            values,
        )
