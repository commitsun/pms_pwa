odoo.define("pms_pwa.property_selector", function (require) {
    "use strict";

    require("web.dom_ready");
    var ajax = require("web.ajax");
    var core = require("web.core");
    var _t = core._t;
    var publicWidget = require("web.public.widget");

    publicWidget.registry.PropertySelectorWidget = publicWidget.Widget.extend({
        selector: ".o_pms_pwa_dropdown-check-list",
        events: {
            "click ul.items>li>input": "_updateSelectedProperties",
            "click span.anchor": "_showHideList",
        },

        init: function () {
            this._super.apply(this, arguments);
        },

        start: function () {
            var self = this;
            return this._super.apply(this, arguments);
        },

        displayDataAlert: function (data) {
            var self = this;
            if (data && data.result === true) {
                data.type = "success";
            } else if (data && data.result === false) {
                data.type = "warning";
            } else {
                data.type = "warning";
                data.message = _t(
                    "An undefined error has ocurred, please try again later."
                );
            }
            var alert_div = $(".o_pms_pwa_roomdoo_alerts");
            var alert = core.qweb.render("pms_pwa.reservation_alerts", {
                alert: data,
            });
            alert_div.append(alert);
        },

        _updateSelectedProperties: function (ev) {
            var self = this;
            var ids = [];
            var checkboxes = $(ev.currentTarget).parent().parent().find("input:checked");
            $.each(checkboxes, function (i, v) {
                ids.push(parseInt(v.id));
            });
            this._rpc({
                model: 'res.users',
                method: 'write',
                args: [[this.getSession().user_id], {pms_pwa_property_ids: ids}],
            }).then(function (data) {
                if(data != true) {
                    this.displayDataAlert(data);
                } else {
                    // Reload to recalculate new reservation select options
                    location.reload();
                }
            });
        },

        _showHideList: function (ev) {
            var self =this;
            var checklist = $(ev.currentTarget).parent();
            if(checklist[0].classList.contains("visible")) {
                checklist[0].classList.remove("visible");
            } else {
                checklist[0].classList.add("visible");
            }
        }
    });

    return publicWidget.registry.PropertySelectorWidget;
});
