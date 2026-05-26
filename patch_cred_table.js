const fs = require('fs');

// 1. UPDATE index.html
let html = fs.readFileSync('frontend/index.html', 'utf8');

const tableBlockStart = html.indexOf('<!-- NOVO: Histórico de Envios -->');
const tableBlockEnd = html.indexOf('</section>', tableBlockStart);

const newTableBlock = `<!-- NOVO: Histórico de Envios -->
                    <div class="card" style="margin-top: 2rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                            <div style="display:flex; align-items:center; gap: 15px; flex-wrap: wrap;">
                                <h3><i class="ph ph-clock-counter-clockwise"></i> Histórico de Envios</h3>
                                <div style="position:relative;">
                                    <i class="ph ph-magnifying-glass" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8;"></i>
                                    <input type="text" id="filtro-pesquisa-cred" class="form-control" placeholder="Buscar cliente, e-mail ou endereço..." onkeyup="window.filtrarHistoricoCred()" style="width: 300px; padding: 6px 12px 6px 30px;">
                                </div>
                            </div>
                            <div style="display:flex; gap: 10px;">
                                <button class="btn btn-outline" style="padding: 4px 12px; font-size: 12px;" onclick="window.carregarHistoricoCredenciamento()">
                                    <i class="ph ph-arrows-clockwise"></i> Atualizar
                                </button>
                            </div>
                        </div>
                        <div class="table-responsive" style="max-height: calc(100vh - 280px); overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <table class="table" style="font-size:0.85rem; margin:0; width:100%;">
                                <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                    <tr>
                                        <th style="cursor:pointer; white-space:nowrap;" onclick="window.ordenarHistoricoCred('cliente')" title="Ordenar A-Z">Cliente / Obra <i class="ph ph-arrows-down-up" style="color:#94a3b8; font-size:12px;"></i></th>
                                        <th>Colaboradores</th>
                                        <th>Veículos</th>
                                        <th>Licenças</th>
                                        <th style="cursor:pointer; white-space:nowrap;" onclick="window.ordenarHistoricoCred('data')" title="Ordenar Antigo/Novo">Status do Link <i class="ph ph-arrows-down-up" style="color:#94a3b8; font-size:12px;"></i></th>
                                        <th style="text-align:right;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="tbody-historico-cred">
                                    <tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:2rem;">Carregando histórico...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;

html = html.substring(0, tableBlockStart) + newTableBlock + html.substring(tableBlockEnd);
fs.writeFileSync('frontend/index.html', html, 'utf8');

// 2. UPDATE credenciamento.js
let js = fs.readFileSync('frontend/credenciamento.js', 'utf8');

if (!js.includes('window.ordenarHistoricoCred')) {
    const fnAppend = `
// ── Filtro e Ordenação do Histórico ──────────────────────────────────────────
window._historicoCredSort = { col: 'data', dir: 'desc' }; // Estado da ordenação

