odoo.define('pms_pwa.reservation_table', function(require) {

  var rpc = require('web.rpc');
  require('web.dom_ready');
  var ajax = require('web.ajax');
  var core = require('web.core');
  var _t = core._t;
  var QWeb = core.qweb;
  var publicWidget = require('web.public.widget');

  $("input#searchInput").on('keyup', function (event) {
    var input, filter, table, tr, td, i, txtValue;
    input = document.getElementById("searchInput");
    filter = input.value.toUpperCase();
    table = document.getElementById("reservationListTable");
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
    selector: 'div#reservationListTable',
    xmlDependencies: ['/pms_pwa/static/src/xml/pms_pwa_roomdoo_reservation_modal.xml'],
    events: {
        'click button.reservation-modal': '_onClickReservationButton',
    },
    /**
     * @override
     */
    start: function () {
      var self = this;
      return this._super.apply(this, arguments);
    },
    displayContent: function (xmlid, render_values) {
      var html = core.qweb.render(xmlid, render_values);
      $("div#roomdoo_reservation_modal").html(html);
      $("#reservationModal").modal();
    },
    _onClickReservationButton: function (event) {
      event.preventDefault();
      var self = this;
      var reservation_id = event.currentTarget.getAttribute("data-id");
      /* RPC call or whatever to get the reservation data */
      reservation_data = {
        'id': reservation_id,
        'name': 'Alejandro Núñez',
        'phone_number': '698745895',
        'unread_msg': 2,
        'room_type': 'HVM hb vistas al mar',
        'room_number': '2',
        'nights_number': '2',
        'check_in_date': '2020-07-10',
        'check_in_hour': '20:00',
        'check_out_date': '2020-07-11',
        'check_out_hour': '12:00',
        'check_in': false,
        'sales_channel': 'Booking',
        'room_price': '100',
        'total': '120',
        'outstanding': '80',
        'extra': ['Breakfast', 'Cradle'],
        'card_number': '1253 5212 5214 1256 2145',
        'notes': 'Lorem ipsum.'
      }
      room_types =  ['HVM hb vistas al mar', 'AVM vistas mar']
      extras =  ['Breakfast', 'Additional bed', 'Cradle']
      payment_methods =  ['Credit card', 'Cash']
      self.displayContent("pms_pwa.roomdoo_reservation_modal", {
        reservation: reservation_data,
        room_types: room_types,
        extras: extras,
        payment_methods: payment_methods,
      });
    },
  });

  return publicWidget.registry.ReservationTableWidget;
  
});