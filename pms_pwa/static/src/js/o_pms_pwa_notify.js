odoo.define("pms_pwa.LongpollingFront", function (require) {
    "use strict";

    const session = require("web.session");
    require("web.Bus");
    require("bus.BusService");
    require("web.ServicesMixin");
    var Longpolling = require("bus.Longpolling");

    $("a.o_pms_pwa_clear_all").on("click", function (event) {
        event.preventDefault();
        console.log("Reloading...");
        location.reload();
    });

    Longpolling.include({
        init: function () {
            this._super.apply(this, arguments);
            this._addChannelPMS();
        },
        _onPoll: function (notifications) {
            console.log("notifications", notifications);
            this.bus_front_notification(notifications);
            this._addChannelPMS();
            return this._super(notifications);
        },
        bus_front_notification: function (notifications) {
            var self = this;
            _.each(notifications, function (notification) {
                if (notification.channel.startsWith("notify_pms_")) {
                    var message = notification.message;
                    self.on_front_message(message);
                    self._callLocalStorage('setItem', 'last', notification.id);
                    self._callLocalStorage('setItem', 'last_ts', new Date().getTime());
                }
            });
        },
        _addChannelPMS: function () {
            var channel_pms = "notify_pms_" + session.user_id;
            this.deleteChannel(channel_pms);
            this.addChannel(channel_pms);
        },
        on_front_message: function (message) {
            var div = document.getElementsByClassName("o_pms_pwa_notification_list");
            var sup_div = document.getElementsByClassName("o_pms_pwa_notifications");
            var span = document.createElement("span");
            var content = document.createTextNode(message);
            span.appendChild(content);
            if (div && div[0]) {
                div[0].appendChild(span);

                if (
                    div[0].children.length > 0 &&
                    sup_div[0].attributes.class.value.includes(
                        "o_pms_pwa_notifications_regular"
                    )
                ) {
                    try {
                        $(".o_pms_pwa_notification_list").css("display", "block ruby");
                        $(".o_pms_notification_title").css("display", "unset");
                        $(".o_pms_pwa_clear_all").css("display", "unset");
                        $(".o_pms_pwa_update_counter").text(div[0].children.length);
                    } catch (error) {
                        console.error(error);
                    }
                }
            } else {
                if (sup_div && sup_div[0]) {
                    sup_div[0].appendChild(span);
                }
            }
        },
    });
});
