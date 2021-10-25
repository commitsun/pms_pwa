# Part of Odoo. See LICENSE file for full copyright and licensing details.

# -*- coding: utf-8 -*-

from inspect import isdatadescriptor
import logging
import pprint
import json
from calendar import monthrange
from datetime import timedelta
import datetime
from odoo import _, fields, http
from odoo.http import request
from odoo.tools.misc import get_lang

pp = pprint.PrettyPrinter(indent=4)

_logger = logging.getLogger(__name__)


class PmsCalendarConfig(http.Controller):
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
        # get the days of the month
        month_days = monthrange(date.year, date.month)[1]
        dpr = month_days
        if post.get("dpr") and post.get("dpr").isnumeric():
            dpr = int(post.get("dpr"))
        date_list = [date_start + timedelta(days=x) for x in range(dpr)]

        dpr_select_values = {7, 15, month_days}

        pms_property_id = request.env.user.pms_pwa_property_id.id

        Room = request.env["pms.room"]
        rooms = Room.search([
            ("pms_property_id", "=", pms_property_id)
        ], order="sequence")
        room_type_ids = rooms.mapped("room_type_id.id")
        room_types = request.env["pms.room.type"].search([
            ("id", "in", room_type_ids),
        ], order="sequence")

        Pricelist = request.env["product.pricelist"]

        pricelist = Pricelist.search(
            [
                "|",
                ("pms_property_ids", "=", False),
                ("pms_property_ids", "in", pms_property_id),
                ('pricelist_type', '=', 'daily')
            ]
        )
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
            "page_name": "Calendar config",
            "pricelist": pricelist,
            "default_pricelist": default_pricelist,
            "select_pricelist": select_pricelist,
            "availability_plan": availability_plan,
            "default_availability_plan": default_availability_plan,
            "select_availability_plan": select_availability_plan,
            "rooms_list": room_types,
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
            pms_property_id = request.env.user.pms_pwa_property_id.id
            _logger.info(params)
            for room_type_id, pricelists in params["send"]["room_type"].items():
                room_type = request.env["pms.room.type"].browse(int(room_type_id))
                for pricelist_id, dates in pricelists["pricelist_id"].items():
                    pricelist = request.env["product.pricelist"].browse(
                        int(pricelist_id)
                    )
                    for date_str, items in dates["date"].items():
                        item_date = datetime.datetime.strptime(
                            date_str, get_lang(request.env).date_format
                        ).date()
                        availability_plan = request.env['pms.availability.plan'].browse(
                            int(params["send"]["availability_plan"])
                        )
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
                            if "max_avail" in items[0]:
                                avail_vals["max_avail"] = int(items[0]["max_avail"])
                            if "min_stay" in items[0]:
                                avail_vals["min_stay"] = int(items[0]["min_stay"])
                            if "max_stay" in items[0]:
                                avail_vals["max_stay"] = int(items[0]["max_stay"])
                            if "closed" in items[0]:
                                avail_vals["closed"] = bool(items[0]["closed"])
                            if "closed_arrival" in items[0]:
                                avail_vals["closed"] = bool(items[0]["closed_arrival"])
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
