# Part of Odoo. See LICENSE file for full copyright and licensing details.

# -*- coding: utf-8 -*-

from inspect import isdatadescriptor
import logging
import pprint
from calendar import monthrange
import datetime
from odoo.tools.misc import get_lang
from dateutil.relativedelta import relativedelta

from odoo import _, fields, http
from odoo.http import request

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

        date = datetime.datetime.today()
        date_one_day = date + datetime.timedelta(days=1)

        graph_date_from = datetime.datetime.today()
        graph_date_to = graph_date_from + datetime.timedelta(days=15)

        pms_property_id = request.env.user.pms_pwa_property_id.id
        property = request.env["pms.property"].browse(pms_property_id)

        channels = request.env["pms.sale.channel"].search([
            '|',
            ("pms_property_ids", "in", pms_property_id),
            ("pms_property_ids", "=", False),
        ])

        values.update(
            {
                # Cambios documento
                "cash_balance": self._get_cash_balance(int(list(self._get_journals_cash(pms_property_id).keys())[0])),
                "cash": {
                    "status": self._get_status_journal(int(list(self._get_journals_cash(pms_property_id).keys())[0])),
                    "coins": {
                        "500": 0,
                        "200": 0,
                        "100": 0,
                        "50": 0,
                        "20": 0,
                        "10": 0,
                        "5": 0,
                        "2": 0,
                        "1": 0,
                        "0.5": 0,
                        "0.2": 0,
                        "0.1": 0,
                        "0.05": 0,
                        "0.02": 0,
                        "0.01": 0,

                    },
                    "list": self._get_journals_cash(pms_property_id),
                    "selected": list(self._get_journals_cash(pms_property_id).keys())[0],
                    "date": date.strftime(get_lang(request.env).date_format),
                    "payments": self._get_payments(int(list(self._get_journals_cash(pms_property_id).keys())[0]), date),
                },
                "bank_journals": {
                    "list": self._get_journals_bank(pms_property_id),
                    "selected": list(self._get_journals_bank(pms_property_id).keys())[0],
                    "date": date.strftime(get_lang(request.env).date_format),
                    "payments": self._get_payments(int(list(self._get_journals_bank(pms_property_id).keys())[0]), date)
                },
                # Fin cambio documento
                "tasks": _get_user_activities(
                    request.session.uid if request.session.uid else False
                ),
                "arrivals": {
                    "today": {
                        "date": date.strftime(get_lang(request.env).date_format),
                        "to_arrive": len(self.dash_checkins(date, pms_property_id)),
                        "to_check_in": len(self.dash_left_checkins(date, pms_property_id)),
                    },
                    "tomorrow": {
                        "date": date_one_day.strftime(get_lang(request.env).date_format),
                        "to_arrive": len(self.dash_checkins(date_one_day, pms_property_id)),
                    },
                },
                "departures": {
                    "today": {
                        "date": date.strftime(get_lang(request.env).date_format),
                        "to_leave": len(self.dash_checkouts(date, pms_property_id)),
                        "to_check_out": len(self.dash_left_checkouts(date, pms_property_id)),
                    },
                    "tomorrow": {
                        "date": date_one_day.strftime(get_lang(request.env).date_format),
                        "to_leave": len(self.dash_checkouts(date_one_day, pms_property_id)),
                    },
                },
                "rooms": {
                    "date": date.strftime(get_lang(request.env).date_format),
                    "available": property.with_context(
                        checkin=date, checkout=date_one_day).availability,
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
                        "name": "Ocupación",
                        "selector": "ocupation",
                        "labels": self.get_graph_labels(graph_date_from, graph_date_to),
                        "label_1": graph_date_from.strftime("%Y"),
                        "data_1": self._get_graph_ocupation(graph_date_from, graph_date_to, pms_property_id),
                        "backgroundColor_1": "#E5F8FC",
                        "borderColor_1": "#00B5E2",
                        "label_2": (graph_date_from - relativedelta(years=1)).strftime("%Y"),
                        "data_2": self._get_graph_ocupation(
                            graph_date_from - relativedelta(years=1),
                            graph_date_to - relativedelta(years=1),
                            pms_property_id,
                        ),
                        "backgroundColor_2": "#CEF2E8",
                        "borderColor_2": "#00BA39",
                    },
                    {
                        "name": "Ingresos",
                        "selector": "revenue",
                        "labels": self.get_graph_labels(graph_date_from, graph_date_to),
                        "label_1": graph_date_from.strftime("%Y"),
                        "data_1": self._get_graph_revenue(graph_date_from, graph_date_to, pms_property_id),
                        "backgroundColor_1": "#E5F8FC",
                        "borderColor_1": "#00B5E2",
                        "label_2": (graph_date_from - relativedelta(years=1)).strftime("%Y"),
                        "data_2": self._get_graph_revenue(
                            graph_date_from - relativedelta(years=1),
                            graph_date_to - relativedelta(years=1),
                            pms_property_id,
                        ),
                        "backgroundColor_2": "#CEF2E8",
                        "borderColor_2": "#00BA39",
                    },
                    {
                        "name": "Facturación",
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
                ],
                "kpis": [
                    {
                        "name": "Ocupación",
                        "labels": "Llegadas,Salidas,Fuera de Servicio",
                        "label": "",
                        "data": self._get_kpi_ocupation(graph_date_from, graph_date_to, pms_property_id),
                        "backgroundColor": "#FF5733,#B5BFBD,#00B5E2",
                        "borderColor": "#FF5733,#B5BFBD,#00B5E2",
                        "ratio": self._get_kpi_ocupation_score(graph_date_from, graph_date_to, pms_property_id),
                    },
                    {
                        "name": "Reservas por canal",
                        "labels": ",".join(channels.mapped("name")),
                        "label": "",
                        "data": self._get_channel_reservations(channels, graph_date_from, graph_date_to, pms_property_id),
                        "backgroundColor": "#FF5733,#B5BFBD,#00B5E2",
                        "borderColor": "#FF5733,#B5BFBD,#00B5E2",
                        "ratio": self._get_channel_reservations_score(channels, graph_date_from, graph_date_to, pms_property_id),
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
                        "value": "Año Anterior",
                    },
                    {
                        "id": 2,
                        "value": "Hace dos años",
                    },
                ],
            }
        )

        return http.request.render("pms_pwa.roomdoo_dashboard_page", values)

    def dash_checkins(self, date, pms_property_id):
        checkins = request.env["pms.reservation"].search([
            ("checkin", "=", date),
            ("state", "!=", "cancel"),
            ("reservation_type", "!=", "out"),
            ("pms_property_id", "=", pms_property_id),
        ])
        return checkins

    def dash_checkouts(self, date, pms_property_id):
        checkouts = request.env["pms.reservation"].search([
            ("checkout", "=", date),
            ("state", "!=", "cancel"),
            ("reservation_type", "!=", "out"),
            ("pms_property_id", "=", pms_property_id),
        ])
        return checkouts

    def dash_left_checkins(self, date, pms_property_id):
        checkins = request.env["pms.reservation"].search([
            ("checkin", "<=", date),
            ("state", "in", ("draft", "confirm", "arrival_delayed")),
            ("reservation_type", "!=", "out"),
            ("pms_property_id", "=", pms_property_id),
        ])
        return checkins

    def dash_left_checkouts(self, date, pms_property_id):
        checkouts = request.env["pms.reservation"].search([
            ("checkout", "=", date),
            ("state", "not in", ("cancel", "done")),
            ("reservation_type", "!=", "out"),
            ("pms_property_id", "=", pms_property_id),
        ])
        return checkouts

    def get_graph_labels(self, date_from, date_to):
        labels = []
        for day in range(0, (date_to - date_from).days + 1):
            date = date_from + datetime.timedelta(days=day)
            labels.append(date.strftime("%d %b"))
        return ",".join(labels)

    def _get_graph_ocupation(self, date_from, date_to, pms_property_id):
        domain = [
            ("date", ">=", date_from),
            ("date", "<=", date_to),
            ("state", "!=", "cancel"),
            ("reservation_id.reservation_type", "!=", "out"),
            ("pms_property_id", "=", pms_property_id),
        ]
        ocupation_data = request.env["pms.reservation.line"].read_group(
            domain,
            ["date"],
            ["date:day"],
            lazy=False,
        )
        mapped_data = dict([(data['date:day'], data['__count']) for data in ocupation_data])
        graph_data = ",".join(map(str, mapped_data.values()))
        return graph_data

    def _get_graph_revenue(self, date_from, date_to, pms_property_id):
        domain = [
            ("checkout", ">=", date_from),
            ("checkout", "<=", date_to),
            ("state", "!=", "cancel"),
            ("reservation_type", "not in", ("out", "staff")),
            ("pms_property_id", "=", pms_property_id),
        ]
        revenues_data = request.env["pms.reservation"].read_group(
            domain,
            ["price_room_services_set:sum"],
            ["checkout:day"],
            lazy=False,
        )
        mapped_data = dict([(data['checkout:day'], data['price_room_services_set']) for data in revenues_data])
        graph_data = ",".join(map(str, mapped_data.values()))
        return graph_data

    def _get_kpi_ocupation(self, date_from, date_to, pms_property_id):
        data = []
        data.append(request.env["pms.reservation"].search_count([
            ("checkin", ">=", date_from),
            ("checkin", "<=", date_to),
            ("state", "!=", "cancel"),
            ("reservation_type", "!=", "out"),
            ("pms_property_id", "=", pms_property_id),
        ]))
        data.append(request.env["pms.reservation"].search_count([
            ("checkout", ">=", date_from),
            ("checkout", "<=", date_to),
            ("state", "!=", "cancel"),
            ("reservation_type", "!=", "out"),
            ("pms_property_id", "=", pms_property_id),
        ]))
        data.append(request.env["pms.reservation"].search_count([
            ("state", "!=", "cancel"),
            ("reservation_type", "=", "out"),
            ("pms_property_id", "=", pms_property_id),
            "|",
            "&",
            ("checkin", ">=", date_from),
            ("checkin", "<=", date_to),
            "&",
            ("checkout", ">=", date_from),
            ("checkout", "<=", date_to),
        ]))
        return ",".join(map(str, data))

    def _get_kpi_ocupation_score(self, date_from, date_to, pms_property_id):
        return request.env["pms.reservation"].search_count([
            ("state", "!=", "cancel"),
            ("pms_property_id", "=", pms_property_id),
            "|",
            "&",
            ("checkin", ">=", date_from),
            ("checkin", "<=", date_to),
            "&",
            ("checkout", ">=", date_from),
            ("checkout", "<=", date_to),
        ])

    def _get_channel_reservations(self, channels, date_from, date_to, pms_property_id):
        domain = [
            ("checkin", ">=", date_from),
            ("checkin", "<=", date_to),
            ("state", "!=", "cancel"),
            ("reservation_type", "!=", "out"),
            ("pms_property_id", "=", pms_property_id),
        ]
        reservations = request.env["pms.reservation"].search(domain)
        channels_data = []
        for channel in channels:
            channels_data.append(len(reservations.filtered(lambda r: r.channel_type_id.id == channel.id)))
        return ",".join(map(str, channels_data))

    def _get_channel_reservations_score(self, channels, date_from, date_to, pms_property_id):
        domain = [
            ("checkin", ">=", date_from),
            ("checkin", "<=", date_to),
            ("state", "!=", "cancel"),
            ("reservation_type", "!=", "out"),
            ("channel_type_id", "in", channels.ids),
            ("pms_property_id", "=", pms_property_id),
        ]
        return request.env["pms.reservation"].search_count(domain)

    def _get_payments(self, journal_id, date):
        payments = (
            request.env["account.payment"]
            .sudo()
            .search(
                [
                    ("journal_id", "=", journal_id),
                    ("date", "=", date),
                ]
            )
        )
        payment_vals = []
        for line in payments:
            payment_vals.append({
                "id": line.id,
                "partner_id": line.partner_id and line.partner_id.id,
                "partner_name": line.partner_id and line.partner_id.name,
                "simple_name": line.ref or "No indicado",
                "name": line.ref or "No indicado" + " el " + line.create_date.strftime("%d %b - %H:%M") + " (" + line.create_uid.name + ")",
                "amount": line.amount if line.payment_type == "inbound" else -line.amount,
            })
        return payment_vals

    def _get_cash_balance(self, journal_id):
        statement = (
            request.env["account.bank.statement"]
            .sudo()
            .search(
                [
                    ("journal_id", "=", journal_id),
                    ("state", "=", "open"),
                    ("date", "=", fields.Date.today()),
                ], limit=1
            )
        )
        if not statement:
            statement = (
                request.env["account.bank.statement"]
                .sudo()
                .search(
                    [
                        ("journal_id", "=", journal_id),
                    ], limit=1
                )
            )
        return statement.balance_end

    def _get_journals_cash(self, pms_property_id):

        journals = (
            request.env["account.journal"]
            .sudo()
            .search(
                [
                    ("type", "=", "cash"),
                    ("pms_property_ids", "in", pms_property_id),
                ]
            )
        )
        data_journals = {}
        if not journals:
            data_journals["0"] = ""
            return data_journals
        for journal in journals:
            data_journals[str(journal.id)] = journal.name
        return data_journals

    def _get_journals_bank(self, pms_property_id):
        journals = (
            request.env["account.journal"]
            .sudo()
            .search(
                [
                    ("type", "=", "bank"),
                    ("pms_property_ids", "in", pms_property_id),
                ]
            )
        )
        data_journals = {}
        if not journals:
            data_journals["0"] = ""
            return data_journals
        for journal in journals:
            data_journals[str(journal.id)] = journal.name
        return data_journals

    def _get_status_journal(self, journal_id):
        statement = (
            request.env["account.bank.statement"]
            .sudo()
            .search(
                [
                    ("journal_id", "=", journal_id),
                    ("date", "=", datetime.datetime.today()),
                    ("balance_end_real", "=", 0),
                ]
            )
        )
        if statement:
            return "close"
        else:
            return "open"

    @http.route(
        "/dashboard/cash_journal",
        type="json",
        auth="public",
        csrf=False,
        methods=["POST"],
        website=True,
    )
    def dashboard_cash_journal(self, **post):
        # en post tiene que llegar diario y fecha
        print(post)
        journal_id = int(post.get("journal_id"))
        journal_date = datetime.datetime.strptime(
            post.get("journal_date"), get_lang(request.env).date_format
        ).date()
        pms_property_id = request.env.user.pms_pwa_property_id.id
        values = {}
        values.update({
            "cash": {
                "status": self._get_status_journal(journal_id),
                "coins": {
                    "500": 0,
                    "200": 0,
                    "100": 0,
                    "50": 0,
                    "20": 0,
                    "10": 0,
                    "5": 0,
                    "2": 0,
                    "1": 0,
                    "0.5": 0,
                    "0.2": 0,
                    "0.1": 0,
                    "0.05": 0,
                    "0.02": 0,
                    "0.01": 0,

                },
                "list": self._get_journals_cash(pms_property_id),
                "selected": journal_id,
                "date": journal_date,
                "payments": self._get_payments(journal_id, journal_date),
            },
        })
        return values

    @http.route(
        "/dashboard/bank_journals",
        type="json",
        auth="public",
        csrf=False,
        methods=["POST"],
        website=True,
    )
    def dashboard_bank_journals(self, **post):
        # en post tiene que llegar diario y fecha
        print(post)
        journal_id = int(post.get("journal_id"))
        journal_date = datetime.datetime.strptime(
            post.get("journal_date"), get_lang(request.env).date_format
        ).date()
        pms_property_id = request.env.user.pms_pwa_property_id.id
        values = {}
        values.update({
            "bank_journals": {
                "list": self._get_journals_bank(pms_property_id),
                "selected": journal_id,
                "date": journal_date,
                "payments": self._get_payments(journal_id, journal_date),
            },
        })
        return values