window.filtrarHistoricoCred = function() {
    const termo = (document.getElementById('filtro-pesquisa-cred').value || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
    const rows = document.querySelectorAll('#tbody-historico-cred tr');
    rows.forEach(row => {
        // Ignora a linha de "Carregando"
        if (row.cells.length === 1) return;
        const texto = row.cells[0].textContent.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
        row.style.display = texto.includes(termo) ? '' : 'none';
    });
};

window.ordenarHistoricoCred = function(coluna) {
    // Alterna direção
    if (window._historicoCredSort.col === coluna) {
        window._historicoCredSort.dir = window._historicoCredSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
        window._historicoCredSort.col = coluna;
        window._historicoCredSort.dir = 'asc';
    }

    if (!window._historicoCredDados || window._historicoCredDados.length === 0) return;

    let dados = [...window._historicoCredDados];

    if (coluna === 'cliente') {
        dados.sort((a, b) => {
            const nomeA = (a.cliente_nome || '').toLowerCase();
            const nomeB = (b.cliente_nome || '').toLowerCase();
            if (nomeA < nomeB) return window._historicoCredSort.dir === 'asc' ? -1 : 1;
            if (nomeA > nomeB) return window._historicoCredSort.dir === 'asc' ? 1 : -1;
            return 0;
        });
    } else if (coluna === 'data') {
        dados.sort((a, b) => {
            const dataA = new Date(a.created_at || 0).getTime();
            const dataB = new Date(b.created_at || 0).getTime();
            return window._historicoCredSort.dir === 'asc' ? dataA - dataB : dataB - dataA;
        });
    }

    window._renderizarTabelaHistorico(dados);
    window.filtrarHistoricoCred(); // reaplica filtro se tiver
};

window._renderizarTabelaHistorico = function(dados) {
    const tbody = document.getElementById('tbody-historico-cred');
    if (!tbody) return;

    if (!dados || dados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:2rem;">Nenhum credenciamento encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = dados.map(cred => {
        let dtFormatada = '';
        if (cred.created_at) {
            const d = new Date(cred.created_at);
            dtFormatada = d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        }

        const colabs = cred.colaboradores_ids ? JSON.parse(cred.colaboradores_ids) : [];
        const veics = cred.veiculos_ids ? JSON.parse(cred.veiculos_ids) : [];
        const licencas = cred.licencas_ids ? JSON.parse(cred.licencas_ids) : [];

        const colabsText = colabs.length > 0 
            ? \`<span title="\${colabs.map(c => '• ' + c.nome).join('&#10;')}" style="cursor:help; border-bottom:1px dotted #94a3b8; font-weight:600; color:#0f172a;">Enviados (\${colabs.length})</span>\` 
            : '<span style="color:#94a3b8;">Nenhum</span>';
            
        const veicsText = veics.length > 0 
            ? \`<span title="\${veics.map(v => '• ' + v.placa + ' (CRLV)').join('&#10;')}" style="cursor:help; border-bottom:1px dotted #94a3b8; font-weight:600; color:#0f172a;">Enviados (\${veics.length})</span>\` 
            : '<span style="color:#94a3b8;">Nenhum</span>';
            
        const licencasText = licencas.length > 0 
            ? \`<span title="\${licencas.map(l => '• ' + l.nome).join('&#10;')}" style="cursor:help; border-bottom:1px dotted #94a3b8; font-weight:600; color:#0f172a;">Enviadas (\${licencas.length})</span>\` 
            : '<span style="color:#94a3b8;">Nenhuma</span>';
        
        // Status do Link
        const validade = new Date(cred.valid_until);
        const expirado = new Date() > validade;
        
        let statusBadge = '';
        if (expirado) {
            statusBadge = \`<span style="color:#dc2626; font-weight:600;"><i class="ph ph-x-circle"></i> Expirado</span>\`;
        } else if (cred.acessado_em) {
            const acessDt = new Date(cred.acessado_em);
            const acessStr = acessDt.toLocaleDateString('pt-BR') + ' às ' + acessDt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            statusBadge = \`<span style="color:#16a34a; font-weight:600;"><i class="ph ph-check-circle"></i> Acessado em \${acessStr}</span>\`;
        } else {
            statusBadge = \`<span style="color:#4f46e5; font-weight:600;"><i class="ph ph-paper-plane-right"></i> Enviado em \${dtFormatada}</span>\`;
        }

        return \`
        <tr>
            <td>
                <b>\${cred.cliente_nome}</b><br>
                <span style="font-size:0.8rem; color:#64748b;">\${cred.cliente_email}</span>
                \${cred.endereco_instalacao ? \`<br><span style="font-size:0.75rem; color:#94a3b8;"><i class="ph ph-map-pin"></i> \${cred.endereco_instalacao}</span>\` : ''}
            </td>
            <td style="font-size:0.8rem; line-height:1.6;">\${colabsText}</td>
            <td style="font-size:0.8rem; line-height:1.6;">\${veicsText}</td>
            <td style="font-size:0.8rem; line-height:1.6;">\${licencasText}</td>
            <td style="font-size:0.85rem;">\${statusBadge}</td>
            <td style="text-align:right; white-space:nowrap;">
                <a href="/credenciamento-publico.html?token=\${cred.token}" target="_blank" class="btn btn-outline" style="padding:4px 8px; font-size:12px; margin-right:4px;" title="Testar / Visualizar Link">
                    <i class="ph ph-link"></i> Link
                </a>
                <button class="btn btn-outline" style="padding:4px 8px; font-size:12px; color:#dc2626; border-color:#fca5a5; background:#fff;" onclick="window.excluirCredenciamento('\${cred.id}')" title="Excluir">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        </tr>\`;
    }).join('');
};
`;
    js += fnAppend;
}

// Modify carregarHistoricoCredenciamento to save data to window._historicoCredDados
const matchStr = `const data = await res.json();
        const tbody = document.getElementById('tbody-historico-cred');`;
const replacementStr = `const data = await res.json();
        window._historicoCredDados = data || [];
        window.ordenarHistoricoCred(window._historicoCredSort.col);
        const tbody = document.getElementById('tbody-historico-cred');`;

if (js.includes(matchStr)) {
    js = js.replace(matchStr, replacementStr);
    
    // Agora removemos o código antigo de renderização de dentro da função (já que delegamos pro _renderizarTabelaHistorico)
    const renderBlockStart = js.indexOf(`if (!data || data.length === 0) {`, js.indexOf(replacementStr));
    const renderBlockEnd = js.indexOf(`} catch (e) {`, renderBlockStart);
    
    if (renderBlockStart !== -1 && renderBlockEnd !== -1) {
        js = js.substring(0, renderBlockStart) + '\n        // Renderização delegada para _renderizarTabelaHistorico\n    ' + js.substring(renderBlockEnd);
    }
}

fs.writeFileSync('frontend/credenciamento.js', js, 'utf8');

console.log('Tabela atualizada com rolagem fixa, filtro e ordenação.');
