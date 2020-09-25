odoo.define('pms_pwa.reservation_table', function(require) {

  var rpc = require('web.rpc');
  require('web.dom_ready');
  var ajax = require('web.ajax');
  var core = require('web.core');
  var _t = core._t;
  var QWeb = core.qweb;
  var publicWidget = require('web.public.widget');

  $("input.o_pmw_pwa_search_input").on('keyup', function (event) {
    var input, filter, table, tr, td, i, txtValue;
    input = document.getElementsByClassName("o_pmw_pwa_search_input")[0];
    filter = input.value.toUpperCase();
    table = document.getElementsByClassName("o_pms_pwa_reservation_list_table")[0];
    tr = table.getElementsByClassName("item");
    for (i = 0; i < tr.length; i++) {
      td = tr[i].getElementsByTagName("div")[0];
      if (td) {
        txtValue = td.textContent || td.innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
          tr[i].style.display = "";
        } else {
          tr[i].style.display = "none";
        }
      }
    }
  });

  publicWidget.registry.ReservationTableWidget = publicWidget.Widget.extend({
    selector: 'div.o_pms_pwa_reservation_list_table',
    xmlDependencies: ['/pms_pwa/static/src/xml/pms_pwa_roomdoo_reservation_modal.xml'],
    events: {
        'click a.o_pms_pwa_reservation_modal': '_onClickReservationButton',
    },
    /**
     * @override
     */
    start: function () {
      var self = this;
      self.reservation_text = _t('Reservation');
      self.info_text = _t('More info');
      self.unread_text = _t('unread message(s)');
      self.room_type_text = _t('Room type');
      self.room_number_text = _t('Room nº');
      self.nights_number_text = _t('Nights nº');
      self.check_in_text = _t('Check in');
      self.check_in_time_text = _t('Check in time');
      self.check_out_text = _t('Check out');
      self.check_out_time_text = _t('Check out time');
      self.room_price_text = _t('Room price');
      self.sales_channel_text = _t('Sales channel');
      self.extras_text = _t('Extras');
      self.card_text = _t('Reservation card number');
      self.total_text = _t('Total');
      self.outstanding_text = _t('Outstanding');
      self.pay_text = _t('Pay');
      self.notes_text = _t('Notes');
      return this._super.apply(this, arguments);
    },
    displayContent: function (xmlid, render_values) {
      var html = core.qweb.render(xmlid, render_values);
      $("div.o_pms_pwa_roomdoo_reservation_modal").html(html);
      $("div.o_pmw_pwa_reservation_modal").modal();
    },
    _onClickReservationButton: function (event) {
      event.preventDefault();
      var self = this;
      var reservation_id = event.currentTarget.getAttribute("data-id");

      /* RPC call to get the reservation data */
      ajax.jsonRpc('/reservation/json_data', 'call', {
        'reservation_id': reservation_id
      }).then(function (data) {
          setTimeout(function(){
              if(data){
                reservation_data = data;
                /* Adding missing data */
                reservation_data['image'] = '/web/static/src/img/placeholder.png';
                reservation_data['unread_msg'] = 2;
                reservation_data['messages'] = [
                  'Lorem ipsum',
                  'Unread short message',
                ];
                reservation_data['extra'] = ['Breakfast', 'Cradle'];
                reservation_data['notes'] = 'Lorem ipsum.';
                reservation_data['card_number'] = '1253 5212 5214 1256 2145';
                reservation_data['room_number'] = 2;
                reservation_data['nights_number'] = 2;
                reservation_data['total'] = reservation_data['price_total'].value;
                reservation_data['total_vat'] = (reservation_data['price_total'].value*21)/100;
                reservation_data['outstanding_vat'] = (reservation_data['folio_pending_amount'].value*21)/100;
                /* End missin data */
                room_types =  ['Triple', 'Económica', 'Estándar', 'Individual', 'Premium', 'Superior'];
                room_numbers =  [1,2,3,4,5,6,7,8,9,10];
                extras =  ['Breakfast', 'Additional bed', 'Cradle'];
                payment_methods =  ['Credit card', 'Cash'];
                self.displayContent("pms_pwa.roomdoo_reservation_modal", {
                  reservation: reservation_data,
                  room_types: room_types,
                  extras: extras,
                  payment_methods: payment_methods,
                  room_numbers: room_numbers,
                  texts: {
                    reservation_text: this.reservation_text,
                    info_text: this.info_text,
                    unread_text: this.unread_text,
                    room_type_text: this.room_type_text,
                    room_number_text: this.room_number_text,
                    nights_number_text: this.nights_number_text,
                    check_in_text: this.check_in_text,
                    check_in_time_text: this.check_in_time_text,
                    check_out_text: this.check_out_text,
                    check_out_time_text: this.check_out_time_text,
                    room_price_text: this.room_price_text,
                    sales_channel_text: this.sales_channel_text,
                    extras_text: this.extras_text,
                    card_text: this.card_text,
                    total_text: this.total_text,
                    outstanding_text: this.outstanding_text,
                    pay_text: this.pay_text,
                    notes_text: this.notes_text,
                  },
                });
              } else {
                reservation_data = false;
              }
          }, 500);
      });
    },
  });

  return publicWidget.registry.ReservationTableWidget;
});
