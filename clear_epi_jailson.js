const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

const colabId = 23; // Jailson

db.serialize(() => {
    // Verificar estrutura da tabela epi_entregas
    db.all("PRAGMA table_info(epi_entregas)", (e, cols) => {
        console.log('Colunas epi_entregas:', cols.map(c => c.name));
    });
    
    // Verificar se tem algum registro relacionado ao Jailson (pode ser por ficha_id)
    db.all("SELECT * FROM colaborador_epi_fichas", (e, fichas) => {
        console.log('Total fichas:', fichas ? fichas.length : 0);
        if (fichas && fichas.length > 0) {
            console.log('Fichas:', JSON.stringify(fichas.slice(0,3)));
        }
    });
    
    setTimeout(() => db.close(), 1500);
});
