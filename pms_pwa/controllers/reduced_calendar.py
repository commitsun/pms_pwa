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
        obj_list = request.env.user.pms_pwa_property_ids

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
            "hotel_list": obj_list,
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
        }
        return http.request.render(
            "pms_pwa.roomdoo_reduced_calendar_page",
            values,
        )

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
