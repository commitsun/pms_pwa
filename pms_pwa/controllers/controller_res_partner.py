import json
from datetime import datetime

from odoo import _, http
from odoo.exceptions import MissingError
from odoo.http import request
from odoo.tools.misc import get_lang


class ResPartner(http.Controller):
    @http.route(
        "/partner/search",
        csrf=False,
        auth="public",
        website=True,
        type="http",
        methods=["GET"],
    )
    def suggest_search(self, keywords, **params):
        if not keywords:
            return json.dumps([])

        Partner = request.env["res.partner"].with_context(bin_size=True)

        domain = [
            "|",
            "|",
            ("name", "ilike", keywords),
            ("email", "ilike", keywords),
            ("mobile", "ilike", keywords),
        ]

        partners = Partner.search(domain, limit=10)
        partners = [dict(id=p.id, name=p.name, type="p") for p in partners]

        return json.dumps(partners)

    @http.route(
        ["/partner/<int:partner_id>"],
        csrf=False,
        auth="public",
        website=True,
        type="json",
        methods=["POST"],
    )
    def partner_detail(self, partner_id=None, **kw):
        if partner_id:
            partner = (
                request.env["res.partner"].sudo().search([("id", "=", int(partner_id))])
            )
            if not partner:
                raise MissingError(_("This partner does not exist."))
            return {"result": True, "partner": partner.parse_res_partner()}
        elif kw.get("reservation_id"):
            reservation = (
                request.env["pms.reservation"]
                .sudo()
                .search([("id", "=", int(kw.get("reservation_id")))])
            )

            partner_data = {
                "id": False,
                "reservation_id": kw.get("reservation_id"),
                "firstname": reservation.partner_name
                if reservation.partner_name
                else False,
                "lastname": False,
                "lastname2": False,
                "birthdate_date": False,
                "document_ids": False,
                "email": reservation.email or False,
                "mobile": reservation.mobile or False,
                "image_128": False,
                "gender": False,
                "nationality_id": False,
                "partner_type": "person",
                "sale_channel_id": False,
                "vat": False,
                "invoice_street": False,
                "invoice_street2": False,
                "invoice_city": False,
                "invoice_zip": False,
                "invoice_country_id": False,
                "invoice_state_id": False,
                "street": False,
                "street2": False,
                "city": False,
                "zip": False,
                "country_id": False,
                "state_id": False,
                "lang": False,
                "allowed_channel_types": [],
                # "allowed_country_ids": request.env[
                #     "pms.property"
                # ]._get_allowed_countries(),
                # "allowed_states": [],
                "comment": False,
            }
            return {"result": True, "partner": partner_data}
        else:
            return {"result": False, "message": _("Partner not indicated")}

    @http.route(
        ["/new_partner"],
        csrf=False,
        auth="public",
        website=True,
        type="json",
        methods=["POST"],
    )
    def new_partner(self, **kw):
        if kw.get("submit"):
            try:
                company_type = "person" if kw.get("partner_type") == "person" else "company"
                is_agency = True if kw.get("partner_type") == "agency" else False
                id_number_vals = False
                values = {
                    "company_type": company_type,
                    "is_agency": is_agency,
                    "firstname": kw.get("firstname"),
                    "email": kw.get("email"),
                    "mobile": kw.get("mobile"),
                    "image_128": kw.get("image_128"),
                    "parent_id": int(kw.get("parent_id")) if kw.get("parent_id") else False,
                    "comment": kw.get("comment"),
                    "lang": kw.get("lang"),
                    "street": kw.get("invoice_street"),
                    "street2": kw.get("invoice_street2"),
                    "city": kw.get("invoice_city"),
                    "zip": kw.get("invoice_zip"),
                    "country_id": int(kw.get("invoice_country_id")) if kw.get("invoice_country_id") else False,
                    "state_id": int(kw.get("invoice_state_id")) if kw.get("invoice_state_id") else False,
                }

                if is_agency:
                    values["sale_channel_id"] = int(kw.get("sale_channel_id")) if kw.get("sale_channel_id") else False

                if company_type == "company":
                    values["vat"] = kw.get("vat")

                if company_type == "person":
                    values.update({
                        "lastname": kw.get("lastname"),
                        "lastname2": kw.get("lastname2"),
                        "birthdate_date": datetime.strptime(
                            kw.get("birthdate_date"), get_lang(request.env).date_format
                        ).date() if kw.get("birthdate_date") else False,
                        "gender": kw.get("gender"),
                        "nationality_id": int(kw.get("nationality_id")) if kw.get("nationality_id") else False,
                        "residence_street": kw.get("street"),
                        "residence_street2": kw.get("street2"),
                        "residence_city": kw.get("city"),
                        "residence_zip": kw.get("zip"),
                        "residence_country_id": int(kw.get("country_id")) if kw.get("country_id") else False,
                        "residence_state_id": int(kw.get("residence_state_id")) if kw.get("residence_state_id") else False,

                    })
                    if kw.get("document_type") and kw.get("document_number"):
                        id_number_vals = {
                            "category_id": int(kw.get("document_type")),
                            "name": kw.get("document_number"),
                            "valid_from": datetime.strptime(
                                kw.get("document_expedition_date"), get_lang(request.env).date_format
                            ).date() if kw.get("document_expedition_date") else False,
                        }
                if kw.get("id"):
                    partner = request.env["res.partner"].browse(int(kw.get("id")))
                    update_vals = {}
                    for key, value in values.items():
                        if value and value != "":
                            update_vals[key] = value
                    partner.write(update_vals)
                    if partner.id_numbers:
                        for id_number in partner.id_numbers:
                            if id_number_vals.get("category_id") == id_number.category_id.id:
                                id_number.write(id_number_vals)
                            elif id_number_vals:
                                partner.id_numbers.write({
                                    "id_numbers": [(0, 0, id_number_vals)]
                                })
                else:
                    if id_number_vals:
                        values["id_numbers"] = [(0, 0, id_number_vals)]
                    partner = request.env["res.partner"].sudo().create(values)
                    if kw.get("reservation_id"):
                        folio = (
                            request.env["pms.reservation"]
                            .sudo()
                            .search([("id", "=", int(kw.get("reservation_id")))])
                        ).folio_id
                        if not folio.partner_id:
                            folio.write({"partner_id": partner.id})
                            for reservation in folio.reservation_ids.filtered(lambda r: not r.partner_id):
                                reservation.write({"partner_id": partner.id})

                return {"result": True, "message": "Contacto actualizado", "partner": partner.parse_res_partner()}
            except Exception as e:
                return {"result": False, "message": str(e)}
        else:
            # allowed_states = []
            # if kw.get("invoice_country_id"):
            #     for state in request.env["res.country.state"].search(
            #         [("country_id", "=", int(kw["invoice_country_id"]))]
            #     ):
            #         allowed_states.append(
            #             {
            #                 "id": state.id,
            #                 "name": state.name,
            #             }
            #         )
            is_agency = True if kw.get("partner_type") == "agency" else False
            allowed_channel_types = []
            allowed_document_types = []
            if is_agency:
                domain = [("channel_type", "=", "indirect")]
                channel_types = self.env["pms.sale.channel"].search(domain)
                for channel in channel_types:
                    allowed_channel_types.append({"id": channel.id, "name": channel.name})
            elif not kw.get("partner_type") or kw.get("partner_type") == "person":
                document_types = request.env["res.partner.id_category"].sudo().search([])
                for type in document_types:
                    allowed_document_types.append({"id": type.id, "name": type.name})
            # country_list = request.env["pms.property"]._get_allowed_countries()

            data_json = {
                "partner_type": "person",
                # "allowed_langs": request.env['res.lang'].get_installed(),
                "allowed_channel_types": allowed_channel_types,
                # "allowed_invoice_country_ids": country_list,
                # "allowed_country_ids": country_list,
                # "allowed_nationality_ids": country_list,
                # "allowed_invoice_states": allowed_states,
                # "allowed_states": allowed_states,
                "allowed_document_types": allowed_document_types,
            }
            return data_json
