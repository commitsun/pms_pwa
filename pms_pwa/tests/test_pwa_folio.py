import datetime

from odoo import fields
from .common import TestHotel

class TestPwaFolio(TestHotel):
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

    def test_reservation_flexible_search_match(self):
        # TEST CASE
        # test flexible search
        # ARRANGE
        self.create_common_scenario()
        host = self.env["res.partner"].create(
            {
                "name": "Miguel",
                "phone": "666666666",
                "mobile": "777777777",
                "email": "miguel@example.com",
                "vat": "EUR",
            }
        )
        reservation = self.env["pms.reservation"].create(
            {
                "checkin": fields.date.today(),
                "checkout": fields.date.today() + datetime.timedelta(days=1),
                "room_type_id": self.room_type_double.id,
                "partner_id": host.id,
                "pms_property_id": self.property.id,
            }
        )
        test_cases = [
            {
                "test_case": "Flexible search by reservation localizator",
                "value": reservation.localizator,
            },
            {"test_case": "Flexible search by host phone", "value": host.phone},
            {"test_case": "Flexible search by host mobile", "value": host.mobile},
            {"test_case": "Flexible search by host name", "value": host.name},
            {"test_case": "Flexible search by host vat", "value": host.vat},
            {"test_case": "Flexible search by host email", "value": host.email},
            {"test_case": "Flexible search no input", "value": ""},
        ]

        for tc in test_cases:
            with self.subTest(k=tc):
                # ACT
                rdo = self.env["pms.folio"].search_folios_pwa(search=tc["value"])
                # ASSERT
                self.assertIn(
                    reservation.folio_id,
                    rdo,
                    "%s not working properly." % tc["test_case"],
                )

    def test_reservation_flexible_search_no_match(self):
        # TEST CASE
        # test flexible search
        # ARRANGE
        self.create_common_scenario()
        host1 = self.env["res.partner"].create(
            {
                "name": "Miguel",
                "phone": "666666666",
                "mobile": "777777777",
                "email": "miguel@example.com",
                "vat": "EUR",
            }
        )

        host2 = self.env["res.partner"].create(
            {
                "name": "Paco",
                "phone": "111111111",
                "mobile": "222222222",
                "email": "paco@mail.com",
                "vat": "USD",
            }
        )
        reservation1 = self.env["pms.reservation"].create(
            {
                "checkin": fields.date.today(),
                "checkout": fields.date.today() + datetime.timedelta(days=1),
                "room_type_id": self.room_type_double.id,
                "partner_id": host1.id,
                "pms_property_id": self.property.id,
            }
        )

        test_cases = [
            {"test_case": "Flexible search by host phone", "value": host2.phone},
            {"test_case": "Flexible search by host mobile", "value": host2.mobile},
            {"test_case": "Flexible search by host name", "value": host2.name},
            {"test_case": "Flexible search by host vat", "value": host2.vat},
            {"test_case": "Flexible search by host email", "value": host2.email},
        ]

        for tc in test_cases:
            with self.subTest(k=tc):
                # ACT
                rdo = self.env["pms.folio"].search_folios_pwa(search=tc["value"])
                # ASSERT
                self.assertNotIn(
                    reservation1.folio_id,
                    rdo,
                    "%s not working properly." % tc["test_case"],
                )

    def test_reservation_search_fields(self):
        # TEST CASE
        # test search fields
        # ARRANGE
        self.create_common_scenario()
        host = self.env["res.partner"].create(
            {
                "name": "Miguel",
                "phone": "666666666",
                "mobile": "777777777",
                "email": "miguel@example.com",
                "vat": "EUR",
            }
        )
        channel_type = self.env["pms.sale.channel"].create(
            {"name": "Test Sales Channel", "channel_type": "direct"}
        )
        agency = self.env["res.partner"].create(
            {
                "name": "Test agency partner",
                "is_agency": True,
                "sale_channel_id": channel_type.id,
            }
        )

        reservation = self.env["pms.reservation"].create(
            {
                "checkin": fields.date.today(),
                "checkout": fields.date.today() + datetime.timedelta(days=2),
                "room_type_id": self.room_type_double.id,
                "partner_id": host.id,
                "pms_property_id": self.property.id,
                "channel_type_id": channel_type.id,
                "agency_id": agency.id,
            }
        )
        test_cases = [
            {
                "test_case": "Field search by host name",
                "field": "name",
                "value": host.name,
            },
            {
                "test_case": "Field search by empty host name",
                "field": "name",
                "value": "",
            },
            {
                "test_case": "Field search by host vat",
                "field": "vat",
                "value": host.vat,
            },
            {
                "test_case": "Field search by emtpy host vat",
                "field": "vat",
                "value": "",
            },
            {
                "test_case": "Field search by host email",
                "field": "email",
                "value": host.email,
            },
            {
                "test_case": "Field search by empty host email",
                "field": "email",
                "value": "",
            },
            {
                "test_case": "Field search by reservation checkin",
                "field": "checkin",
                "value": reservation.checkin,
            },
            {
                "test_case": "Field search by empty reservation checkin",
                "field": "checkin",
                "value": "",
            },
            {
                "test_case": "Field search by reservation checkout",
                "field": "checkout",
                "value": reservation.checkout,
            },
            {
                "test_case": "Field search by empty reservation checkout",
                "field": "checkout",
                "value": "",
            },
            {
                "test_case": "Field search by reservation checkin_from",
                "field": "checkin_from",
                "value": reservation.checkin,
            },
            {
                "test_case": "Field search by empty reservation checkin_from",
                "field": "checkin_from",
                "value": "",
            },
            {
                "test_case": "Field search by reservation checkout_from",
                "field": "checkout_from",
                "value": reservation.checkout,
            },
            {
                "test_case": "Field search by empty reservation checkout_from",
                "field": "checkout_from",
                "value": "",
            },
            {
                "test_case": "Field search by reservation checkin_to",
                "field": "checkin_to",
                "value": reservation.checkin,
            },
            {
                "test_case": "Field search by empty reservation checkin_to",
                "field": "checkin_to",
                "value": "",
            },
            {
                "test_case": "Field search by reservation checkout_to",
                "field": "checkout_to",
                "value": reservation.checkout,
            },
            {
                "test_case": "Field search by empty reservation checkout_to",
                "field": "checkout_to",
                "value": "",
            },
            {
                "test_case": "Field search by reservation created_from",
                "field": "created_from",
                "value": reservation.create_date,
            },
            {
                "test_case": "Field search by empty reservation created_from",
                "field": "created_from",
                "value": "",
            },
            {
                "test_case": "Field search by reservation modified_from",
                "field": "modified_from",
                "value": reservation.write_date,
            },
            {
                "test_case": "Field search by empty reservation modified_from",
                "field": "modified_from",
                "value": "",
            },
            {
                "test_case": "Field search by reservation created_to",
                "field": "created_to",
                "value": reservation.create_date,
            },
            {
                "test_case": "Field search by empty reservation created_to",
                "field": "created_to",
                "value": "",
            },
            {
                "test_case": "Field search by reservation modified_to",
                "field": "modified_to",
                "value": reservation.write_date,
            },
            {
                "test_case": "Field search by empty reservation modified_to",
                "field": "modified_to",
                "value": "",
            },
            {
                "test_case": "Field search by reservation origin",
                "field": "origin",
                "value": reservation.agency_id.name,
            },
            {
                "test_case": "Field search by reservation origin",
                "field": "origin",
                "value": reservation.channel_type_id.name,
            },
            {
                "test_case": "Field search by empty origin",
                "field": "origin",
                "value": "",
            },
        ]

        for tc in test_cases:
            with self.subTest(k=tc):
                # ACT
                rdo = self.env["pms.folio"].search_folios_pwa(
                    search=False, **{tc["field"]: tc["value"]}
                )
                # ASSERT
                self.assertIn(
                    reservation.folio_id,
                    rdo,
                    "%s not working properly." % tc["test_case"],
                )

    def test_reservation_search_fields_no_match(self):
        # TEST CASE
        # test search fields
        # ARRANGE
        self.create_common_scenario()
        host1 = self.env["res.partner"].create(
            {
                "name": "Miguel",
                "phone": "666666666",
                "mobile": "777777777",
                "email": "miguel@example.com",
                "vat": "EUR",
            }
        )

        host2 = self.env["res.partner"].create(
            {
                "name": "Paco",
                "phone": "111111111",
                "mobile": "222222222",
                "email": "paco@mail.com",
                "vat": "USD",
            }
        )

        channel_type1 = self.env["pms.sale.channel"].create(
            {"name": "Test Sales 1", "channel_type": "direct"}
        )
        agency1 = self.env["res.partner"].create(
            {
                "name": "Test agency partner 1",
                "is_agency": True,
                "sale_channel_id": channel_type1.id,
            }
        )

        channel_type2 = self.env["pms.sale.channel"].create(
            {"name": "Test Sales 2", "channel_type": "direct"}
        )
        agency2 = self.env["res.partner"].create(
            {
                "name": "Test agency partner 2",
                "is_agency": True,
                "sale_channel_id": channel_type2.id,
            }
        )

        reservation = self.env["pms.reservation"].create(
            {
                "checkin": fields.date.today(),
                "checkout": fields.date.today() + datetime.timedelta(days=2),
                "room_type_id": self.room_type_double.id,
                "partner_id": host1.id,
                "pms_property_id": self.property.id,
                "channel_type_id": channel_type1.id,
                "agency_id": agency1.id,
            }
        )
        test_cases = [
            {
                "test_case": "Field search by host name",
                "field": "name",
                "value": host2.name,
            },
            {
                "test_case": "Field search by host vat",
                "field": "vat",
                "value": host2.vat,
            },
            {
                "test_case": "Field search by host email",
                "field": "email",
                "value": host2.email,
            },
            {
                "test_case": "Field search by reservation checkin",
                "field": "checkin",
                "value": fields.date.today() + datetime.timedelta(days=-3),
            },
            {
                "test_case": "Field search by reservation checkout",
                "field": "checkout",
                "value": fields.date.today() + datetime.timedelta(days=+3),
            },
            {
                "test_case": "Field search by reservation checkin_from",
                "field": "checkin_from",
                "value": fields.date.today() + datetime.timedelta(days=+3),
            },
            {
                "test_case": "Field search by reservation checkout_from",
                "field": "checkout_from",
                "value": fields.date.today() + datetime.timedelta(days=+3),
            },
            {
                "test_case": "Field search by reservation checkin_to",
                "field": "checkin_to",
                "value": fields.date.today() + datetime.timedelta(days=-3),
            },
            {
                "test_case": "Field search by reservation checkout_to",
                "field": "checkout_to",
                "value": fields.date.today() + datetime.timedelta(days=-3),
            },
            {
                "test_case": "Field search by reservation created_from",
                "field": "created_from",
                "value": fields.date.today() + datetime.timedelta(days=+3),
            },
            {
                "test_case": "Field search by reservation modified_from",
                "field": "modified_from",
                "value": fields.date.today() + datetime.timedelta(days=+3),
            },
            {
                "test_case": "Field search by reservation created_to",
                "field": "created_to",
                "value": fields.date.today() + datetime.timedelta(days=-3),
            },
            {
                "test_case": "Field search by reservation modified_to",
                "field": "modified_to",
                "value": fields.date.today() + datetime.timedelta(days=-3),
            },
            {
                "test_case": "Field search by reservation origin (agency)",
                "field": "origin",
                "value": agency2.name,
            },
            {
                "test_case": "Field search by reservation origin (channel type)",
                "field": "origin",
                "value": channel_type2.name,
            },
        ]

        for tc in test_cases:
            with self.subTest(k=tc):
                # ACT
                rdo = self.env["pms.folio"].search_folios_pwa(
                    search=False, **{tc["field"]: tc["value"]}
                )
                # ASSERT
                self.assertNotIn(
                    reservation.folio_id,
                    rdo,
                    "%s not working properly." % tc["test_case"],
                )

    def test_reservation_flexible_search_and_field_search(self):
        # TEST CASE
        # test flexible search & field search
        # ARRANGE
        self.create_common_scenario()
        host1 = self.env["res.partner"].create(
            {
                "name": "Miguel",
                "phone": "666666666",
                "mobile": "777777777",
                "email": "miguel@example.com",
                "vat": "EUR",
            }
        )
        reservation = self.env["pms.reservation"].create(
            {
                "checkin": fields.date.today(),
                "checkout": fields.date.today() + datetime.timedelta(days=1),
                "room_type_id": self.room_type_double.id,
                "pms_property_id": self.property.id,
                "partner_id": host1.id,
            }
        )
        # ACT
        rdo = self.env["pms.folio"].search_folios_pwa(
            reservation.localizator, **{"name": host1.name}
        )
        # ASSERT
        self.assertIn(
            reservation.folio_id,
            rdo,
            "Combining flexible search and field search fails",
        )

    # TODO text_dialog
