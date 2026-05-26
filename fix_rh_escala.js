const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'server.js');
let text = fs.readFileSync(filePath, 'utf8');

// Remove the corrupted block (lines 12704-12761)
const startMarker = '// -- GET /api/rh/escala -- Escala para o RH (Operacional + Administrativo)';
const endMarker = '// POST - limpar testes (todos manuais)';

const startIdx = text.indexOf(startMarker);
const endIdx = text.indexOf(endMarker);

if (startIdx === -1) { console.error('startMarker NAO ENCONTRADO'); process.exit(1); }
if (endIdx === -1) { console.error('endMarker NAO ENCONTRADO'); process.exit(1); }

console.log(`Removendo bloco corrompido: linhas aprox ${startIdx} a ${endIdx}`);

const newEndpoint = `// -- GET /api/rh/escala -- Escala RH (Operacional + Administrativo)
app.get('/api/rh/escala', authenticateToken, (req, res) => {
    const { inicio, fim } = req.query;
    if (!inicio || !fim) return res.status(400).json({ error: 'Informe inicio e fim.' });
    const EXCL = ['RH', 'Comercial', 'Financeiro', 'Diretoria'];
    const excStr = EXCL.map(() => '?').join(',');
    db.all(\`SELECT id, nome_completo, cargo, departamento, foto_base64, foto_path, aso_exame_data,
                   escala_tipo, escala_folgas, escala_ciclo_inicio, horario_entrada, horario_saida, status
            FROM colaboradores WHERE status IN ('Ativo','Afastado','Férias')
            AND departamento NOT IN (\${excStr})
            AND (tipo_contrato IS NULL OR tipo_contrato != 'Intermitente')
            ORDER BY departamento ASC, nome_completo ASC\`, EXCL, (err, colabs) => {
        if (err) return res.status(500).json({ error: err.message });
        const ids = (colabs || []).map(c => c.id);
        if (!ids.length) return res.json([]);
        const ph = ids.map(() => '?').join(',');

        const p1 = new Promise(resolve => {
            db.all(\`SELECT id, ferias_programadas_inicio, ferias_programadas_fim FROM colaboradores
                    WHERE id IN (\${ph}) AND ferias_programadas_inicio IS NOT NULL AND ferias_programadas_inicio != ''\`, ids, (e, rows) => {
                const s = {};
                (rows||[]).forEach(r => {
                    if (!r.ferias_programadas_inicio || !r.ferias_programadas_fim) return;
                    let cur = new Date(r.ferias_programadas_inicio + 'T12:00:00');
                    const end = new Date(r.ferias_programadas_fim + 'T12:00:00');
                    while (cur <= end) { const d = cur.toISOString().split('T')[0]; if (!s[r.id]) s[r.id]={}; s[r.id][d]='ferias'; cur.setDate(cur.getDate()+1); }
                });
                resolve(s);
            });
        });

        const p2 = new Promise(resolve => {
            db.all(\`SELECT colaborador_id, atestado_inicio, atestado_fim FROM documentos
                    WHERE colaborador_id IN (\${ph})
                    AND (tab_name LIKE '%ATESTADO%' OR document_type LIKE '%Atestado%' OR tab_name='Atestados')
                    AND atestado_inicio IS NOT NULL AND atestado_fim IS NOT NULL\`, ids, (e, rows) => {
                const s = {};
                (rows||[]).forEach(r => {
                    let cur = new Date(r.atestado_inicio + 'T12:00:00');
                    const end = new Date(r.atestado_fim + 'T12:00:00');
                    while (cur <= end) { const d = cur.toISOString().split('T')[0]; if (!s[r.colaborador_id]) s[r.colaborador_id]={}; s[r.colaborador_id][d]='afastado'; cur.setDate(cur.getDate()+1); }
                });
                resolve(s);
            });
        });

        const p3 = new Promise(resolve => {
            db.all(\`SELECT colaborador_id, data_falta FROM faltas
                    WHERE colaborador_id IN (\${ph}) AND data_falta >= ? AND data_falta <= ?\`,
                [...ids, inicio, fim], (e, rows) => {
                    const s = {};
                    (rows||[]).forEach(r => { if (!s[r.colaborador_id]) s[r.colaborador_id]={}; s[r.colaborador_id][r.data_falta]='falta'; });
                    resolve(s);
                });
        });

        Promise.all([p1, p2, p3]).then(([ferSet, atestSet, faltSet]) => {
            const datas = [];
            let cur = new Date(inicio + 'T12:00:00');
            const endD = new Date(fim + 'T12:00:00');
            while (cur <= endD) { datas.push(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate()+1); }

            const DM = { 'dom':0,'domingo':0,'seg':1,'segunda':1,'ter':2,'terca':2,'qua':3,'quarta':3,'qui':4,'quinta':4,'sex':5,'sexta':5,'sab':6,'sabado':6 };

            const result = (colabs || []).map(c => {
                const asoD = {};
                if (c.aso_exame_data) { const [d,m,y] = c.aso_exame_data.split('/'); if(d&&m&&y) asoD[\`\${y}-\${m.padStart(2,'0')}-\${d.padStart(2,'0')}\`]='aso'; }
                const aus = { ...asoD, ...((faltSet||{})[c.id]||{}), ...((atestSet||{})[c.id]||{}), ...((ferSet||{})[c.id]||{}) };
                const escStr = (c.escala_tipo||'').toLowerCase();
                let fE = [];
                try { const p = JSON.parse(c.escala_folgas||'[]'); fE = Array.isArray(p) ? p.map(f=>String(f).trim().toLowerCase()) : [String(p).trim().toLowerCase()]; }
                catch(e) { fE = (c.escala_folgas||'').split(/[,;]+/).map(f=>f.trim().toLowerCase()).filter(Boolean); }
                const fDow = fE.map(f=>DM[f]).filter(v=>v!==undefined);
                const temC = c.escala_ciclo_inicio && (escStr.includes('uma_folga')||escStr.includes('duas_folgas')||escStr.includes('folga'));
                const cicB = temC ? new Date(c.escala_ciclo_inicio+'T12:00:00') : null;
                const ult = fDow.length >= 2 ? fDow[0] : null;
                const isDDL = (ds) => {
                    if (!temC||!cicB) return false;
                    const dd = new Date(ds+'T12:00:00'); if (dd.getDay()!==0) return false;
                    const diff = Math.round((dd-cicB)/86400000); if (diff<0) return false;
                    return Math.round(diff/7)%3===2;
                };
                const getF = (ds) => {
                    const dd = new Date(ds+'T12:00:00'); const dow = dd.getDay();
                    if (escStr.includes('12x36')) { if (c.escala_ciclo_inicio) { const c12=new Date(c.escala_ciclo_inicio+'T12:00:00'); const dif=Math.round((dd-c12)/86400000); if(dif<0)return false; return dif%2===1; } return false; }
                    if (dow===0 && isDDL(ds)) return true;
                    if (ult!==null && dow===ult) { const sun=new Date(ds+'T12:00:00'); sun.setDate(sun.getDate()-dow); if(isDDL(sun.toISOString().split('T')[0])) return false; }
                    if (escStr.includes('escala_uma_folga')||escStr.includes('escala_duas_folgas')) { if(fDow.length>0) return fDow.includes(dow); }
                    if (escStr.includes('seg_sexta')||escStr.includes('5x2')||escStr.includes('5 x 2')) return dow===0||dow===6;
                    if (escStr.includes('6x1')||escStr.includes('6 x 1')) return dow===0;
                    return dow===0;
                };
                const dias = datas.map(data => { const a=aus[data]||null; const f=getF(data); let st='disponivel'; if(f) st='folga'; if(a) st=a; return {data,status:st}; });
                return { id:c.id, nome_completo:c.nome_completo, cargo:c.cargo, departamento:c.departamento, foto_base64:c.foto_base64, foto_path:c.foto_path, horario_entrada:c.horario_entrada, horario_saida:c.horario_saida, escala_tipo:c.escala_tipo, escala_ciclo_inicio:c.escala_ciclo_inicio||null, dias };
            });
            res.json(result);
        }).catch(e => res.status(500).json({ error: e.message }));
    });
});

`;

text = text.substring(0, startIdx) + newEndpoint + text.substring(endIdx);
fs.writeFileSync(filePath, text, 'utf8');
console.log('OK - endpoint rh/escala reescrito corretamente');
