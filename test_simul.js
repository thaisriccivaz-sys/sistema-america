const sqlite3 = require('sqlite3').verbose();
const dbPath = process.env.DB_PATH || 'backend/data/hr_system_v2.sqlite';
const db = new sqlite3.Database(dbPath);

const req_params_id = 32;
const nome = 'Ajudante Geral';
const tipo = 'Operacional';
const responsavel_id = '3';
const responsavel_nome = 'João Souza Ferreira';
const nome_aso = null;

db.run('UPDATE departamentos SET nome = ?, tipo = ?, responsavel_id = ?, responsavel_nome = ?, nome_aso = ? WHERE id = ?', 
    [nome.trim(), tipo || 'Operacional', responsavel_id || null, responsavel_nome || null, nome_aso || null, req_params_id], 
    function (updateErr) {
        if (updateErr) console.error(updateErr);
        
        const query = `SELECT d.*, 
               MAX(COALESCE(u2.username, u.username)) as responsavel_username, 
               MAX(COALESCE(u2.id, u.id)) as responsavel_usuario_id
        FROM departamentos d
        LEFT JOIN usuarios u ON LOWER(TRIM(u.nome)) = LOWER(TRIM(d.responsavel_nome))
        LEFT JOIN colaboradores c ON c.id = d.responsavel_id
        LEFT JOIN usuarios u2 ON LOWER(TRIM(u2.username)) = LOWER(TRIM(c.email_corporativo)) OR LOWER(TRIM(u2.username)) = LOWER(TRIM(c.email))
        WHERE d.id = 32
        GROUP BY d.id
        ORDER BY d.nome ASC`;

        db.get(query, (err, row) => {
            console.log('After update:', row);
            const d = row;
            const responsavelIdAtual = d.responsavel_id || '';
            console.log('responsavelIdAtual is:', responsavelIdAtual, typeof responsavelIdAtual);
            
            const c_id = 3; 
            const opt_selected = (responsavelIdAtual && c_id == responsavelIdAtual);
            console.log('Dropdown selected:', opt_selected);
        });
    });
