const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/hr_system_v2.sqlite');

// Busca o Walace na producao (dados reais)
db.get("SELECT id, nome_completo, cargo, departamento FROM colaboradores WHERE nome_completo LIKE '%Walace%' LIMIT 1", [], (err, colab) => {
    if (err || !colab) { console.log('Walace nao encontrado:', err && err.message); db.close(); return; }
    console.log('ID:', colab.id, '| cargo:', colab.cargo, '| dept:', colab.departamento);
    
    // Busca o template de Manutencao
    db.get("SELECT id, grupo, epis_json, termo_texto, rodape_texto FROM epi_templates WHERE grupo LIKE '%anutenc%'", [], (err2, tmpl) => {
        if (err2 || !tmpl) { console.log('Template Manutencao nao encontrado:', err2 && err2.message); db.close(); return; }
        console.log('Template:', tmpl.id, tmpl.grupo);
        
        // Fecha todas as fichas ativas do Walace
        db.run("UPDATE colaborador_epi_fichas SET status='fechada', fechada_em=CURRENT_TIMESTAMP, motivo_fechamento='Correcao manual: cargo incompativel com ficha' WHERE colaborador_id=? AND status='ativa'", [colab.id], function(err3) {
            if (err3) { console.log('Erro ao fechar fichas:', err3.message); db.close(); return; }
            console.log('Fichas fechadas:', this.changes);
            
            // Cria nova ficha de Manutencao
            db.run("INSERT INTO colaborador_epi_fichas (colaborador_id, template_id, grupo, snapshot_epis, snapshot_termo, snapshot_rodape, linhas_usadas, status) VALUES (?,?,?,?,?,?,0,'ativa')",
                [colab.id, tmpl.id, tmpl.grupo, tmpl.epis_json, tmpl.termo_texto, tmpl.rodape_texto],
                function(err4) {
                    if (err4) { console.log('Erro ao criar nova ficha:', err4.message); }
                    else { console.log('Nova ficha criada! ID:', this.lastID); }
                    db.close();
                }
            );
        });
    });
});
