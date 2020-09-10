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
                "/", query=request.params, keep_hash=True
            )
        return super(Home, self).index(*args, **kw)

    def _login_redirect(self, uid, redirect=None):
        if not redirect and not request.env["res.users"].sudo().browse(uid).has_group(
            "pms_pwa.group_pms_property_user"
        ):
            return "/"
        return super(Home, self)._login_redirect(uid, redirect=redirect)


# Frontend controllers to test
class TestFrontEnd(http.Controller):
    @http.route('/', auth='public', website=True)
    '''
        Está ruta está destinada inicialmente al dashboard, pero ahora
        se usa para la lista de reservas, que luego se moverá a /reservation/
        La lista de reservas, debe enviar incialmente 20-50 reservas y el número
        páginas posibles y los filtros que se están aplicando o se pueden aplicar.

        Debe poder aceptar al menos el parámetro "page" para la paginación,
        de forma que podamos llamar desde front /reservation/?page=2
        y los parámetros necesarios para los filtros y la busqueda ( estos
        parámetros dependerán del creador del controller, desde front nos adaptamos
        sin problema.)
    '''
    def reservation_list(self, **kw):
        return http.request.render('pms_pwa.roomdoo_reservation_list', {
            'object_list': [
                "Alejandro",
                "Pepe da Zoca",
                "Luca Novoa"
            ],
        })

    @http.route('/reservation/<int:id>', auth='public', website=True)
    def reservation_detail(self, **kw):
        '''
        Ruta que debe devolver todos los datos de la reserva en un json
        indicando que campos del formulario son modificables y visibles
        y aceptar envío post para guardar las modificaciones en el formulario
        '''
        return http.request.render('pms_pwa.roomdoo_reservation_detail', {
            'object': [
                "Datos reserva",
            ],
        })

    """

    @http.route('/reservation/<int:id>/check-in', auth='public', website=True)
    def reservation_check_in(self, **kw):
        '''
            Ruta para realizar el checkin de la reserva 'id'
        '''
        pass

    @http.route('/reservation/<int:id>/check-out', auth='public', website=True)
    def reservation_check_out(self, **kw):
        '''
            Ruta para realizar el checkout de la reserva 'id'
        '''
        pass

    @http.route('/reservation/<int:id>/pay', auth='public', website=True)
    def reservation_pay(self, **kw):
        '''
            Ruta para realizar pago de la reserva 'id',
            ¿puede aceptar pagos parciales?
        '''
        pass

    @http.route('/reservation/<int:id>/cancel', auth='public', website=True)
    def reservation_cancel(self, **kw):
        '''
            Ruta para realizar la cancelación de la reserva 'id'
        '''
        pass

    """
