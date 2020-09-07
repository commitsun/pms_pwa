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
                "/pms_panel", query=request.params, keep_hash=True
            )
        return super(Home, self).index(*args, **kw)

    def _login_redirect(self, uid, redirect=None):
        if not redirect and not request.env["res.users"].sudo().browse(uid).has_group(
            "pms_pwa.group_pms_property_user"
        ):
            return "/pms_panel"
        return super(Home, self)._login_redirect(uid, redirect=redirect)


    # Frontend test routes
    @http.route('/pms_panel', auth='public', website=True)
    def reservation_list(self, **kw):
        return http.request.render('pms_pwa.roomdoo_reservation_list', {
            'object_list': [
                "Alejandro Núñez",
                "Pepe da Zoca",
                "Lucía Novoa"
            ],
        })

    @http.route('/pms_panel/detail', auth='public', website=True)
    def reservation_list(self, **kw):
        return http.request.render('pms_pwa.roomdoo_reservation_detail', {
            'object_list': [
                "Datos reserva",
            ],
        })
