const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

code = code.replace(
    'edited_fields) \r\n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    'edited_fields, dias_uteis_vt, faltas_vtn, extras_vt, valor_vt) \r\n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

code = code.replace(
    'edited_fields TEXT", () => {});\r\n        db.run("ALTER TABLE recibos_historico ADD COLUMN faltas_vr',
    'edited_fields TEXT", () => {});\r\n        db.run("ALTER TABLE recibos_historico ADD COLUMN dias_uteis_vt INTEGER DEFAULT 0", () => {});\r\n        db.run("ALTER TABLE recibos_historico ADD COLUMN faltas_vtn INTEGER DEFAULT 0", () => {});\r\n        db.run("ALTER TABLE recibos_historico ADD COLUMN extras_vt INTEGER DEFAULT 0", () => {});\r\n        db.run("ALTER TABLE recibos_historico ADD COLUMN valor_vt REAL", () => {});\r\n        db.run("ALTER TABLE recibos_historico ADD COLUMN faltas_vr'
);

code = code.replace(
    'valor_vr_editado=excluded.valor_vr_editado,\r\n                edited_fields=COALESCE(excluded.edited_fields, recibos_historico.edited_fields)',
    'valor_vr_editado=excluded.valor_vr_editado,\r\n                dias_uteis_vt=excluded.dias_uteis_vt,\r\n                faltas_vtn=excluded.faltas_vtn,\r\n                extras_vt=excluded.extras_vt,\r\n                valor_vt=excluded.valor_vt,\r\n                edited_fields=COALESCE(excluded.edited_fields, recibos_historico.edited_fields)'
);

fs.writeFileSync('backend/server.js', code);
console.log('Fixed');
