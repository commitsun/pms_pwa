from odoo import http
from odoo.http import request
from odoo.addons.web.controllers.main import Home
import re


class PWAHome(Home):
    @http.route()
    def index(self, *args, **kw):
        # if request.session.uid and request.env["res.users"].sudo().browse(
        #     request.session.uid
        # ).has_group("pms_pwa.group_pms_property_user"):
        if request.session.uid:
            return http.local_redirect(
                "/dashboard", query=request.params, keep_hash=True
            )

        return http.redirect_with_hash("/web/login")
        # return super(PWAHome, self).index(*args, **kw)

    def _login_redirect(self, uid, redirect=None):
        if not redirect and request.env["res.users"].sudo().browse(uid).has_group(
            "pms_pwa.group_pms_property_user"
        ):
            return "/dashboard"
        return super(PWAHome, self)._login_redirect(uid, redirect=redirect)
