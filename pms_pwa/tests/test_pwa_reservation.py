import datetime
import json

from freezegun import freeze_time

from odoo import fields
from odoo.exceptions import ValidationError
from .common import TestHotel


class TestPwaReservation(TestHotel):
    def create_common_scenario(self):
        # create a room type availability
        self.room_type_availability = self.env[
            "pms.room.type.availability.plan"
        ].create({"name": "Availability plan for TEST"})

        # create a property
        self.property = self.env["pms.property"].create(
            {
                "name": "MY PMS TEST",
                "company_id": self.env.ref("base.main_company").id,
                "default_pricelist_id": self.env.ref("product.list0").id,
            }
        )

        # create room type class
        self.room_type_class = self.env["pms.room.type.class"].create({"name": "Room"})

        # create room type
        self.room_type_double = self.env["pms.room.type"].create(
            {
                "pms_property_ids": [self.property.id],
                "name": "Double Test",
                "code_type": "DBL_Test",
                "class_id": self.room_type_class.id,
            }
        )
        # create room
        self.room1 = self.env["pms.room"].create(
            {
                "pms_property_id": self.property.id,
                "name": "Double 101",
                "room_type_id": self.room_type_double.id,
                "capacity": 2,
            }
        )

        # create room
        self.room2 = self.env["pms.room"].create(
            {
                "pms_property_id": self.property.id,
                "name": "Double 102",
                "room_type_id": self.room_type_double.id,
                "capacity": 2,
            }
        )

        # create room
        self.room3 = self.env["pms.room"].create(
            {
                "pms_property_id": self.property.id,
                "name": "Double 103",
                "room_type_id": self.room_type_double.id,
                "capacity": 2,
            }
        )

    @freeze_time("1980-11-01")
    def test_reservation_can_assign(self):
        # TEST CASE
        # reservation should allow ASSIGN action
        # ARRANGE
        self.create_common_scenario()
        reservation_vals = {
            "checkin": fields.date.today(),
            "checkout": fields.date.today() + datetime.timedelta(days=1),
            "room_type_id": self.room_type_double.id,
            "partner_id": self.env.ref("base.res_partner_12").id,
            "pms_property_id": self.property.id,
        }
        # ACT
        reservation = self.env["pms.reservation"].create(reservation_vals)
        # ASSERT
        self.assertIn("Assign", json.loads(reservation.pwa_action_buttons).keys())

    @freeze_time("1980-11-01")
    def test_reservation_cannot_assign(self):
        # TEST CASE
        # reservation shouldn't allow ASSIGN action
        # ARRANGE
        self.create_common_scenario()
        reservation_vals = {
            "checkin": fields.date.today(),
            "checkout": fields.date.today() + datetime.timedelta(days=1),
            "room_type_id": self.room_type_double.id,
            "partner_id": self.env.ref("base.res_partner_12").id,
            "pms_property_id": self.property.id,
        }
        # ACT
        reservation = self.env["pms.reservation"].create(reservation_vals)
        reservation.to_assign = False
        reservation.flush()
        # ASSERT
        self.assertNotIn("Assign", json.loads(reservation.pwa_action_buttons).keys())

    @freeze_time("1980-11-01")
    def test_reservation_can_checkin(self):
        # TEST CASE
        # reservation should allow CHECKIN action
        # ARRANGE
        self.create_common_scenario()
        reservation_vals = {
            "checkin": fields.date.today(),
            "checkout": fields.date.today() + datetime.timedelta(days=1),
            "room_type_id": self.room_type_double.id,
            "partner_id": self.env.ref("base.res_partner_12").id,
            "pms_property_id": self.property.id,
        }
        # ACT
        reservation = self.env["pms.reservation"].create(reservation_vals)
        # ASSERT
        self.assertIn("Checkin", json.loads(reservation.pwa_action_buttons).keys())

    @freeze_time("1980-11-01")
    def test_reservation_cannot_checkin(self):
        # TEST CASE
        # reservation shouldn't allow CHECKIN ACTION
        # ARRANGE
        self.create_common_scenario()
        reservation_vals = {
            "checkin": fields.date.today() + datetime.timedelta(days=2),
            "checkout": fields.date.today() + datetime.timedelta(days=5),
            "room_type_id": self.room_type_double.id,
            "partner_id": self.env.ref("base.res_partner_12").id,
            "pms_property_id": self.property.id,
        }
        # ACT
        reservation = self.env["pms.reservation"].create(reservation_vals)
        # ASSERT
        self.assertNotIn("Checkin", json.loads(reservation.pwa_action_buttons).keys())

    @freeze_time("1980-11-01")
    def test_reservation_can_checkout(self):
        # TEST CASE
        # reservation should allow CHECKOUT action
        # ARRANGE
        self.create_common_scenario()
        host = self.env["res.partner"].create(
            {"name": "Miguel", "phone": "654667733", "email": "miguel@example.com",}
        )
        reservation_vals = {
            "checkin": fields.date.today(),
            "checkout": fields.date.today() + datetime.timedelta(days=1),
            "room_type_id": self.room_type_double.id,
            "partner_id": host.id,
            "pms_property_id": self.property.id,
        }
        reservation = self.env["pms.reservation"].create(reservation_vals)
        checkin = self.env["pms.checkin.partner"].create(
            {
                "partner_id": host.id,
                "name": "Paco",
                "lastname": "Martínez",
                "lastname2": "Soria",
                "birthdate_date": "1970-01-01",
                "document_number": "789654489P",
                "document_type": "D",
                "document_expedition_date": "1890-01-01",
                "gender": "male",
                "mobile": "789456123",
                "email": "myemail@email1.com",
                "reservation_id": reservation.id,
            }
        )
        # ACT
        checkin.action_on_board()
        # ASSERT
        with freeze_time("1980-11-02"):
            self.assertIn("Checkout", json.loads(reservation.pwa_action_buttons).keys())

    @freeze_time("1980-11-01")
    def test_reservation_cannot_checkout(self):
        # TEST CASE
        # reservation shouldn't allow CHECKOUT action
        # ARRANGE
        self.create_common_scenario()
        reservation_vals = {
            "checkin": fields.date.today(),
            "checkout": fields.date.today() + datetime.timedelta(days=1),
            "room_type_id": self.room_type_double.id,
            "partner_id": self.env.ref("base.res_partner_12").id,
            "pms_property_id": self.property.id,
        }
        # ACT
        reservation = self.env["pms.reservation"].create(reservation_vals)
        # ASSERT
        self.assertNotIn("Checkout", json.loads(reservation.pwa_action_buttons).keys())

    @freeze_time("1980-11-01")
    def test_reservation_can_pay(self):
        # TEST CASE
        # reservation should allow PAY action
        # ARRANGE
        self.create_common_scenario()
        reservation_vals = {
            "checkin": fields.date.today(),
            "checkout": fields.date.today() + datetime.timedelta(days=1),
            "room_type_id": self.room_type_double.id,
            "partner_id": self.env.ref("base.res_partner_12").id,
            "pms_property_id": self.property.id,
        }

        # ACT
        reservation = self.env["pms.reservation"].create(reservation_vals)
        # ASSERT
        self.assertIn("Payment", json.loads(reservation.pwa_action_buttons).keys())

    @freeze_time("1980-11-01")
    def test_reservation_cannot_pay(self):
        # TEST CASE
        # reservation shouldn't allow PAY action
        # ARRANGE
        self.create_common_scenario()
        reservation_vals = {
            "checkin": fields.date.today(),
            "checkout": fields.date.today() + datetime.timedelta(days=1),
            "room_type_id": self.room_type_double.id,
            "partner_id": self.env.ref("base.res_partner_12").id,
            "pms_property_id": self.property.id,
        }
        # ACT
        reservation = self.env["pms.reservation"].create(reservation_vals)
        reservation.folio_id.pending_amount = 0
        # ASSERT
        self.assertNotIn("Payment", json.loads(reservation.pwa_action_buttons).keys())

    @freeze_time("1980-11-01")
    def test_reservation_can_invoice(self):
        # TEST CASE
        # reservation should allow INVOICE action
        # ARRANGE
        self.create_common_scenario()
        reservation_vals = {
            "checkin": fields.date.today(),
            "checkout": fields.date.today() + datetime.timedelta(days=1),
            "room_type_id": self.room_type_double.id,
            "partner_id": self.env.ref("base.res_partner_12").id,
            "pms_property_id": self.property.id,
        }

        # ACT
        reservation = self.env["pms.reservation"].create(reservation_vals)
        # ASSERT
        self.assertIn("Invoice", json.loads(reservation.pwa_action_buttons).keys())

    @freeze_time("1980-11-01")
    def test_reservation_cannot_invoice(self):
        # TEST CASE
        # reservation shouldn't allow INVOICE action
        # ARRANGE
        self.create_common_scenario()
        reservation_vals = {
            "checkin": fields.date.today(),
            "checkout": fields.date.today() + datetime.timedelta(days=1),
            "room_type_id": self.room_type_double.id,
            "partner_id": self.env.ref("base.res_partner_12").id,
            "pms_property_id": self.property.id,
        }
        # ACT
        reservation = self.env["pms.reservation"].create(reservation_vals)
        reservation.invoice_status = "invoiced"
        # ASSERT
        self.assertNotIn("Invoice", json.loads(reservation.pwa_action_buttons).keys())

    @freeze_time("1980-11-01")
    def test_reservation_can_cancel(self):
        # TEST CASE
        # reservation should allow CANCEL action
        # ARRANGE
        self.create_common_scenario()
        reservation_vals = {
            "checkin": fields.date.today(),
            "checkout": fields.date.today() + datetime.timedelta(days=1),
            "room_type_id": self.room_type_double.id,
            "partner_id": self.env.ref("base.res_partner_12").id,
            "pms_property_id": self.property.id,
        }

        # ACT
        reservation = self.env["pms.reservation"].create(reservation_vals)
        # ASSERT
        self.assertIn("Cancel", json.loads(reservation.pwa_action_buttons).keys())

    @freeze_time("1980-11-01")
    def test_reservation_cannot_cancel(self):
        # TEST CASE
        # reservation shouldn't allow CANCEL action
        # ARRANGE
        self.create_common_scenario()
        reservation_vals = {
            "checkin": fields.date.today(),
            "checkout": fields.date.today() + datetime.timedelta(days=1),
            "room_type_id": self.room_type_double.id,
            "partner_id": self.env.ref("base.res_partner_12").id,
            "pms_property_id": self.property.id,
        }
        # ACT
        reservation = self.env["pms.reservation"].create(reservation_vals)
        reservation.state = "done"
        # ASSERT
        self.assertNotIn("Cancel", json.loads(reservation.pwa_action_buttons).keys())

    @freeze_time("1980-11-01")
    def test_compute_service_tags(self):
        # ARRANGE
        self.create_common_scenario()

        # board service
        bs = self.env["pms.board.service"].create(
            {"name": "Board Service Only Breakfast",}
        )
        bsrt = self.env["pms.board.service.room.type"].create(
            {
                "pms_board_service_id": bs.id,
                "pms_room_type_id": self.room_type_double.id,
            }
        )

        prod = self.env["product.product"].create(
            {
                "name": "Board Service Buffet Product",
                "list_price": 5.0,
                "type": "service",
            }
        )

        prod2 = self.env["product.product"].create(
            {
                "name": "Board Service Buffet Product 22",
                "list_price": 5.0,
                "type": "service",
            }
        )

        self.env["pms.board.service.room.type.line"].create(
            {"pms_board_service_room_type_id": bsrt.id, "product_id": prod.id,}
        )

        self.env["pms.board.service.room.type.line"].create(
            {"pms_board_service_room_type_id": bsrt.id, "product_id": prod2.id,}
        )

        reservation_vals = {
            "checkin": fields.date.today(),
            "checkout": fields.date.today() + datetime.timedelta(days=1),
            "room_type_id": self.room_type_double.id,
            "partner_id": self.env.ref("base.res_partner_12").id,
            "pms_property_id": self.property.id,
            "board_service_room_id": bsrt.id,
        }
        # ACT
        reservation = self.env["pms.reservation"].create(reservation_vals)

        # ASSERT
        self.assertEqual(
            json.loads(reservation.pwa_board_service_tags),
            bsrt.board_service_line_ids.mapped("product_id.name"),
            "Board service tags should be the same as board service room type line",
        )

    def test_checkin_partners_ok(self):
        # TEST CASE
        # An empty list & a list with 1 or 2 guests
        # should mantain the reservation guests properly

        # ARRANGE
        self.create_common_scenario()

        test_cases = [
            [],
            [
                {
                    "name": "Eugenio",
                    "lastname": "Rodríguez",
                    "lastname2": "Fernández",
                    "birthdate_date": "1890-01-01",
                    "document_number": "741852963M",
                    "document_type": "D",
                    "document_expedition_date": "1890-01-01",
                    "gender": "male",
                    "mobile": "639857896",
                    "email": "myemail@email.com",
                    "pms_property_id": self.property.id,
                },
            ],
            [
                {
                    "name": "Pablo",
                    "lastname": "Rodríguez",
                    "lastname2": "Fernández",
                    "birthdate_date": "1890-01-01",
                    "document_number": "789456189E",
                    "document_type": "D",
                    "document_expedition_date": "1890-01-01",
                    "gender": "male",
                    "mobile": "630857876",
                    "email": "myemail@email.com",
                    "pms_property_id": self.property.id,
                },
                {
                    "name": "Pepe",
                    "lastname": "Rodríguez",
                    "lastname2": "Fernández",
                    "birthdate_date": "1890-01-01",
                    "document_number": "456789852J",
                    "document_type": "D",
                    "document_expedition_date": "1890-01-01",
                    "gender": "male",
                    "mobile": "639857896",
                    "email": "myemail2@email.com",
                    "pms_property_id": self.property.id,
                },
            ],
        ]
        for tc in test_cases:
            with self.subTest(k=tc):
                # ARRANGE
                reservation = self.env["pms.reservation"].create(
                    {
                        "checkin": fields.date.today(),
                        "checkout": fields.date.today() + datetime.timedelta(days=1),
                        "room_type_id": self.room_type_double.id,
                        "partner_id": self.env.ref("base.res_partner_12").id,
                        "pms_property_id": self.property.id,
                    }
                )
                reservation.flush()

                # ACT
                reservation.pwa_action_checkin(tc, reservation.id)
                reservation.flush()

                # ASSERT
                self.assertEqual(
                    reservation.count_pending_arrival,
                    reservation.checkin_partner_count - len(tc),
                )

    def test_checkin_partners_fail(self):
        # TEST CASE
        # A list with more guests than the
        # room_type capacity should raises an error

        # ARRANGE
        self.create_common_scenario()
        reservation = self.env["pms.reservation"].create(
            {
                "checkin": fields.date.today(),
                "checkout": fields.date.today() + datetime.timedelta(days=1),
                "room_type_id": self.room_type_double.id,
                "partner_id": self.env.ref("base.res_partner_12").id,
                "pms_property_id": self.property.id,
            }
        )

        guest_list = [
            {
                "name": "Eugenio",
                "lastname": "Rodríguez",
                "lastname2": "Fernández",
                "birthdate_date": "1890-01-01",
                "document_number": "147852369T",
                "document_type": "D",
                "document_expedition_date": "1890-01-01",
                "gender": "male",
                "mobile": "789456123",
                "email": "myemail@email1.com",
                "pms_property_id": self.property.id,
            },
            {
                "name": "Eugenio",
                "lastname": "Rodríguez",
                "lastname2": "Fernández",
                "birthdate_date": "1890-01-01",
                "document_number": "145856325V",
                "document_type": "D",
                "document_expedition_date": "1890-01-01",
                "gender": "male",
                "mobile": "123456789",
                "email": "myemail@email2.com",
                "pms_property_id": self.property.id,
            },
            {
                "name": "Eugenio",
                "lastname": "Rodríguez",
                "lastname2": "Fernández",
                "birthdate_date": "1890-01-01",
                "document_number": "456789132L",
                "document_type": "D",
                "document_expedition_date": "1890-01-01",
                "gender": "male",
                "mobile": "654987321",
                "email": "myemail@email3.com",
                "pms_property_id": self.property.id,
            },
        ]

        # ACT & ASSERT
        with self.assertRaises(ValidationError):
            reservation.pwa_action_checkin(guest_list, reservation.id)
