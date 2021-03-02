# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

{
    "name": "pms_pwa",
    "summary": """
        Control panel Property on Progressive APP""",
    "version": "13.0.1.0.8",
    "license": "AGPL-3",
    "category": "PMS",
    "author": "Darío Lodeiros Vázquez, Odoo Community Association (OCA)",
    "contributors": [
        "Comunitea ",
        "Manuel Alejandro Núñez Liz <alejandro@zeleiro.com>",
        "Vicente Ángel Gutiérrez Fernández <vicente@comunitea.com>",
    ],
    "website": "https://github.com/commitsun/pms_pwa",
    "depends": ["base", "website", "pms", "bus"],
    "data": [
        "templates/_includes/head.xml",
        "templates/modal.xml",
        "templates/menu/sidebar.xml",
        "templates/menu/navbar.xml",
        "templates/reservation_list.xml",
        "templates/reservation_detail.xml",
        "templates/dashboard.xml",
        "templates/calendar.xml",
        "templates/login.xml",
        "templates/rooms.xml",
        "templates/rates.xml",
        "templates/configuration.xml",
        "views/inherited_form_view.xml",
        "security/pms_pwa_security.xml",
        "data/page_data.xml",
        "data/menu_data.xml",
    ],
    "development_status": "Alpha",
}
