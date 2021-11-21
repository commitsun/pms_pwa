odoo.define("pms_pwa.NotifyWidget", function (require) {
    "use strict";

    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    var qweb = core.qweb;

    var ReservationTableWidget = require("pms_pwa.reservation_table");

    ajax.loadXML(
        "/pms_pwa/static/src/xml/pms_pwa_roomdoo_notification_widget.xml",
        qweb
    );

    var publicWidget = require("web.public.widget");

    publicWidget.registry.NotifyWidget = publicWidget.Widget.extend({
        selector: ".o_pms_pwa_notify_widget, .o_pms_pwa_cloud_dropdown_menu",
        events: {
            "click a.o_pms_pwa_open_reservation_modal": "_onClickReservationButton",
        },

        init: function () {
            this._super.apply(this, arguments);
        },

        start: function () {
            return this._super.apply(this, arguments);
        },

        alertButtonsOnClick: function () {
            var self = this;
            $(".o_pms_pwa_notify_widget a.o_pms_pwa_open_reservation_modal").on(
                "click",
                function (event) {
                    event.preventDefault();
                    self._onClickReservationButton(event);
                }
            );
        },

        _onClickReservationButton: function (event) {
            event.stopImmediatePropagation();
            event.preventDefault();
            new ReservationTableWidget(this)._openModalFromExternal(event);
        },

        displayDataAlert: function (data) {
            var self = this;
            var message = JSON.parse(data.message);
            var alert_div = $(".o_pms_pwa_notify_widget");
            var alert = qweb.render("pms_pwa.notification_widget", {
                alert: message,
            });
            alert_div.append(alert);

            // Browser does not allow playing audio without user interaction. TO REVIEW

            /* if (message.audio) {
                var audio = new Audio(message.audio);
                audio.play();
            } */

            self.alertButtonsOnClick();

            self.addNotificationToBell(data);
            self.calculateBellColor();
        },

        addNotificationToBell: function (notification) {
            var bell_div = $(".o_pms_pwa_cloud_dropdown_menu");
            var message = JSON.parse(notification.message);
            if (message.id) {
                var notification = $("<a></a>")
                    .addClass("dropdown-item o_pms_pwa_open_reservation_modal")
                    .text(message.message)
                    .attr("href", "#")
                    .attr("data-id", message.id);
            } else {
                var notification = $("<a></a>")
                    .addClass("dropdown-item")
                    .text(message.message)
                    .attr("href", "#");
            }

            bell_div.append(notification);
        },

        calculateBellColor: function () {
            var child_count = 0;
            var bell_off = false;
            try {
                child_count = $(".o_pms_pwa_cloud_dropdown_menu").get(0)
                    .childElementCount;
                var bell = $(".o_pms_pwa_cloud_dropdown").find("img.o_pms_pwa_bell_off");
                if (bell.length > 0) {
                    bell_off = true;
                }
            } catch (error) {
                console.log(error);
            }

            if (child_count > 0 && bell_off) {
                $(".o_pms_pwa_cloud_dropdown")
                    .find("img")
                    .removeClass("o_pms_pwa_bell_off")
                    .addClass("o_pms_pwa_cloud_on");
            }
        },
    });

    return publicWidget.registry.NotifyWidget;
});
