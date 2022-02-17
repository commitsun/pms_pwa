from odoo import fields, models


class AccountBankStatement(models.Model):
    _inherit = "account.bank.statement"
    _order = "date desc, cash_turn desc, name desc, id desc"

    cash_turn = fields.Integer(
        string="Turn",
        help="Set the day turn of the cash statement",
        copy=False,
        readonly=True,
    )

    def create(self, vals):
        domain = [("date", "=", vals.get("date") or fields.Date.today())]
        if "pms_property_id" in vals:
            domain.append(("pms_property_id", "=", vals["pms_property_id"]))
        daily_statements = self.env["account.bank.statement"].search(domain)
        if daily_statements:
            vals["cash_turn"] = max(daily_statements.mapped("cash_turn")) + 1
        else:
            vals["cash_turn"] = 1
        if "name" in vals:
            vals["name"] = "{} - {}".format(vals["name"], vals["cash_turn"])
        return super(AccountBankStatement, self).create(vals)
