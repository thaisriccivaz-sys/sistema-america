const fs = require('fs');

const rhFile = 'frontend/rh_agenda.js';
let text = fs.readFileSync(rhFile, 'utf8');

// Renomear funcoes globais e handlers no HTML do rh_agenda.js
const renames = {
    'limparTestesAgenda': 'limparTestesRhAgenda',
    'agendaSetEscalaFiltro': 'rhAgendaSetEscalaFiltro',
    'agendaNav': 'rhAgendaNav',
    'agendaIrHoje': 'rhAgendaIrHoje',
    'agendaSetView': 'rhAgendaSetView',
    'agendaSetFilter': 'rhAgendaSetFilter',
    'abrirNovoCard': 'rhAbrirNovoCard',
    'abrirCardDetalhes': 'rhAbrirCardDetalhes',
    'fecharAgendaModal': 'fecharRhAgendaModal',
    'agendaSelectTipo': 'rhAgendaSelectTipo',
    'agendaAddChip': 'rhAgendaAddChip',
    'agendaRemoveChip': 'rhAgendaRemoveChip',
    'agendaToggleAcao': 'rhAgendaToggleAcao',
    'agendaSalvarCard': 'rhAgendaSalvarCard',
    'agendaExcluirCard': 'rhAgendaExcluirCard'
};

for (const [oldName, newName] of Object.entries(renames)) {
    // Regex para substituir as definicoes (window.nome = ...)
    const defRegex = new RegExp(`window\\.${oldName}\\s*=`, 'g');
    text = text.replace(defRegex, `window.${newName} =`);

    // Regex para substituir as chamadas no HTML (onclick="nome(...)" etc)
    const callRegex = new RegExp(`['"]${oldName}\\(`, 'g');
    text = text.replace(callRegex, match => match[0] + `${newName}(`);

    const callRegex2 = new RegExp(`\\s${oldName}\\(`, 'g');
    text = text.replace(callRegex2, match => match[0] + `${newName}(`);
    
    const callRegex3 = new RegExp(`${oldName}\\(`, 'g');
    text = text.replace(callRegex3, `${newName}(`);
}

// 2. Adicionar os filtros de nome e setor na interface e na logica
// Estado dos novos filtros
const varsOld = `    let agendaEscalaFiltroStatus = 'todos'; // 'todos','disponivel','folga','ferias','afastado','falta'`;
const varsNew = `    let agendaEscalaFiltroStatus = 'todos'; // 'todos','disponivel','folga','ferias','afastado','falta'
    let agendaBuscaNome = '';
    let agendaBuscaSetor = '';`;
text = text.replace(varsOld, varsNew);

// Funcoes de atualizacao dos novos filtros
const funcOld = `    window.rhAgendaSetEscalaFiltro = function(status) {
        agendaEscalaFiltroStatus = status;
        window.renderAgendaRH();
    };`;
const funcNew = `    window.rhAgendaSetEscalaFiltro = function(status) {
        agendaEscalaFiltroStatus = status;
        window.renderAgendaRH();
    };
    window.rhAgendaSetBuscaNome = function(val) {
        agendaBuscaNome = val.toLowerCase();
        window.renderAgendaRH();
    };
    window.rhAgendaSetBuscaSetor = function(val) {
        agendaBuscaSetor = val;
        window.renderAgendaRH();
    };`;
text = text.replace(funcOld, funcNew);

// Modificar o filtro de colabs (linha ~210)
const filtroOld = `                const colabsFiltrados = (agendaEscalaData || []).filter(colab => {
                    if (agendaEscalaFiltroStatus === 'todos') return true;
                    const diaInfo = (colab.dias || []).find(x => x.data === dateStr);
                    const status = diaInfo ? diaInfo.status : 'disponivel';
                    return status === agendaEscalaFiltroStatus;
                });`;
