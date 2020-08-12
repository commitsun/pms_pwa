# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

{
    "name": "PWA PMS",
    "summary": """
        Control panel Property on Progressive APP""",
    "version": "13.0.1.0.5",
    "license": "AGPL-3",
    "category": "PMS",
    "author": "Darío Lodeiros Vázquez, "
    "Odoo Community Association (OCA), ",
    "website": "https://github.com/commitsun/pms_pwa",
    "depends": [
        'base',
        'website',
    ],
    'data': [
        'templates/_includes/head.xml',
        'templates/_includes/footer.xml',
        'templates/reservation_list.xml',
        'security/pms_pwa_security.xml',
    ],
    "data": [""],
    "development_status": "Alpha",
}
