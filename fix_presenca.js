const fs = require('fs');
const file = 'backend/server.js';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/SELECT c\.id, c\.nome_completo, c\.departamento, c\.cargo, c\.status, c\.foto_path, c\.foto_base64,\n\s*d\.tipo AS departamento_tipo\n\s*FROM colaboradores c/, "SELECT c.id, c.nome_completo, c.departamento, c.cargo, c.status, c.foto_path, c.foto_base64, c.data_admissao,\n           d.tipo AS departamento_tipo\n    FROM colaboradores c");

c = c.replace(/SELECT id, nome, descricao, departamento, capa_url, validade_dias, IFNULL\(tipo, 'treinamento'\) AS tipo, is_integracao\n\s*FROM treinamentos/, "SELECT id, nome, descricao, departamento, capa_url, validade_dias, IFNULL(tipo, 'treinamento') AS tipo, is_integracao, data_treinamento\n    FROM treinamentos");

// Now update the filter logic
c = c.replace(/const aplicaveis = treinamentos\.filter\(t => \{\n\s*if \(\!t\.departamento \|\| t\.departamento === 'Todos'\) return true;\n\s*const deptos = t\.departamento\.split\(','\)\.map\(d => d\.trim\(\)\.toLowerCase\(\)\);\n\s*return deptos\.includes\(\(c\.departamento \|\| ''\)\.trim\(\)\.toLowerCase\(\)\);\n\s*\}\);/, `const aplicaveis = treinamentos.filter(t => {
            // Check data_admissao vs data_treinamento
            if (t.data_treinamento && c.data_admissao) {
                const dtTrein = new Date(t.data_treinamento);
                const dtAdmissao = new Date(c.data_admissao);
                // "colaboradores admitidos antes ou no dia desta data"
                // So if admissao is strictly after dtTrein, it shouldn't apply.
                // We add 24 hours to dtTrein to include the whole day.
                if (dtAdmissao > new Date(dtTrein.getTime() + 86400000)) {
                    return false;
                }
            }

            if (!t.departamento || t.departamento === 'Todos') return true;
            const deptos = t.departamento.split(',').map(d => d.trim().toLowerCase());
            return deptos.includes((c.departamento || '').trim().toLowerCase());
          });`);

fs.writeFileSync(file, c, 'utf8');
console.log('Updated server.js data_admissao logic');
