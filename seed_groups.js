const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/hr_system_v2.sqlite');

const TELAS = [
    { mod: 'RH', id: 'dashboard', nome: 'Dashboard' },
    { mod: 'RH', id: 'colaboradores', nome: 'Colaboradores' },
    { mod: 'RH', id: 'admissao', nome: 'Admissões' },
    { mod: 'RH', id: 'cargos', nome: 'Cargos' },
    { mod: 'RH', id: 'departamentos', nome: 'Departamentos' },
    { mod: 'RH', id: 'faculdade', nome: 'Faculdade' },
    { mod: 'RH', id: 'chaves', nome: 'Chaves' },
    { mod: 'RH', id: 'prontuario-checklist', nome: 'Prontuário CheckList' },
    { mod: 'RH', id: 'prontuario-ficha', nome: 'Prontuário Ficha' },
    { mod: 'RH', id: 'prontuario-pagamentos', nome: 'Prontuário Pagos' },
    { mod: 'RH', id: 'prontuario-aso', nome: 'Prontuário ASO' },
    { mod: 'RH', id: 'ficha-epi', nome: 'Ficha EPI' },
    { mod: 'RH', id: 'gerenciar-avaliacoes', nome: 'Gerenciar Avaliações' },
    { mod: 'RH', id: 'avaliacoes', nome: 'Responder Avaliações' },
    { mod: 'RH', id: 'geradores', nome: 'Geradores' },
    { mod: 'Diretoria', id: 'usuarios-permissoes', nome: 'Usuários Permissões' }
];

const depts = ['RH', 'Logística', 'Financeiro', 'Comercial', 'Administrativo', 'Diretoria'];
const queries = [];

depts.forEach(d => {
    queries.push({ nome: `${d} - Completo`, dep: d, full: true });
    queries.push({ nome: `${d} - Somente Leitura`, dep: d, full: false });
});

db.serialize(() => {
    queries.forEach(q => {
        db.get('SELECT id FROM grupos_permissao WHERE nome = ?', [q.nome], (err, row) => {
            if (!row) {
                db.run('INSERT INTO grupos_permissao (nome, departamento, tipo) VALUES (?, ?, ?)', [q.nome, q.dep, 'padrao'], function(err) {
                    if (err) return console.error('Erro ao inserir', err);
                    const gId = this.lastID;
                    TELAS.forEach(t => {
                        let vis = 0, alt = 0, inc = 0, exc = 0;
                        if (q.full) {
                            vis=1; alt=1; inc=1; exc=1;
                        } else {
                            if (t.mod === q.dep || q.dep === 'Administrativo' || q.dep === 'Diretoria') {
                                vis=1; // always at least see if matches or is admin
                            } else {
                                vis=0;
                            }
                        }
                        // "Completo" ou "Somente leitura" 
                        // Wait! The user asked for it simply by name. Let's just grant read to everything for "Somente Leitura" and full to "Completo", 
                        // because they haven't explicitly asked for fine-grained per-department screens down to the ID level!
                        vis=1; 
                        
                        db.run(
                            'INSERT INTO permissoes_grupo (grupo_id, modulo, pagina_id, pagina_nome, visualizar, alterar, incluir, excluir) VALUES (?,?,?,?,?,?,?,?)',
                            [gId, t.mod, t.id, t.nome, vis, q.full?1:0, q.full?1:0, q.full?1:0]
                        );
                    });
                    console.log(`Grupo inserido: ${q.nome} - ID: ${gId}`);
                });
            } else {
                console.log(`Grupo já existe: ${q.nome}`);
            }
        });
    });
});
