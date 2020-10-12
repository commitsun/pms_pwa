# Copyright 2017  Dario Lodeiros
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import _, api, fields, models
import json


class PmsReservation(models.Model):
    _inherit = "pms.reservation"

    pwa_action_buttons = fields.Char(compute="_compute_pwa_action_buttons")

    #REVIEW:store = true?
    def _compute_pwa_action_buttons(self):
        """ Return ordered button list, where the first button is
        the preditive action, the next are active actions:
        - "Assign":     Predictive: Reservation by assign
                        Active- Idem
        - "checkin":    Predictive- state 'confirm' and checkin day
                        Active- Idem and assign
        - "checkout":   Predictive- Pay, onboard and checkout day
                        Active- Onboard and checkout day
        - "Pay":        Predictive- Onboard and pending amount > 0
                        Active- pending amount > 0
        - "Invoice":    Predictive- qty invoice > 0, onboard, pending amount = 0
                        Active- qty invoice > 0
        - "Cancel":     Predictive- Never
                        Active- state in draft, confirm, onboard, full onboard
        """
        buttons = {
                "Assign": "/assign",
                "Checkin": "/check-in",
                "Checkout": "/check-out",
                "Payment": "/pay",
                "Invoice": "/invoice",
                "Cancel": "/cancel",
            }
        for reservation in self:
            active_buttons = {}
            for k, v in buttons.items():
                #Logic buttons reservation
                active_buttons[k] = v
            reservation.pwa_action_buttons = json.dumps(active_buttons)
