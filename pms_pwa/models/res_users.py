# Copyright 2021 Comunitea Servicios Tecnológicos
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import _, api, fields, models


class ResPartner(models.Model):
    _inherit = "res.users"

    pms_pwa_property_ids = fields.Many2many(
        string="PMS PWA Allowed Properties",
        help="The properties selected in pms_pwa for this user",
        comodel_name="pms.property",
        relation="pms_pwa_property_users_rel",
        column1="user_id",
        column2="pms_property_id",
        domain="[('id','in',pms_property_ids)]",
    )

    pms_pwa_property_id = fields.Many2one(
        string="PMS PWA Active Property",
        help="The active property selected in pms_pwa for this user",
        comodel_name="pms.property",
        domain="[('id','in',pms_property_ids)]",
        compute="_compute_pms_pwa_property_id",
        readonly=False,
        store=True,
    )

    user_notification_ids = fields.One2many(
        comodel_name="res.users.notifications",
        inverse_name="user_id",
        string="User notifications",
    )

    @api.depends("pms_property_ids", "pms_property_id")
    def _compute_pms_pwa_property_id(self):
        for record in self:
            if (
                not record.pms_pwa_property_id
                or record.pms_pwa_property_id not in record.pms_property_ids
            ):
                if record.pms_property_id:
                    record.pms_pwa_property_id = record.pms_property_id
                else:
                    record.pms_pwa_property_id = False

    def get_user_notification_list(self):
        notifications = []
        for notification in self.user_notification_ids.filtered(
            lambda x: x.is_read == False
        ):
            data = {
                "id": notification.id,
                "message": notification.message,
                "pms_pwa_property_id": {
                    "id": notification.pms_pwa_property_id.id,
                },
            }
            if notification.model_id:
                data["model_id"] = {
                    "id": notification.model_id.id,
                    "model": notification.model_id.model,
                }
            notifications.append(data)
        print("notifications: {}".format(notifications))
        return notifications


class ResUsersNotifications(models.Model):
    _name = "res.users.notifications"
    _description = "Res Users Notifications"

    user_id = fields.Many2one(
        comodel_name="res.users",
        string="User",
    )

    pms_pwa_property_id = fields.Many2one(
        comodel_name="pms.property",
        string="PMS PWA Property",
    )

    model_id = fields.Many2one(comodel_name="ir.model", string="Odoo model")
    record_id = fields.Integer(string="Record id")
    message = fields.Char(string="Message")
    is_read = fields.Boolean(string="Has been read?", default=False)

    def mark_as_read(self):
        for notification in self:
            notification.is_read = True

    @api.model
    def mark_as_read_by_user(self, user_id):
        notifications = self.env["res.users.notifications"].search(
            [
                ("user_id", "=", user_id),
                ("is_read", "=", False),
            ]
        )
        for notification in notifications:
            notification.is_read = True
