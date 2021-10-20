# Copyright 2017  Dario Lodeiros
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import datetime

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class PmsPWARoomType(models.Model):
    _inherit = "pms.room.type"

    def _get_total_rooms(self, pms_property_id):
        return len(self.room_ids.filtered(lambda r: r.pms_property_id.id == pms_property_id))

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
            return len(self.env["pms.availability"].get_rooms_not_avail(
                checkin=self._context.get("checkin"),
                checkout=self._context.get("checkout"),
                room_ids=room_ids,
                pms_property_id=pms_property_id,
            ))


    @api.model
    def _get_allowed_board_service_room_ids(self, room_type_id, pms_property_id):
        board_services = self.env["pms.board.service.room.type"].search(
            [
                ("pms_room_type_id", "=", room_type_id),
                "|",
                ("pms_property_ids", "=", False),
                ("pms_property_ids", "in", pms_property_id),
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
                    ("availability_plan_id", "=", self._context.get("availability_plan_id")),
                    ("room_type_id", "=", self.id)
                ]
            )
            if not rule:
                avail = self.with_context(
                    checkin=self._context.get("date"),
                    checkout=self._context.get("date") + datetime.timedelta(days=1),
                )._get_availability_rooms(self._context.get("pms_property_id"))
            return {
                "plan_avail": rule.plan_avail if rule else avail,
                "quota": rule.quota if rule else False,
                "max_avail": rule.max_avail if rule else False,
                "real_avail": rule.real_avail if rule else avail,
                "min_stay": rule.min_stay if rule else False,
                "min_stay_arrival": rule.min_stay_arrival if rule else False,
                "max_stay": rule.max_stay if rule else False,
                "max_stay_arrival": rule.max_stay_arrival if rule else False,
                "closed": rule.closed if rule else False,
                "closed_departure": rule.closed_departure if rule else False,
                "closed_arrival": rule.closed_arrival if rule else False,
                # TODO "no_ota": False,
            }

        return False
