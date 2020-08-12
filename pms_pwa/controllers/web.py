# Part of Odoo. See LICENSE file for full copyright and licensing details.

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


#   @http.route(['/pms_panel'], type='http', auth="user", website=True)
#   def reservation_list(self, page=1, date_begin=None, date_end=None, sortby=None, **kw):
#        values = {}
#        values.update({
#            'test': True
#        })
#        return request.render("pms_pwa.reservation_list", values)