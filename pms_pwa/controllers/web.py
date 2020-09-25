# Part of Odoo. See LICENSE file for full copyright and licensing details.

# -*- coding: utf-8 -*-

import base64
import json
import logging

from odoo import http
from odoo.http import request

from odoo.addons.web.controllers.main import Home

_logger = logging.getLogger(__name__)

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
    '''
        Temporal method to charge data demo
    '''

    def _prepare_demo_data_json(self):
        obj_id = http.request.env.user.company_id.partner_id.id
        attachment = http.request.env["ir.attachment"].search([
                ("res_id", "=", obj_id),
                ("name", "=", "reservation_list.json")
            ],limit=1)
        datas = base64.b64decode(attachment.datas)
        json_data = json.loads(datas)
        return json_data

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
    @http.route(['/', '/page/<int:page>'], type='http', auth='public', methods=['GET'], website=True)
    def reservation_list(self, page=0, **kw):
        paginate_by = 10
        data = self._prepare_demo_data_json()
        pager = request.website.pager(url='', total=len(data), page=page, step=paginate_by, scope=7, url_args=kw)
        object_list = data[page*paginate_by:(page+1)*paginate_by]
        return http.request.render('pms_pwa.roomdoo_reservation_list', {
            'object_list': object_list,
            'pager': pager
        })

    @http.route('/reservation/<int:reservation_id>', type='http', auth='public', website=True)
    def reservation_detail(self, reservation_id=None, **kw):
        '''
        Ruta que debe devolver todos los datos de la reserva en un json
        indicando que campos del formulario son modificables y visibles
        y aceptar envío post para guardar las modificaciones en el formulario
        '''
        data = self._prepare_demo_data_json()
        reservation = [x for x in data if x['id'] == reservation_id]
        reservation_obj = {}
        for field, value in reservation[0].items():
            reservation_obj[field] = {
                "value": value,
                "readonly": False,
                "visible": True,
            }
        return http.request.render('pms_pwa.roomdoo_reservation_detail', {
            'object': reservation_obj,
            })

    @http.route(['/reservation/json_data'], type='json', auth="public", methods=['POST'], website=True)
    def reservation_detail_json(self, reservation_id=None, **kw):
        """This route is called to get the reservation info via a json call."""
        data = self._prepare_demo_data_json()
        reservation = [x for x in data if x['id'] == int(reservation_id)]
        reservation_obj = {}
        for field, value in reservation[0].items():
            reservation_obj[field] = {
                "value": value,
                "readonly": False,
                "visible": True,
            }
        return reservation_obj

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
