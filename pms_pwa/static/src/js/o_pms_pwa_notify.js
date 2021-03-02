odoo.define("pms_pwa.LongpollingFront", function (require) {
    "use strict";

    const session = require("web.session");
    var core = require("web.core");
    require("web.Bus");
    require("bus.BusService");
    require("web.ServicesMixin");
    var Longpolling = require("bus.Longpolling");

    Longpolling.include({
        init: function () {
            this._super.apply(this, arguments);

            this._addChannelPMS();
        },
        _onPoll: function (notifications) {
            this.bus_front_notification(notifications);
            this._addChannelPMS();
            return this._super.apply(this, [notifications]);
        },
        bus_front_notification: function (notifications) {
            var self = this;
            _.each(notifications, function (notification) {
                var message = notification.message;
                self.on_front_message(message);
            });
        },
        _addChannelPMS: function () {
            this.deleteChannel(channel_pms);
            var channel_pms = "notify_pms_" + session.user_id;
            this.addChannel(channel_pms);
        },
        on_front_message: function (message) {
            var div = document.getElementsByClassName("o_pms_pwa_notifications");
            var span = document.createElement("span");
            var content = document.createTextNode(message);
            span.appendChild(content);
            div[0].appendChild(span);
        },
    });
});
