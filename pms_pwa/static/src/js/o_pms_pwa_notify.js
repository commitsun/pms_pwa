odoo.define("pms_pwa.LongpollingFront", function (require) {
    "use strict";

    require("web.dom_ready");
    const session = require("web.session");
    require("web.Bus");
    require("bus.BusService");
    require("web.ServicesMixin");
    var Longpolling = require("bus.Longpolling");
    var NotifyWidget = require("pms_pwa.NotifyWidget");

    // Notification example:
    // env['bus.bus'].sendone('notify_pms_2', '{"id":"80", "audio":"https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3", "message": "Incoming call from unknown (985687458)", "type": "success"}')

    $("a.o_pms_pwa_clear_all").on("click", function (event) {
        event.preventDefault();
        // console.log("Reloading...");
        location.reload();
    });

    Longpolling.include({
        init: function () {
            this._super.apply(this, arguments);
            this._addChannelPMS();
        },
        _onPoll: function (notifications) {
            // console.log("notifications", notifications);
            this.bus_front_notification(notifications);
            this._addChannelPMS();
            return this._super(notifications);
        },
        bus_front_notification: function (notifications) {
            var self = this;
            _.each(notifications, function (notification) {
                if (notification.channel.startsWith("notify_pms_")) {
                    self.on_front_message(notification);
                    self._callLocalStorage("setItem", "last", notification.id);
                    self._callLocalStorage("setItem", "last_ts", new Date().getTime());
                } else if (notification.channel.startsWith("notify_header_pms_")) {
                    console.log("id ->", notification.id);
                    console.log("id ->", notification.controller_type);
                    if(notification.controller_type == "general_header"){
                        $("#o_pms_pwa_update_calendar").find("#update_calendar").css("display","block");
                    }else {
                        self.upload_calendar(notification);
                    }
                }
            });
        },
        _addChannelPMS: function () {
            var channel_pms = "notify_pms_" + session.user_id;
            this.deleteChannel(channel_pms);
            this.addChannel(channel_pms);
        },
        on_front_message: function (notification) {
            new NotifyWidget(this).displayDataAlert(notification);
        },
        upload_calendar: function (notification) {
            //new UpdateCalendar(this)._onClickPropertyChange(notification);
            let parameters = "?selected_property="+notification.pms_property_id;
            window.location = "/calendar/reduced" + parameters;
            // $("#o_pms_pwa_table_reduced").load("/calendar/reduced"+parameters+ " #o_pms_pwa_table_reduced>*");
        },
    });
});
