# Part of Odoo. See LICENSE file for full copyright and licensing details.

# -*- coding: utf-8 -*-

from odoo import http
from odoo.http import request
from odoo.addons.web.controllers.main import Home


class Home(Home):
    @http.route()
    def index(self, *args, **kw):
        if request.session.uid and not request.env["res.users"].sudo().browse(
            request.session.uid
        ).has_group("pms_pwa.group_pms_property_user"):
            return http.local_redirect(
                "/pms-panel", query=request.params, keep_hash=True
            )
        return super(Home, self).index(*args, **kw)

    def _login_redirect(self, uid, redirect=None):
        if not redirect and not request.env["res.users"].sudo().browse(uid).has_group(
            "pms_pwa.group_pms_property_user"
        ):
            return "/pms-panel"
        return super(Home, self)._login_redirect(uid, redirect=redirect)


# Frontend controllers to test
class TestFrontEnd(http.Controller):
    @http.route('/pms-panel', auth='public', website=True)
    def reservation_list(self, **kw):
        return http.request.render('pms_pwa.roomdoo_reservation_list', {
            'object_list': [
                "Alejandro",
                "Pepe da Zoca",
                "Luca Novoa"
            ],
        })

    @http.route('/reservation-detail/<int:id>', auth='public', website=True)
    def reservation_detail(self, **kw):
        return http.request.render('pms_pwa.roomdoo_reservation_detail', {
            'object': [
                "Datos reserva",
            ],
        })
