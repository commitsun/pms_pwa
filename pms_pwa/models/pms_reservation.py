# Copyright 2017  Dario Lodeiros
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import json

from odoo import _, api, fields, models


class PmsReservation(models.Model):
    _inherit = "pms.reservation"

    pwa_action_buttons = fields.Char(compute="_compute_pwa_action_buttons")

    # REVIEW:store = true?
    def _compute_pwa_action_buttons(self):
        """ Return ordered button list, where the first button is
        the preditive action, the next are active actions:
        - "Assign":     Predictive: Reservation by assign
                        Active- Idem
        - "checkin":    Predictive- state 'confirm' and checkin day
                        Active- Idem and assign
        - "checkout":   Predictive- Pay, onboard and checkout day
                        Active- Onboard and checkout day
        - "Pay":        Predictive- Onboard and pending amount > 0
                        Active- pending amount > 0
        - "Invoice":    Predictive- qty invoice > 0, onboard, pending amount = 0
                        Active- qty invoice > 0
        - "Cancel":     Predictive- Never
                        Active- state in draft, confirm, onboard, full onboard
        """
        buttons = {
            "Assign": "/assign",
            "Checkin": "/check-in",
            "Checkout": "/check-out",
            "Payment": "/pay",
            "Invoice": "/invoice",
            "Cancel": "/cancel",
        }
        for reservation in self:
            active_buttons = {}
            for k, v in buttons.items():
                # TODO: Logic buttons reservation
                active_buttons[k] = v
            reservation.pwa_action_buttons = json.dumps(active_buttons)

    def _get_reservation_services(self):
        """
        @return: Return dict with services,
        if normal service return only qty, if service per day
         return subdict with dates and qty per date
         {
            'service_per_day_id': {
                'name': 'service name',
                'lines': [
                    {"date": date, "qty": product_qty},
                    {"date": date, "qty": product_qty},
                    ]
                },
            'service_normal_id': {
                'name': 'service name',
                'qty': product_qty
                },
            'service_per_day_id': {
                'name': 'service name',
                'lines': [
                    {"date": date, "qty": product_qty},
                    {"date": date, "qty": product_qty},
                    ]
                },
         }
        """
        self.ensure_one()
        reservation_extra = {}
        for service in self.service_ids:
            if service.per_day:
                reservation_extra[service.id] = {}
                reservation_extra[service.id]["name"] = service.name
                lines = []
                for line in service.service_line_ids:
                    lines.append(
                        {"date": line.date, "day_qty": line.day_qty,}
                    )
                reservation_extra[service.id]["lines"] = lines
            else:
                reservation_extra[service.id] = {
                    "name": service.name,
                    "product_qty": service.product_qty,
                }
        return reservation_extra

    def _get_reservation_line_ids(self):
        """
        @return: Return dict with nights, price, discount
         [
          {"date": date, "price": price, "discount": discount},
          {"date": date, "price": price, "discount": discount},
          ...
          {"date": date, "price": price, "discount": discount},
         ]
        """
        self.ensure_one()
        reservation_lines = []
        for line in self.reservation_line_ids:
            reservation_lines.append(
                {"date": line.date, "price": line.price, "discount": line.discount,}
            )
            # TODO: Splitted Reservations has different rooms at line
            # TODO: Cancel Discount, calculate on discount or send separately??)
        return reservation_lines

    @api.model
    def _get_allowed_rooms(
        self, checkin, checkout, state, overbooking=False, line_ids=False
    ):
        # TODO: Refact with pms base _compute_allowed_room_ids?,
        """
        @return: [0] Return list with free rooms
         [
          {"id": id, "name": "room_name"},
          {"id": id, "name": "room_name"},
          ... ,
          {"id": id, "name": "room_name"},
         ]
         and [1] list with free room types
         [
          {"id": id, "name": "room_name", "code_type": "code", "availability": qty},
          {"id": id, "name": "room_name", "code_type": "code", "availability": qty},
          ... ,
          {"id": id, "name": "room_name", "code_type": "code", "availability": qty},
         ]
        """
        if checkin and checkout:
            if overbooking or state in ("cancelled"):
                rooms_available = self.env["pms.room"].search([])
            else:
                rooms_available = self.env[
                    "pms.room.type.availability"
                ].rooms_available(
                    checkin=checkin,
                    checkout=checkout,
                    room_type_id=False,  # Allow chosen any available room
                    current_lines=line_ids,
                )
            allowed_rooms = []
            for room in rooms_available:
                allowed_rooms.append(
                    {"id": room.id, "name": room.name,}
                )
            allowed_room_types = []
            for room_type_id in rooms_available.mapped("room_type_id.id"):
                room_type = self.env["pms.room.type"].browse(room_type_id)
                allowed_room_types.append(
                    {
                        "id": room_type.id,
                        "name": room_type.name,
                        "code_type": room_type.code_type,
                        "availability": len(
                            rooms_available.filtered(
                                lambda r: r.room_type_id.id == room_type_id
                            )
                        ),
                    }
                )
            return allowed_rooms, allowed_room_types

    @api.model
    def _get_allowed_extras(self, partner=False, pricelist=False):
        """
        @return: Return dict with list main extras and secondary extras
        {
             main_extras: [
                {'id': id, 'name': name, 'per_day': Boolean, 'unit_price': Float}
                {'id': id, 'name': name, 'per_day': Boolean, 'unit_price': Float}
                {'id': id, 'name': name, 'per_day': Boolean, 'unit_price': Float}
             ]
             secondary_extras: [
                {'id': id, 'name': name, 'per_day': Boolean, 'unit_price': Float}
                {'id': id, 'name': name, 'per_day': Boolean, 'unit_price': Float}
                ...
                {'id': id, 'name': name, 'per_day': Boolean, 'unit_price': Float}
             ]
        }
        """
        products = self.env["product.product"].search(
            [
                ("sale_ok", "=", True),
                ("id", "not in", self.env["pms.room.type"].mapped("product_id.id")),
            ]
        )
        # TODO: Sort product by sales count (compute field on product?)
        allowed_extras = {"main_extras": [], "secondary_extras": []}
        max_main_extras = 3
        main_count_extras = 0
        for product in products:
            product = product.with_context(
                lang=partner.lang,
                partner=partner.id,
                quantity=1,
                date=fields.Date.today(),
                # TODO: Pricelist default on property
                pricelist=pricelist
                or self.env["product.pricelist"].search(
                    [
                        "|",
                        ("company_id", "=", False),
                        ("company_id", "=", self.env.company.id),
                    ],
                    limit=1,
                ),
                uom=product.uom_id.id,
                # TODO: Property -to pricelist property rules-
            )
            if main_count_extras <= max_main_extras:
                main_count_extras += 1
                allowed_extras["main_extras"].append(
                    {
                        "id": product.id,
                        "name": product.name,
                        "per_day": product.per_day,
                        "unit_price": product.price,
                    }
                )
            else:
                allowed_extras["secondary_extras"].append(
                    {
                        "id": product.id,
                        "name": product.name,
                        "per_day": product.per_day,
                        "unit_price": product.price,
                    }
                )
        return allowed_extras
