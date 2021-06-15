# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

{
    "name": "pms_pwa",
    "summary": """
        Control panel Property on Progressive APP""",
    "version": "13.0.1.0.9",
    "license": "AGPL-3",
    "category": "PMS/Theme",
    "author": "Darío Lodeiros Vázquez, Odoo Community Association (OCA)",
    "contributors": [
        "Comunitea ",
        "Manuel Alejandro Núñez Liz <alejandro@zeleiro.com>",
        "Vicente Ángel Gutiérrez Fernández <vicente@comunitea.com>",
    ],
    "website": "https://github.com/OCA/pms",
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
        "templates/calendar_config.xml",
        "templates/login.xml",
        "templates/rooms.xml",
        "templates/rates.xml",
        "templates/configuration.xml",
        "templates/preloader.xml",
        "views/inherited_form_view.xml",
        "security/pms_pwa_security.xml",
        # data
        # "data/delete_data.xml",
        "data/pms_pwa_data.xml",
        "data/page_data.xml",
        "data/menu_data.xml",
    ],
    "images": [
        "/static/description/icon.png",
        "/static/description/pms_pwa_description.png",
        "/static/description/pms_pwa_screenshot.png",
    ],
    "installable": True,
    "application": True,
    "development_status": "Alpha",
}
