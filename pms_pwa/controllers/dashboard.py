# Part of Odoo. See LICENSE file for full copyright and licensing details.

# -*- coding: utf-8 -*-

from inspect import isdatadescriptor
import logging
import pprint
from calendar import monthrange

from odoo import _, fields, http
from odoo.http import request
from odoo.tools.misc import get_lang

from odoo.addons.web.controllers.main import Home

pp = pprint.PrettyPrinter(indent=4)

_logger = logging.getLogger(__name__)


class DashBoard(http.Controller):
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

