# Part of Odoo. See LICENSE file for full copyright and licensing details.

# -*- coding: utf-8 -*-

from inspect import isdatadescriptor
import logging
import pprint
from calendar import monthrange
from datetime import timedelta
import datetime
from itertools import groupby

from odoo import _, fields, http
from odoo.http import request
from odoo.tools.misc import get_lang

pp = pprint.PrettyPrinter(indent=4)

_logger = logging.getLogger(__name__)


class PmsCalendar(http.Controller):

    @http.route(
        "/calendar/reduced",
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
        pms_property_id = request.env.user.get_active_property_ids()[0]
        Room = request.env["pms.room"]
        rooms = Room.search([("pms_property_id", "=", pms_property_id)])
        room_types = request.env["pms.room.type"].browse(
            rooms.mapped("room_type_id.id")
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

        pricelist = Pricelist.search(
            [
                "|",
                ("pms_property_ids", "=", False),
                ("pms_property_ids", "in", pms_property_id),
                ('pricelist_type', '=', 'daily')
            ]
        )
        display_select_options = [
            {"name": "Hoteles", "value": "pms_property"},
            {"name": "Tipo de Habitación", "value": "room_type"},
            {"name": "Zonas Hotel", "value": "ubication"},
        ]
        # obj_list = room_types
        selected_display = "pms_property"
        # obj_list = request.env.user.pms_pwa_property_ids

        # if post and "display_option" in post:
        #     if post["display_option"] == "room_type":
        #         obj_list = room_types
        #         selected_display = "room_type"
        #     elif post["display_option"] == "ubication":
        #         obj_list = ubications
        #         selected_display = "ubication"
        #     elif post["display_option"] == "pms_property":
        #         obj_list = request.env.user.pms_pwa_property_ids
        #         selected_display = "pms_property"

        pms_property = request.env["pms.property"].browse(pms_property_id)
        tab_pms_property = pms_property.id
        if post and post.get("selected_property"):
            tab_pms_property = int(post["selected_property"])
            pms_property = request.env["pms.property"].browse(int(post["selected_property"]))
            pms_property_id = int(post["selected_property"])
        # TODO: Add pricelist not daily in readonly mode (only price)

        select_pricelist = pricelist[0]
        default_pricelist = 0
        if post and post.get("pricelist") and int(post.get("pricelist")) != 0:
            default_pricelist = int(post["pricelist"])
            select_pricelist = Pricelist.browse(int(post["pricelist"]))

        PlanAvail = request.env["pms.availability.plan"]

        availability_plan = PlanAvail.search(
            [
                "|",
                ("pms_property_ids", "=", False),
                ("pms_property_ids", "in", pms_property_id),
            ]
        )

        select_availability_plan = availability_plan[0]
        default_availability_plan = 0
        if post and post.get("availability_plan") and int(post.get("availability_plan")) != 0:
            default_availability_plan = int(post["availability_plan"])
            select_availability_plan = PlanAvail.browse(int(post["availability_plan"]))
        values = {
            "today": datetime.datetime.now(),
            "date_start": date_start,
            "page_name": "Calendar",
            "pricelist": pricelist,
            "pms_property": pms_property,
            "hotel_list": pms_property,
            "date_list": date_list,
            "dpr": dpr,
            "display_select_options": display_select_options,
            "selected_display": selected_display,
            "dpr_select_values": dpr_select_values,
            "selected_date": date_start,
            # config calendar
            "availability_plan": availability_plan,
            "default_availability_plan": default_availability_plan,
            "select_availability_plan": select_availability_plan,
            "select_pricelist": select_pricelist,
            "default_pricelist": default_pricelist,
            "rooms_list": room_types,
            "tab_pms_property": tab_pms_property,

        }
        return http.request.render(
            "pms_pwa.roomdoo_reduced_calendar_page",
            values,
        )

    @http.route(
        "/calendar/general_headers",
        type="json",
        auth="public",
        csrf=False,
        methods=["POST"],
        website=True,
    )
    def calendar_general_headers(self, **post):
        # Funtion to group by date in query sql result
        def date_func(k):
            return k[0]

        # Funtion to group by room type in query sql result
        def room_type_func(k):
            return k[1]
        dates = [item for item in eval(post.get("range_date"))]
        pms_property_id = int(post.get("data_id"))
        pms_property = request.env["pms.property"].browse(pms_property_id)
        rooms = [int(item) for item in post.get("rooms")] if post.get("rooms") else pms_property.room_ids
        room_types = rooms.room_type_id

        # Prepare data
        self.env.cr.execute(
            """
            SELECT DATE(night.date), pms_room.room_type_id, reservation.reservation_type, count(night.id)
            FROM    pms_reservation_line  night
                    LEFT JOIN pms_reservation reservation
                        ON reservation.id = night.reservation_id
                    LEFT JOIN pms_room
                        ON pms_room.id = night.room_id
                    LEFT JOIN pms_availability pms_avail
                        on pms_avail.id = night.avail_id
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
        avail_result = self.env.cr.fetchall()
        avail_result = sorted(avail_result, key=date_func)
        dict_result = {}
        for avail_date, data in groupby(avail_result, date_func):
            total_res_count = 0
            total_out_count = 0
            dict_result[avail_date] = {}
            data = list(filter(lambda x: x[1] != None, data))
            data = sorted(data, key=room_type_func)
            for room_type_id, vals in groupby(data, room_type_func):
                vals = list(vals)
                res_count = sum([x[3] for x in vals if x[2] != 'out'])
                out_count = sum([x[3] for x in vals if x[2] == 'out'])
                dict_result[avail_date][room_type_id] = {
                    'reservations_count': res_count,
                    'outs_count': out_count,
                }
                room_type = request.env["pms.room.type"].browse(room_type_id)
                if room_type.overnight_room:
                    total_res_count += res_count
                    total_out_count += out_count
            # complete estructure to avoid room types
            for room_type in room_types:
                if room_type.id not in dict_result[avail_date]:
                    dict_result[avail_date][room_type.id] = {
                        'reservations_count': 0,
                        'outs_count': 0,
                    }
            dict_result[avail_date]["property_header"] = {
                'reservations_count': total_res_count,
                'outs_count': total_out_count,
                'percent_occupied': int((total_res_count + total_out_count) * 100 / pms_property._get_total_rooms()),
                'num_avail': pms_property._get_total_rooms() - (total_res_count + total_out_count),
            }
        # complete estructure to avoid dates
        for date in dates:
            if date not in dict_result:
                dict_result[date]["property_header"] = {
                    'reservations_count': 0,
                    'outs_count': 0,
                    'percent_occupied': 0,
                    'num_avail': pms_property._get_total_rooms(),
                }
                for room_type in room_types:
                    dict_result[date][room_type.id] = {
                        'reservations_count': 0,
                        'outs_count': 0,
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
        dates = [item for item in eval(post.get("range_date"))]
        pms_property_id = int(post.get("data_id"))
        pms_property = request.env["pms.property"].browse(pms_property_id)
        pricelist_id = int(post.get("pricelist_id"))
        pricelist = request.env["product.pricelist"].browse(pricelist_id)
        rooms = [int(item) for item in post.get("rooms")] if post.get("rooms") else pms_property.room_ids
        room_types = rooms.room_type_id

        # Prepare data
        dict_result = {}
        for date in dates:
            products = [(
                r.with_context(
                    quantity=1,
                    consumption_date=date,
                    property=pms_property_id,
                ),
                1,
                False
            ) for r in room_types.product_id]
            date_prices = pricelist._compute_price_rule(products, datetime.datetime.today())
            dict_result[date] = {
                self.env["product.product"].browse(k).room_type_id.id: v[0] for k, v in date_prices.items()
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
        dates = [item for item in eval(post.get("range_date"))]
        pms_property_id = int(post.get("data_id"))
        pms_property = request.env["pms.property"].browse(pms_property_id)
        pricelist_id = int(post.get("pricelist_id"))
        pricelist = request.env["product.pricelist"].browse(pricelist_id)
        rooms = [int(item) for item in post.get("rooms")] if post.get("rooms") else pms_property.room_ids
        room_types = rooms.room_type_id
        availability_plan = pricelist.availability_plan_id

        # Prepare data
        dict_result = {}
        if availability_plan:
            self.env.cr.execute(
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
            rules_result = self.env.cr.fetchall()

            def date_func(k):
                return k[0]

            def room_type_func(k):
                return k[1]

            rules_result = sorted(rules_result, key=date_func)
            for rule_date, data in groupby(rules_result, date_func):
                dict_result[rule_date] = {}
                data = list(filter(lambda x: x[1] != None, data))
                data = sorted(data, key=room_type_func)
                for room_type_id, vals in groupby(data, room_type_func):
                    vals = list(vals)[0]
                    dict_result[rule_date][room_type_id] = {
                        'min_stay': vals[2],
                        'closed': vals[3],
                        'quota': vals[4],
                        'max_avail': vals[5],
                        'plan_avail': vals[6],
                        'other': 1 if any(vals[7:]) else 0,
                    }
                # complete estructure to avoid room types
                for room_type in room_types:
                    if room_type.id not in dict_result[rule_date]:
                        dict_result[rule_date][room_type_id] = {
                            'min_stay': 0,
                            'closed': 0,
                            'quota': -1,
                            'max_avail': -1,
                            'plan_avail': -1,  # TODO:calcular dispo real en el front?
                            'other': 0,
                        }
        # complete estructure to avoid dates
        for date in dates:
            if date not in dict_result:
                dict_result[date] = {}
                for room_type in room_types:
                    dict_result[date][room_type.id] = {
                        'min_stay': 0,
                        'closed': 0,
                        'quota': -1,
                        'max_avail': -1,
                        'plan_avail': -1,  # TODO:calcular dispo real en el fron?
                        'other': 0,
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
        change_checkin = False
        change_room = False
        splitted = False
        reservation = request.env["pms.reservation"].browse(int(post["id"]))
        new_checkin = datetime.datetime.strptime(
            post.get("date"), get_lang(request.env).date_format
        ).date()
        new_room = request.env["pms.room"].browse(int(post["room"]))
        if reservation.splitted:
            splitted = True
        if new_checkin != reservation.checkin:
            change_checkin = True
        if new_room != reservation.preferred_room_id:
            change_room = True
        print(" ---> ", post.get("submit"))
        if not post.get("submit"):
            if change_room and change_checkin:
                _logger.info("Change ALL")
                confirmation_mens = ("Modificar la reserva de %s a la habitación %s con checkin %s",
                                    reservation.partner_name, new_room.display_name, new_checkin)
                # If new room isn't free in new dates no change
                # Change Prices??
            elif change_room:
                _logger.info("Change Only ROOM")
                confirmation_mens = ("Modificar la reserva de %s a la habitación %s  con checkin %s",
                                    reservation.partner_name, new_room.display_name, new_checkin)
                # If new room isn't free, Swap reservations??
            elif change_checkin:
                _logger.info("Change only Checkin")
                confirmation_mens = ("Modificar la fecha de entrada de %s a %s",
                                    reservation.partner_name, new_checkin)
                # Change Prices?
            print("--->", post)
            return {"result": "success", "message": confirmation_mens, "date": post["date"], "reservation": post["id"], "room": post["room"] }
        else:
            old_room = reservation.preferred_room_id
            reservation.checkin = new_checkin
            reservation.preferred_room_id = new_room
            return {"result": "success", "reservation": post['id'], "old_group_room": old_room.id, "new_group_room": new_room.id}
        # return True
