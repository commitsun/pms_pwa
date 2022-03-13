# Part of Odoo. See LICENSE file for full copyright and licensing details.

# -*- coding: utf-8 -*-

from inspect import isdatadescriptor
import logging
import json
import pprint
from calendar import monthrange
from datetime import timedelta
import datetime
from itertools import groupby

from odoo import _, fields, http
from odoo.http import request
from odoo.tools.misc import get_lang

RESET_CALENDAR_HOURS = 1

pp = pprint.PrettyPrinter(indent=4)

_logger = logging.getLogger(__name__)


def defaultconverter(o):
    if isinstance(o, datetime.datetime):
        return o.__str__()


class PmsCalendar(http.Controller):

    @http.route(
        "/calendar/reduced",
        type="http",
        auth="user",
        methods=["GET", "POST"],
        website=True,
    )
    def reduced_calendar(self, **post):
        print("http ---> ", post)
        values = self._get_calendar_values(post)
        return http.request.render(
            "pms_pwa.roomdoo_reduced_calendar_page",
            values,
        )

    @http.route(
        "/property/calendar",
        type="json",
        auth="public",
        csrf=False,
        methods=["POST"],
        website=True,
    )
    def property_calendar(self, **post):
        print("json ---> ", post)
        return self._get_calendar_values(post)

    def _get_calendar_values(self, post):

        pms_property_id = self._get_property(post)

        calendar_config = self._get_calendar_config(pms_property_id)

        date_start, date_list = self._get_dates(calendar_config, post)

        room_types = self._get_room_types(pms_property_id)

        allowed_pricelists, select_pricelist_id = self._get_pricelists(calendar_config, post)

        allowed_availability_plans, select_availability_plan_id = self._get_avail_plans(calendar_config, post)

        general_headers = self._get_general_headers(
            dates=date_list,
            pms_property_id=pms_property_id,
            room_type_ids=room_types.ids,
        )
        price_headers = self._get_price_headers(
            dates=date_list,
            pms_property_id=pms_property_id,
            pricelist_id=select_pricelist_id,
            room_type_ids=room_types.ids,
        )
        rule_headers = self._get_rules_headers(
            dates=date_list,
            pms_property_id=pms_property_id,
            pricelist_id=select_pricelist_id,
            room_type_ids=room_types.ids,
        )
        rooms_list = []
        for room_type in room_types:
            rooms_list.append({
                'id': room_type.id,
                'name': room_type.name,
                'total_rooms': room_type._get_total_rooms(pms_property_id),
                'default_code': room_type.default_code,
            })
        result = {
            "today": datetime.datetime.now(),
            "date_start": date_start,
            "page_name": "Calendario",
            "allowed_pricelists": allowed_pricelists,
            "select_pricelist_id": select_pricelist_id,
            "pms_property_id": pms_property_id,
            "date_list": date_list,
            "selected_date": date_start,
            "allowed_availability_plans": allowed_availability_plans,
            "select_availability_plan_id": select_availability_plan_id,
            "rooms_list": rooms_list,
            "general_headers": general_headers,
            "price_headers": price_headers,
            "rule_headers": rule_headers,
        }
        # pp.pprint(result)
        return result

    @http.route(
        "/calendar/general_headers",
        type="json",
        auth="public",
        csrf=False,
        methods=["POST"],
        website=True,
    )
    def calendar_general_headers(self, **post):
        return self._get_general_headers(
            dates=[item for item in eval(post.get("range_date"))],
            pms_property_id=int(post.get("pms_property_id")),
            room_type_ids=[int(item) for item in post.get("room_type_ids")] if post.get("room_type_ids") else False,
        )

    def _get_general_headers(self, dates, pms_property_id, room_type_ids=False):
        # Funtion to group by date in query sql result
        def date_func(k):
            return k[0]

        # Funtion to group by room type in query sql result
        def room_type_func(k):
            return k[1]
        pms_property = request.env["pms.property"].browse(pms_property_id)
        if not room_type_ids:
            room_types = pms_property.room_ids.room_type_id
        else:
            room_types = request.env["pms.room.type"].browse(room_type_ids)

        # Prepare data
        request.env.cr.execute(
            """
            SELECT DATE(night.date), pms_room.room_type_id, reservation.reservation_type, count(night.id)
            FROM    pms_reservation_line  night
                    LEFT JOIN pms_reservation reservation
                        ON reservation.id = night.reservation_id
                    LEFT JOIN pms_room
                        ON pms_room.id = night.room_id
            WHERE   (night.pms_property_id = %s)
                AND (night.date in %s)
                AND (pms_room.room_type_id in %s)
                AND (night.occupies_availability = TRUE)
                AND (night.room_id is not NULL)
            GROUP BY DATE(night.date), pms_room.room_type_id, reservation.reservation_type
            """,
            (
                pms_property_id,
                tuple(dates),
                tuple(room_types.ids),
            )
        )
        avail_result = request.env.cr.fetchall()
        avail_result = sorted(avail_result, key=date_func)
        dict_result = {}
        overbooking_lines = request.env["pms.reservation"].search([
            ("pms_property_id", "=", pms_property_id),
            ("overbooking", "=", True),
            ("state", "!=", "cancel"),
            ("checkin", "<=", dates[-1]),
            ("checkout", ">", dates[0]),
        ]).mapped("reservation_line_ids")
        pwa_events = request.env["pms.pwa.event"].search([
            ("date", ">=", dates[0]),
            ("date", "<=", dates[-1]),
            '|',
            ("pms_property_ids", "in", pms_property_id),
            ("pms_property_ids", "=", False),
        ])
        for avail_date, data in groupby(avail_result, date_func):
            total_res_count = 0
            total_out_count = 0
            s_avail_date = avail_date.strftime("%Y-%m-%d")
            dict_result[s_avail_date] = {}
            data = list(filter(lambda x: x[1] is not None, data))
            data = sorted(data, key=room_type_func)
            notifications_warning = self._get_notifications_warning(pms_property_id, avail_date, overbooking_lines)
            notifications_info = self._get_notifications_info(pms_property_id, avail_date, pwa_events)
            for room_type_id, vals in groupby(data, room_type_func):
                room_type = request.env["pms.room.type"].browse(room_type_id)
                vals = list(vals)
                res_count = sum([x[3] for x in vals if x[2] != 'out'])
                out_count = sum([x[3] for x in vals if x[2] == 'out'])
                total_rooms = room_type._get_total_rooms(pms_property.id)
                num_avail = room_type._get_total_rooms(pms_property.id) - (res_count + out_count)

                dict_result[s_avail_date][room_type_id] = {
                    'reservations_count': res_count,
                    'outs_count': out_count,
                    'num_avail': num_avail,
                    'reservations_percent': int((res_count * 100) / total_rooms),
                    'outs_percent': int((out_count * 100) / total_rooms),
                    'avail_percent': int((num_avail * 100) / total_rooms),
                    'notifications_warning': notifications_warning,
                    'notifications_info': notifications_info,
                }
                if room_type.overnight_room:
                    total_res_count += res_count
                    total_out_count += out_count
            # complete estructure to avoid room types
            for room_type in room_types:
                if room_type.id not in dict_result[s_avail_date]:
                    dict_result[s_avail_date][room_type.id] = {
                        'reservations_count': 0,
                        'outs_count': 0,
                        'num_avail': room_type._get_total_rooms(pms_property.id),
                        'reservations_percent': 0,
                        'outs_percent': 0,
                        'avail_percent': 100,
                        'notifications_warning': notifications_warning,
                        'notifications_info': notifications_info,
                    }
            dict_result[s_avail_date]["property_header"] = {
                'reservations_count': total_res_count,
                'outs_count': total_out_count,
                'percent_occupied': int((total_res_count + total_out_count) * 100 / pms_property._get_total_rooms()),
                'num_avail': pms_property._get_total_rooms() - (total_res_count + total_out_count),
                'reservations_percent': 0,
                'outs_percent': 0,
                'avail_percent': 100,
                'notifications_warning': notifications_warning,
                'notifications_info': notifications_info,
            }
        # complete estructure to avoid dates
        for date in dates:
            s_date = date.strftime("%Y-%m-%d")
            if s_date not in dict_result:
                dict_result[s_date] = {}
                dict_result[s_date]["property_header"] = {
                    'reservations_count': 0,
                    'outs_count': 0,
                    'percent_occupied': 0,
                    'num_avail': pms_property._get_total_rooms(),
                    'reservations_percent': 0,
                    'outs_percent': 0,
                    'avail_percent': 100,
                    'notifications_warning': False,
                    'notifications_info': False,
                }
                for room_type in room_types:
                    dict_result[s_date][room_type.id] = {
                        'reservations_count': 0,
                        'outs_count': 0,
                        'num_avail': room_type._get_total_rooms(pms_property.id),
                        'reservations_percent': 0,
                        'outs_percent': 0,
                        'avail_percent': 100,
                        'notifications_warning': False,
                        'notifications_info': False,
                    }
        return dict_result

    @http.route(
        "/calendar/price_headers",
        type="json",
        auth="public",
        csrf=False,
        methods=["POST"],
        website=True,
    )
    def calendar_price_headers(self, **post):
        return self._get_price_headers(
            dates=[item for item in eval(post.get("range_date"))],
            pms_property_id=int(post.get("pms_property_id")),
            pricelist_id=int(post.get("pricelist_id")),
            room_type_ids=[int(item) for item in post.get("room_type_ids")] if post.get("room_type_ids") else False,
        )

    def _get_price_headers(self, dates, pms_property_id, pricelist_id, room_type_ids=False):
        pms_property = request.env["pms.property"].browse(pms_property_id)
        pricelist = request.env["product.pricelist"].browse(pricelist_id)
        if not room_type_ids:
            room_types = pms_property.room_ids.room_type_id
        else:
            room_types = request.env["pms.room.type"].browse(room_type_ids)

        # Prepare data
        dict_result = {}
        for date in dates:
            a_date = date.strftime("%Y-%m-%d")
            products = [(r, 1, False) for r in room_types.product_id]
            date_prices = pricelist.with_context(
                quantity=1,
                consumption_date=date,
                property=pms_property_id,
            )._compute_price_rule(products, datetime.datetime.today())
            dict_result[a_date] = {
                request.env["product.product"].browse(k).room_type_id.id: not v[0].is_integer() and v[0] or int(v[0]) for k, v in date_prices.items()
            }
        return dict_result

    @http.route(
        "/calendar/rules_headers",
        type="json",
        auth="public",
        csrf=False,
        methods=["POST"],
        website=True,
    )
    def calendar_rules_headers(self, **post):
        return self._get_rules_headers(
            dates=[item for item in eval(post.get("range_date"))],
            pms_property_id=int(post.get("pms_property_id")),
            pricelist_id=int(post.get("pricelist_id")),
            room_type_ids=[int(item) for item in post.get("room_type_ids")] if post.get("room_type_ids") else False,
        )

    def _get_rules_headers(self, dates, pms_property_id, pricelist_id, room_type_ids=False):
        pms_property = request.env["pms.property"].browse(pms_property_id)
        pricelist = request.env["product.pricelist"].browse(pricelist_id)
        if not room_type_ids:
            room_types = pms_property.room_ids.room_type_id
        else:
            room_types = request.env["pms.room.type"].browse(room_type_ids)
        availability_plan = pricelist.availability_plan_id

        # Prepare data
        dict_result = {}
        if not availability_plan:
            availability_plan = request.env["pms.availability.plan"].search([], limit=1)
        if availability_plan:
            request.env.cr.execute(
                """
                SELECT DATE(date), room_type_id, min_stay, closed, quota, max_avail, plan_avail,
                    min_stay_arrival, max_stay, max_stay_arrival, closed_departure, closed_arrival
                FROM    pms_availability_plan_rule  rule
                WHERE   (rule.pms_property_id = %s)
                    AND (rule.date in %s)
                    AND (rule.room_type_id in %s)
                    AND (rule.availability_plan_id = %s)
                """,
                (
                    pms_property_id,
                    tuple(dates),
                    tuple(room_types.ids),
                    availability_plan.id,
                )
            )
            rules_result = request.env.cr.fetchall()

            def date_func(k):
                return k[0]

            def room_type_func(k):
                return k[1]

            rules_result = sorted(rules_result, key=date_func)
            for rule_date, data in groupby(rules_result, date_func):
                s_rule_date = rule_date.strftime("%Y-%m-%d")
                dict_result[s_rule_date] = {}
                data = list(filter(lambda x: x[1] is not None, data))
                data = sorted(data, key=room_type_func)
                for room_type_id, vals in groupby(data, room_type_func):
                    vals = list(vals)[0]
                    dict_result[s_rule_date][room_type_id] = {
                        'min_stay': vals[2],
                        'closed': vals[3],
                        'quota': vals[4],
                        'max_avail': vals[5],
                        'plan_avail': vals[6],
                        'min_stay_arrival': vals[7],
                        'max_stay': vals[8],
                        'max_stay_arrival': vals[9],
                        'closed_departure': vals[10],
                        'closed_arrival': vals[11],
                    }
                # complete estructure to avoid room types
                for room_type in room_types:
                    if room_type.id not in dict_result[s_rule_date]:
                        dict_result[s_rule_date][room_type.id] = {
                            'min_stay': 0,
                            'closed': 0,
                            'quota': -1,
                            'max_avail': -1,
                            'plan_avail': -1,  # TODO:calcular dispo real en el front?
                            'min_stay_arrival': 0,
                            'max_stay': 0,
                            'max_stay_arrival': 0,
                            'closed_departure': 0,
                            'closed_arrival': 0,
                        }
        # complete estructure to avoid dates
        for date in dates:
            s_date = date.strftime("%Y-%m-%d")
            if s_date not in dict_result:
                dict_result[s_date] = {}
                for room_type in room_types:
                    dict_result[s_date][room_type.id] = {
                        'min_stay': 0,
                        'closed': 0,
                        'quota': -1,
                        'max_avail': -1,
                        'plan_avail': -1,  # TODO:calcular dispo real en el fron?
                        'min_stay_arrival': 0,
                        'max_stay': 0,
                        'max_stay_arrival': 0,
                        'closed_departure': 0,
                        'closed_arrival': 0,
                    }
        return dict_result

    @http.route(
        "/calendar/reduced-change",
        type="json",
        auth="public",
        csrf=False,
        methods=["POST"],
        website=True,
    )
    def reduced_calendar_change(self, **post):
        change_room = False
        reservation = request.env["pms.reservation"].browse(int(post["id"]))
        calendar_date = datetime.datetime.strptime(
            post.get("date"), get_lang(request.env).date_format
        ).date()
        new_room = request.env["pms.room"].browse(int(post["room"]))
        old_room = reservation.reservation_line_ids.filtered(
            lambda line: line.date == calendar_date
        ).room_id
        date_to = False
        for date_iterator in [
            calendar_date + datetime.timedelta(days=x)
            for x in range(0, (reservation.checkout - calendar_date).days)
        ]:
            line_room_source = request.env["pms.reservation.line"].search(
                [("date", "=", date_iterator), ("room_id", "=", old_room.id)]
            )
            if not line_room_source:
                date_to = date_iterator - datetime.timedelta(days=1)
                break
        if not date_to:
            date_to = reservation.checkout - datetime.timedelta(days=1)
        if new_room != old_room:
            change_room = True
        if not post.get("submit"):
            target_room_lines = request.env["pms.reservation.line"].search([
                ("date", ">=", calendar_date),
                ("date", "<=", date_to),
                ("room_id", "=", new_room.id),
                ("occupies_availability", "=", True)
            ])
            if change_room:
                _logger.info("Change Only ROOM")
                if target_room_lines:
                    confirmation_mens = (
                        "Estas soltando la reserva en una habitación ocupada (" + new_room.display_name
                        + ") si confirmas se intercambiaran las habitaciones de las reservas"
                    )
                else:
                    confirmation_mens = (
                        "Modificar la reserva de " + reservation.partner_name
                        + " de la habitación " + old_room.display_name + " a la habitación " + new_room.display_name
                    )
            else:
                confirmation_mens = ("Ningún cambio detectado")
            print("return --->")
            return {"result": "success", "message": confirmation_mens, "date": post["date"], "reservation": post["id"], "room": post["room"]}
        else:
            try:
                request.env["pms.reservation.split.join.swap.wizard"].reservations_swap(
                    checkin=calendar_date,
                    checkout=date_to,
                    source=old_room.id,
                    target=new_room.id,
                )
                return {"result": "success", "reservation": post['id'], "old_group_room": old_room.id, "new_group_room": new_room.id}
            except Exception as e:
                return json.dumps({"result": False, "message": str(e)})
        # return True

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
        print("post ---> ", post)
        dates = [item for item in eval(post.get("range_date"))]
        from_date = min(dates)
        to_date = max(dates)
        pms_property_id = int(post.get("pms_property_id"))
        pms_property = request.env["pms.property"].browse(pms_property_id)
        pricelist_id = int(post.get("pricelist_id"))
        company = pms_property.company_id
        Reservation = request.env["pms.reservation"]
        ReservationLine = request.env["pms.reservation.line"]
        domain = [
            ("date", ">=", from_date),
            ("date", "<=", to_date),
            ("state", "!=", "cancel"),
            ("pms_property_id", "=", pms_property_id),
        ]
        reservation_lines = ReservationLine.with_company(company).search(domain)
        reservations = Reservation.browse(reservation_lines.mapped("reservation_id.id"))
        values = {}
        # REVIEW: revisar estructura
        values["reservations"] = []
        room_ids = (
            request.env["pms.room"]
            .with_company(company).search(
                [
                    ("pms_property_id", "=", pms_property_id),
                ], order="sequence"
            )
            .ids
        )
        for room_id in room_ids:
            free_dates = dates.copy()
            room = request.env["pms.room"].browse(room_id)
            rooms_reservation_values = []
            for reservation in reservations.filtered(
                lambda r: r.preferred_room_id.id == room_id
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
                        "restrictions_info": False,
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
            ).reservation_line_ids.filtered(
                lambda l: l.room_id.id == room_id
                and l.date in dates
            )
            used_line_ids = []
            for split in splitted_reservations_lines.sorted("date"):
                if split.id in used_line_ids:
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
                    line = reservation.reservation_line_ids.filtered(
                        lambda l: l.date == date_iterator and l.room_id == split.room_id
                    )
                    if line:
                        nights += 1
                        used_line_ids.append(line.id)
                        # splitted_reservations_lines -= line
                        free_dates.remove(line.date)
                rooms_reservation_values.append(
                    {
                        "splitted": True,
                        "main_split": main_split,
                        "date": split.date,
                        "restrictions_info": False,
                        "reservation_info": {
                            "id": reservation.id,
                            "partner_name": "Partida! " + reservation.partner_name
                            if main_split
                            else "Partida! " + reservation.rooms,
                            "img": "/web/image/pms.reservation/"
                            + str(reservation.id)
                            + "/partner_image_128",
                            "price": round(reservation.folio_pending_amount, 2)
                            if main_split
                            else '',
                            "status": reservation.color_state,
                            "icon_payment": reservation.icon_payment,
                            "nigths": nights,
                            "days": nights + 1,
                            "checkin_in_range": True,
                            "checkout_in_range": True,
                        },
                    }
                )
            for day in free_dates:
                pricelist = request.env["product.pricelist"].browse(pricelist_id)
                plan = pricelist.availability_plan_id
                restriction_message = False
                if plan:
                    rule = request.env["pms.availability.plan.rule"].search([
                        "room_type_id", "=", room.pms_room_type_id.id,
                        "date", "=", day,
                        "pms_property_id", "=", pms_property_id,
                        "availability_plan_id", "=", plan.id,
                    ])
                    if rule:
                        restriction_message = ""
                        if rule.min_stay:
                            restriction_message += "Minimo de " + str(rule.min_stay) + " noches" + "<br/>"
                        if rule.max_stay:
                            restriction_message += "Máximo de " + str(rule.max_stay) + " noches" + "<br/>"
                        if rule.closed_arrival:
                            restriction_message += "No se admite llegadas" + "<br/>"
                        if rule.closed_departure:
                            restriction_message += "No se admite salidas" + "<br/>"
                        if rule.min_stay_arrival:
                            restriction_message += "No se admite llegadas con menos de " + str(
                                rule.min_stay_arrival
                            ) + " noches" + "<br/>"
                        if rule.max_stay_arrival:
                            restriction_message += "No se admite llegadas con más de " + str(
                                rule.max_stay_arrival
                            ) + " noches" + "<br/>"
                        if rule.closed:
                            restriction_message += "No disponible" + "<br/>"
                rooms_reservation_values.append(
                    {
                        "date": day,
                        "reservation_info": False,
                        "restrictions_info": restriction_message,
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

    def _get_calendar_config(self, pms_property_id):
        calendar_config = request.env["pms.user.calendar.property"].sudo().search([
            ("pms_property_id", "=", pms_property_id),
            ("user_id", "=", request.env.user.id)
        ])
        if (
            calendar_config
            and (datetime.datetime.now() - calendar_config.write_date).total_seconds() / 3600 > RESET_CALENDAR_HOURS
        ):
            calendar_config.sudo().unlink()
            calendar_config = False
        if not calendar_config:
            calendar_config = request.env["pms.user.calendar.property"].sudo().create({
                "pms_property_id": pms_property_id,
                "user_id": request.env.user.id,
            })
        return calendar_config

    def _get_dates(self, calendar_config, post):
        date = datetime.date.today()
        if calendar_config.date_start:
            date_start = calendar_config.date_start
        else:
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
        calendar_config.date_start = date_start
        dpr = 31
        date_list = [date_start + timedelta(days=x) for x in range(dpr)]
        return date_start, date_list

    def _get_property(self, post):
        pms_property_id = request.env.user.get_active_property_ids()[0]
        if post and post.get("selected_property"):
            pms_property_id = int(post["selected_property"])
        return pms_property_id

    def _get_room_types(self, pms_property_id):
        Room = request.env["pms.room"]
        rooms = Room.search([("pms_property_id", "=", pms_property_id)])
        room_type_ids = rooms.mapped("room_type_id.id")
        room_types = request.env["pms.room.type"].search([
            ("id", "in", room_type_ids),
        ], order="sequence")

        return room_types

    def _get_pricelists(self, calendar_config, post):
        pms_property_id = calendar_config.pms_property_id.id
        pricelists = request.env["product.pricelist"].search([
            "|",
            ("pms_property_ids", "=", False),
            ("pms_property_ids", "in", pms_property_id),
        ])
        if calendar_config.select_pricelist:
            select_pricelist = calendar_config.select_pricelist
        else:
            select_pricelist = pricelists[0]
        if post and post.get("pricelist") and int(post.get("pricelist")) != 0:
            select_pricelist = request.env["product.pricelist"].browse(int(post["pricelist"]))
        calendar_config.select_pricelist = select_pricelist
        allowed_pricelists = []
        for pricelist in pricelists:
            allowed_pricelists.append(
                {
                    "id": pricelist.id,
                    "name": pricelist.name,
                }
            )

        return allowed_pricelists, select_pricelist.id

    def _get_avail_plans(self, calendar_config, post):
        pms_property_id = calendar_config.pms_property_id.id
        availability_plans = request.env["pms.availability.plan"].search(
            [
                "|",
                ("pms_property_ids", "=", False),
                ("pms_property_ids", "in", pms_property_id),
            ]
        )
        if calendar_config.select_availability_plan:
            select_availability_plan = calendar_config.select_availability_plan
        else:
            select_availability_plan = availability_plans[0]
        if post and post.get("availability_plan") and int(post.get("availability_plan")) != 0:
            select_availability_plan = request.env["pms.availability.plan"].browse(int(post["availability_plan"]))
        calendar_config.select_availability_plan = select_availability_plan
        allowed_availability_plans = []
        for plan in availability_plans:
            allowed_availability_plans.append(
                {
                    "id": plan.id,
                    "name": plan.name,
                }
            )
        return allowed_availability_plans, select_availability_plan.id

    @http.route(
        "/calendar/modal",
        type="json",
        auth="public",
        csrf=False,
        methods=["POST"],
        website=True,
    )
    def _get_modal_values(self, **post):
        print("json ---> ", post)
        post = post.get("send_values")
        start_date = datetime.datetime.strptime(
            post.get("start_date"), "%d/%m/%Y"
        ).date()
        end_date = datetime.datetime.strptime(
            post.get("end_date"), "%d/%m/%Y"
        ).date()
        availability_fields = {
            "cupo": "quota",
            "estmin": "min_stay",
            "max_dispo": "max_avail",
            "closed": "closed",
            "closed_arrival": "closed_arrival",
            "max_stay": "max_stay",
            "max_stay_sa": "max_stay_arrival"
        }
        if post.get("price"):
            wizard = request.env["pms.massive.changes.wizard"].create({
                "pms_property_ids": [(6 , 0, [int(post.get("pms_property_id"))])],
                "massive_changes_on": "pricelist",
                "start_date": start_date,
                "end_date": end_date,
            })

            wizard.pricelist_ids = [(6, 0, [int(plan) for plan in post.get("pricelist_id")])]
            wizard.price = float(post.get("price"))

            wizard.room_type_ids = [(6, 0, [int(plan) for plan in post.get("room_type")])]
            wizard.apply_on_monday = post.get("apply_on_monday")
            wizard.apply_on_tuesday = post.get("apply_on_tuesday")
            wizard.apply_on_wednesday = post.get("apply_on_wednesday")
            wizard.apply_on_thursday = post.get("apply_on_thursday")
            wizard.apply_on_friday = post.get("apply_on_friday")
            wizard.apply_on_saturday = post.get("apply_on_saturday")
            wizard.apply_on_sunday = post.get("apply_on_sunday")
            wizard.apply_massive_changes()
        if any(post.get(field) for field in availability_fields.keys()):
            wizard = request.env["pms.massive.changes.wizard"].create({
                "pms_property_ids": [(6 , 0, [int(post.get("pms_property_id"))])],
                "massive_changes_on": "availability_plan",
                "start_date": start_date,
                "end_date": end_date,
            })
            wizard.room_type_ids = [(6, 0, [int(plan) for plan in post.get("room_type")])]
            wizard.apply_on_monday = post.get("apply_on_monday")
            wizard.apply_on_tuesday = post.get("apply_on_tuesday")
            wizard.apply_on_wednesday = post.get("apply_on_wednesday")
            wizard.apply_on_thursday = post.get("apply_on_thursday")
            wizard.apply_on_friday = post.get("apply_on_friday")
            wizard.apply_on_saturday = post.get("apply_on_saturday")
            wizard.apply_on_sunday = post.get("apply_on_sunday")

            wizard.availability_plan_ids = [(6, 0, [int(plan) for plan in post.get("availability_plan_ids")])]
            for post_field, wizard_field in availability_fields.items():
                if post.get(post_field):
                    wizard[wizard_field] = int(post.get(post_field))
                    wizard["apply_" + wizard_field] = True
            wizard.apply_massive_changes()

        return True

    def _get_notifications_warning(self, pms_property_id, date, overbooking_lines=False):
        """
        Get the notifications warning for the date
        :param
            pms_property_id: pms_property_id
            date: date
            overbooking_lines: overbooking_lines
        :return:
            dicts array with the notifications warning and
            optional id reservation
        """
        property_id = request.env["pms.property"].browse(pms_property_id)
        wargings = []
        if date in overbooking_lines.mapped("date"):
            date_lines = overbooking_lines.filtered(lambda l: l.date == date)
            for line in date_lines:
                wargings.append({
                    "message": "Reserva en OverBooking: {}".format(
                        line.reservation_id.name,
                    ),
                    "reservation_id": line.reservation_id.id
                })
        return wargings

    def _get_notifications_info(self, pms_property_id, date, pwa_events=False):
        """
        Get the notifications info for the date
        :param
            pms_property_id: pms_property_id
            date: date
        :return:
            dicts array with the notifications info and
            optional id reservation
        """
        property_id = request.env["pms.property"].browse(pms_property_id)
        info = []
        if date in pwa_events.mapped("date"):
            events = pwa_events.filtered(lambda l: l.date == date)
            for event in events:
                info.append({
                    "message": event.description,
                    "reservation_id": False,
                })
        return info

    @http.route(
        "/pms_pwa_event/new",
        csrf=False,
        auth="user",
        website=True,
        type="json",
        methods=["POST"],
    )
    def _pms_pwa_event_new(self, **post):
        """
        Create a new event
        :param
            post: date, description, pms_property_id
        :return:
            True if the event was created
        """
        pms_property_id = post.get("pms_property_id")
        try:
            date = datetime.datetime.strptime(
                post.get("date"), "%d/%m/%Y"
            ).date()
        except:
            date = datetime.datetime.strptime(
                post.get("date"), "%m/%d/%Y"
            ).date()
        pwa_event = request.env["pms.pwa.event"].create({
            # "name": post.get("name"),
            "date": date,
            "description": post.get("description"),
            "pms_property_ids": [(6, 0, [int(pms_property_id)])],
        })
        return json.dumps({"result": True, "message": _("Evento creado")})
