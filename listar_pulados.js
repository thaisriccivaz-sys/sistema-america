const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || process.env.DB_PATH || path.join(__dirname, 'backend', 'data', 'hr_system_v2.sqlite');

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('❌ Erro ao abrir banco de dados:', err.message);
        process.exit(1);
    }
});

console.log('Buscando documentos que não foram encontrados (Pulados)...\n');

db.all(`
    SELECT d.id, c.nome_completo, d.tab_name, d.file_name, d.file_path
    FROM documentos d
    JOIN colaboradores c ON c.id = d.colaborador_id
    WHERE d.r2_key IS NULL AND d.file_name IS NOT NULL
    ORDER BY c.nome_completo ASC, d.tab_name ASC
`, [], (err, rows) => {
    if (err) {
        console.error('Erro ao buscar no banco:', err.message);
    } else {
        console.log(`Encontrados ${rows.length} documentos pendentes/pulados:\n`);
        
        let report = '';
        rows.forEach(row => {
            const linha = `[ID: ${row.id}] ${row.nome_completo} | Aba: ${row.tab_name} | Arquivo: ${row.file_name}\n   Caminho salvo no banco: ${row.file_path || 'NENHUM'}\n`;
            console.log(linha);
            report += linha + '\n';
        });

        // Opcional: Salvar em um arquivo txt para o usuário poder baixar
        const fs = require('fs');
        fs.writeFileSync('relatorio_pulados.txt', report, 'utf8');
        console.log('✅ Um arquivo "relatorio_pulados.txt" foi criado com a lista acima.');
    }
    
    db.close();
});
