# Copyright 2017  Dario Lodeiros
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import datetime

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class PmsPWARoomType(models.Model):
    _inherit = "pms.room.type"

    def _get_total_rooms(self, pms_property_id):
        return len(
            self.room_ids.filtered(lambda r: r.pms_property_id.id == pms_property_id)
        )

    def _get_availability_rooms(self, pms_property_id):
        avail = 0
        if self._context.get("checkin") and self._context.get("checkout"):
            pms_property = self.env["pms.property"].browse(pms_property_id)
            pms_property = pms_property.with_context(
                checkin=self._context.get("checkin"),
                checkout=self._context.get("checkout"),
                room_type_id=self.id,
                pricelist_id=self._context.get("pricelist_id") or False,
            )
            avail = pms_property.availability

        return avail

    def _get_occupied_rooms(self, pms_property_id):
        if self._context.get("checkin") and self._context.get("checkout"):
            room_ids = self.room_ids.filtered(
                lambda r: r.pms_property_id.id == pms_property_id
            ).ids
            return len(
                self.env["pms.availability"].get_rooms_not_avail(
                    checkin=self._context.get("checkin"),
                    checkout=self._context.get("checkout"),
                    room_ids=room_ids,
                    pms_property_id=pms_property_id,
                )
            )

    def _get_occupied_reservations(self, pms_property_id):
        if self._context.get("checkin") and self._context.get("checkout"):
            room_ids = self.room_ids.filtered(
                lambda r: r.pms_property_id.id == pms_property_id
            ).ids
            return len(
                self.env["pms.reservation.line"]
                .search(
                    [
                        ("date", ">=", self._context.get("checkin")),
                        (
                            "date",
                            "<=",
                            self._context.get("checkout") - datetime.timedelta(1),
                        ),
                        ("room_id", "in", room_ids),
                        ("pms_property_id", "=", pms_property_id),
                        ("occupies_availability", "=", True),
                        ("reservation_id.reservation_type", "!=", "out"),
                    ]
                )
                .mapped("reservation_id.id")
            )

    def _get_sale_avail(self):
        if (
            self._context.get("date")
            and self._context.get("pms_property_id")
            and self._context.get("pricelist_id")
            and self._context.get("availability_plan_id")
        ):

            rule = self.env["pms.availability.plan.rule"].search(
                [
                    ("pms_property_id", "=", self._context.get("pms_property_id")),
                    ("date", "=", self._context.get("date")),
                    (
                        "availability_plan_id",
                        "=",
                        self._context.get("availability_plan_id"),
                    ),
                    ("room_type_id", "=", self.id),
                ]
            )
            real_avail = self.with_context(
                checkin=self._context.get("date"),
                checkout=self._context.get("date") + datetime.timedelta(days=1),
            )._get_availability_rooms(self._context.get("pms_property_id"))
            if not rule:
                quota = self.default_quota
                max_avail = self.default_max_avail
                return min(
                    [
                        max_avail if max_avail >= 0 else real_avail,
                        quota if quota >= 0 else real_avail,
                        real_avail,
                    ]
                )
            else:
                return rule.plan_avail

    def _get_occupied_out_service(self, pms_property_id):
        if self._context.get("checkin") and self._context.get("checkout"):
            room_ids = self.room_ids.filtered(
                lambda r: r.pms_property_id.id == pms_property_id
            ).ids
            return len(
                self.env["pms.reservation.line"]
                .search(
                    [
                        ("date", ">=", self._context.get("checkin")),
                        (
                            "date",
                            "<=",
                            self._context.get("checkout") - datetime.timedelta(1),
                        ),
                        ("room_id", "in", room_ids),
                        ("pms_property_id", "=", pms_property_id),
                        ("occupies_availability", "=", True),
                        ("reservation_id.reservation_type", "=", "out"),
                    ]
                )
                .mapped("reservation_id.id")
            )

    @api.model
    def _get_allowed_board_service_room_ids(self, room_type_id, pms_property_id):
        board_services = self.env["pms.board.service.room.type"].search(
            [
                ("pms_room_type_id", "=", room_type_id),
                ("pms_property_id", "=", pms_property_id),
            ]
        )
        allowed_board_services = [
            {
                "id": False,
                "name": "",
            }
        ]
        for board_service in board_services.pms_board_service_id:
            allowed_board_services.append(
                {
                    "id": board_service.id,
                    "name": board_service.name,
                }
            )
        return allowed_board_services if allowed_board_services else False

    def _get_rules_date(self):
        # TODO: Modificado por Alejandro, date, pricelist_id, pms_property_id):
        self.ensure_one()

        if (
            self._context.get("date")
            and self._context.get("pms_property_id")
            and self._context.get("pricelist_id")
            and self._context.get("availability_plan_id")
        ):

            rule = self.env["pms.availability.plan.rule"].search(
                [
                    ("pms_property_id", "=", self._context.get("pms_property_id")),
                    ("date", "=", self._context.get("date")),
                    (
                        "availability_plan_id",
                        "=",
                        self._context.get("availability_plan_id"),
                    ),
                    ("room_type_id", "=", self.id),
                ]
            )
            avail = self.with_context(
                checkin=self._context.get("date"),
                checkout=self._context.get("date") + datetime.timedelta(days=1),
            )._get_availability_rooms(self._context.get("pms_property_id"))
            if not rule:
                quota = self.default_quota
                max_avail = self.default_max_avail
                return {
                    "plan_avail": avail,
                    "quota": quota,
                    "max_avail": max_avail,
                    "real_avail": avail,
                    "min_stay": "",
                    "min_stay_arrival": "",
                    "max_stay": "",
                    "max_stay_arrival": "",
                    "closed": False,
                    "closed_departure": False,
                    "closed_arrival": False,
                    "no_ota": False,
                }
            else:
                quota = "∞" if rule.quota == -1 else rule.quota
                max_avail = "∞" if rule.max_avail == -1 else rule.max_avail
                return {
                    "plan_avail": rule.plan_avail if rule else avail,
                    "quota": quota,
                    "max_avail": max_avail,
                    "real_avail": rule.real_avail if rule else avail,
                    "min_stay": rule.min_stay if rule else "",
                    "min_stay_arrival": rule.min_stay_arrival if rule else "",
                    "max_stay": rule.max_stay if rule else "",
                    "max_stay_arrival": rule.max_stay_arrival if rule else "",
                    "closed": rule.closed if rule else "",
                    "closed_departure": rule.closed_departure if rule else "",
                    "closed_arrival": rule.closed_arrival if rule else "",
                    # TODO "no_ota": False,
                }

        return False
