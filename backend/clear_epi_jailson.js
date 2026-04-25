const Database = require('better-sqlite3');
const db = new Database('backend/data/hr_system_v2.sqlite');

// Encontrar Jailson
const colab = db.prepare("SELECT id, nome_completo FROM colaboradores WHERE nome_completo LIKE '%Jailson%'").get();
console.log('Colaborador encontrado:', colab);

if (colab) {
    // Verificar EPIs do Jailson
    const epis = db.prepare("SELECT * FROM epi_fichas WHERE colaborador_id = ?").all(colab.id);
    const epis2 = db.prepare("SELECT * FROM epi_itens WHERE colaborador_id = ?").all(colab.id);
    const epis3 = db.prepare("SELECT * FROM fichas_epi WHERE colaborador_id = ?").all(colab.id);
    console.log('EPIs (epi_fichas):', epis.length);
    console.log('EPIs (epi_itens):', epis2.length);
    console.log('EPIs (fichas_epi):', epis3.length);
    
    // Listar tabelas relacionadas a EPI
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%epi%'").all();
    console.log('Tabelas EPI:', tables.map(t=>t.name));
}

db.close();
