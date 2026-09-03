const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

code = code.replace(
    'db.run("ALTER TABLE recibos_historico ADD COLUMN edited_fields TEXT", () => {});\n        db.run("ALTER TABLE recibos_historico ADD COLUMN faltas_vr INTEGER DEFAULT 0", function() {',
    'db.run("ALTER TABLE recibos_historico ADD COLUMN edited_fields TEXT", () => {});\n        db.run("ALTER TABLE recibos_historico ADD COLUMN faltas_vr INTEGER DEFAULT 0", () => {});\n        db.run("ALTER TABLE recibos_historico ADD COLUMN dias_uteis_vt INTEGER DEFAULT 0", () => {});\n        db.run("ALTER TABLE recibos_historico ADD COLUMN faltas_vtn INTEGER DEFAULT 0", () => {});\n        db.run("ALTER TABLE recibos_historico ADD COLUMN extras_vt INTEGER DEFAULT 0", () => {});\n        db.run("ALTER TABLE recibos_historico ADD COLUMN valor_vt REAL", function() {'
);

code = code.replace(
    'INSERT INTO recibos_historico (mes, ano, colaborador_id, dias_trabalhados, dias_vr, faltas, dias_extra, valor_vr, apuracao_diaria, folgas, folgas_vt, faltas_vt, folgas_vr, faltas_vr, valor_vt_editado, valor_vr_editado, edited_fields) \n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    'INSERT INTO recibos_historico (mes, ano, colaborador_id, dias_trabalhados, dias_vr, faltas, dias_extra, valor_vr, apuracao_diaria, folgas, folgas_vt, faltas_vt, folgas_vr, faltas_vr, valor_vt_editado, valor_vr_editado, edited_fields, dias_uteis_vt, faltas_vtn, extras_vt, valor_vt) \n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

code = code.replace(
    'valor_vr_editado=excluded.valor_vr_editado,\n                edited_fields=COALESCE(excluded.edited_fields, recibos_historico.edited_fields)',
    'valor_vr_editado=excluded.valor_vr_editado,\n                dias_uteis_vt=excluded.dias_uteis_vt,\n                faltas_vtn=excluded.faltas_vtn,\n                extras_vt=excluded.extras_vt,\n                valor_vt=excluded.valor_vt,\n                edited_fields=COALESCE(excluded.edited_fields, recibos_historico.edited_fields)'
);

code = code.replace(
    'i.valor_vt_editado, i.valor_vr_editado, i.edited_fields], function(errRun)',
    'i.valor_vt_editado, i.valor_vr_editado, i.edited_fields, i.diasUteisVT || 0, i.faltasVTN || 0, i.extrasVT || 0, i.valor_vt || 0], function(errRun)'
);

fs.writeFileSync('backend/server.js', code);
console.log('Patched');
