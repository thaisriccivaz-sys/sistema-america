const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/hr_system_v2.sqlite');

db.all("SELECT respostas_json FROM avaliacoes WHERE tipo = 'satisfacao' AND respostas_json IS NOT NULL LIMIT 50;", [], (err, rows) => {
    if (err) { console.error(err); }
    else {
        const allKeys = new Set();
        rows.forEach(row => {
            try {
                const respostas = JSON.parse(row.respostas_json);
                if (respostas.scores) {
                    Object.keys(respostas.scores).forEach(k => allKeys.add(k));
                } else {
                    Object.keys(respostas).forEach(k => {
                        if(k !== '__obs__' && k !== '__status__' && k !== 'info_adicional' && k !== 'topicos' && k !== 'scores') {
                            allKeys.add(k);
                        }
                    });
                }
            } catch(e) {}
        });
        console.log("Found keys in DB:", Array.from(allKeys));
    }
});

db.close();