const filtroNew = `                const colabsFiltrados = (agendaEscalaData || []).filter(colab => {
                    if (agendaBuscaNome && !(colab.nome_completo || '').toLowerCase().includes(agendaBuscaNome)) return false;
                    if (agendaBuscaSetor && colab.departamento !== agendaBuscaSetor) return false;
                    if (agendaEscalaFiltroStatus === 'todos') return true;
                    const diaInfo = (colab.dias || []).find(x => x.data === dateStr);
                    const status = diaInfo ? diaInfo.status : 'disponivel';
                    return status === agendaEscalaFiltroStatus;
                });`;
text = text.replace(filtroOld, filtroNew);

// Inserir os inputs de busca no HTML
const htmlOld = `            \${agendaFilterTipo === 'escala' ? \`<div id="ag-escala-filtro-bar" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:0.6rem 0;margin-bottom:0.75rem;">
            <span style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-right:4px;">Mostrar:</span>`;
            
const htmlNew = `            \${agendaFilterTipo === 'escala' ? \`
            <div style="display:flex; gap:10px; margin-bottom:10px; flex-wrap:wrap; align-items:center;">
                <input type="text" placeholder="Buscar por nome..." value="\${agendaBuscaNome}" oninput="rhAgendaSetBuscaNome(this.value)" style="padding:6px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; outline:none; min-width:200px;">
                <select onchange="rhAgendaSetBuscaSetor(this.value)" style="padding:6px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; outline:none; min-width:150px; background:#fff;">
                    <option value="">Todos os Setores</option>
                    \${Array.from(new Set(agendaEscalaData.map(c => c.departamento).filter(Boolean))).sort().map(d => \`<option value="\${d}" \${agendaBuscaSetor===d?'selected':''}>\${d}</option>\`).join('')}
                </select>
            </div>
            <div id="ag-escala-filtro-bar" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:0.6rem 0;margin-bottom:0.75rem;">
            <span style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-right:4px;">Mostrar:</span>`;
text = text.replace(htmlOld, htmlNew);

fs.writeFileSync(rhFile, text, 'utf8');
console.log('rh_agenda.js atualizado com sucesso.');

// 3. Modificar /api/rh/escala no server.js para permitir todos os setores exceto Diretoria, ou nenhum
const serverFile = 'backend/server.js';
let serverText = fs.readFileSync(serverFile, 'utf8');

const srvOld = `    const EXCL = ['RH', 'Comercial', 'Financeiro', 'Diretoria'];
    const excStr = EXCL.map(() => '?').join(',');
    db.all(\`SELECT id, nome_completo, cargo, departamento, foto_base64, foto_path, aso_exame_data,
                   escala_tipo, escala_folgas, escala_ciclo_inicio, horario_entrada, horario_saida, status
            FROM colaboradores WHERE status IN ('Ativo','Afastado','Férias')
            AND departamento NOT IN (\${excStr})
            AND (tipo_contrato IS NULL OR tipo_contrato != 'Intermitente')
            ORDER BY departamento ASC, nome_completo ASC\`, EXCL, (err, colabs) => {`;
            
const srvNew = `    const INCL = ['Administrativo', 'Comercial', 'Financeiro', 'Limpeza', 'Logística', 'Manutenção', 'RH', 'Supervisão'];
    const incStr = INCL.map(() => '?').join(',');
    db.all(\`SELECT id, nome_completo, cargo, departamento, foto_base64, foto_path, aso_exame_data,
                   escala_tipo, escala_folgas, escala_ciclo_inicio, horario_entrada, horario_saida, status
            FROM colaboradores WHERE status IN ('Ativo','Afastado','Férias')
            AND departamento IN (\${incStr})
            AND (tipo_contrato IS NULL OR tipo_contrato != 'Intermitente')
            ORDER BY departamento ASC, nome_completo ASC\`, INCL, (err, colabs) => {`;
            
serverText = serverText.replace(srvOld, srvNew);
fs.writeFileSync(serverFile, serverText, 'utf8');
console.log('server.js atualizado com sucesso.');
