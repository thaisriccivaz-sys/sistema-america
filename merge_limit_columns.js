const fs = require('fs');

// 1. Update index.html
let htmlPath = 'frontend/index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

html = html.replace('<th>Máx. Colab.</th>\n                                        <th>Colaboradores</th>', '<th>Colaboradores</th>');
html = html.replace('<th>Máx. Veíc.</th>\n                                        <th>Veículos</th>', '<th>Veículos</th>');
html = html.replace('<td colspan="8" style="text-align:center; color:#94a3b8; padding:2rem;">Carregando histórico...</td>', '<td colspan="6" style="text-align:center; color:#94a3b8; padding:2rem;">Carregando histórico...</td>');

fs.writeFileSync(htmlPath, html, 'utf8');
console.log("Updated index.html headers to merge limit and list columns.");

// 2. Update credenciamento.js
let credJsPath = 'frontend/credenciamento.js';
let credJs = fs.readFileSync(credJsPath, 'utf8');

// Update _renderizarTabelaHistorico and carregarHistoricoCredenciamento
const oldRowRenderer = `<td>\${cred.qtd_max_colaboradores === 0 ? 'Ilimitado' : cred.qtd_max_colaboradores}</td>
            <td style="font-size:0.8rem; line-height:1.6;">\${colabsText}</td>
            <td>\${cred.qtd_max_veiculos === 0 ? 'Ilimitado' : cred.qtd_max_veiculos}</td>
            <td style="font-size:0.8rem; line-height:1.6;">\${veicsText}</td>`;

const newRowRenderer = `<td style="font-size:0.8rem; line-height:1.6;">
                <div style="font-weight:600; margin-bottom:4px; color:#475569; background:#f1f5f9; padding:2px 6px; border-radius:4px; display:inline-block;">\${colabs.length}/\${cred.qtd_max_colaboradores === 0 ? 'Todos' : cred.qtd_max_colaboradores}</div><br>
                \${colabsText}
            </td>
            <td style="font-size:0.8rem; line-height:1.6;">
                <div style="font-weight:600; margin-bottom:4px; color:#475569; background:#f1f5f9; padding:2px 6px; border-radius:4px; display:inline-block;">\${veics.length}/\${cred.qtd_max_veiculos === 0 ? 'Todos' : cred.qtd_max_veiculos}</div><br>
                \${veicsText}
            </td>`;

credJs = credJs.replace(new RegExp(oldRowRenderer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newRowRenderer);

// Update colspan in the details row from 8 back to 6
credJs = credJs.replace(/<td colspan="8" style="padding:15px;/g, '<td colspan="6" style="padding:15px;');

// Update atualizarResumoColabs to show count in real-time
const oldResumoColabs = `function atualizarResumoColabs() {
    const list = document.getElementById('cred-colab-list');
    if (!list) return;`;

const newResumoColabs = `function atualizarResumoColabs() {
    const list = document.getElementById('cred-colab-list');
    if (!list) return;
    
    const limitNum = window._credLimites ? window._credLimites.colabs : 0;
    const maxText = limitNum > 0 ? limitNum : 'Todos';
    const count = credenciamentoState.selecionadosColabs.length;
    const span = document.getElementById('cred-limit-colabs-span');
    if (span) span.textContent = \`(\${count}/\${maxText})\`;`;

credJs = credJs.replace(oldResumoColabs, newResumoColabs);

// Update atualizarResumoVeiculos to show count in real-time
const oldResumoVeic = `function atualizarResumoVeiculos() {
    const list = document.getElementById('cred-veiculos-list');
    if (!list) return;`;

const newResumoVeic = `function atualizarResumoVeiculos() {
    const list = document.getElementById('cred-veiculos-list');
    if (!list) return;
    
    const limitNum = window._credLimites ? window._credLimites.veics : 0;
    const maxText = limitNum > 0 ? limitNum : 'Todos';
    const count = credenciamentoState.selecionadosVeic.length;
    const span = document.getElementById('cred-limit-veics-span');
    if (span) span.textContent = \`(\${count}/\${maxText})\`;`;

credJs = credJs.replace(oldResumoVeic, newResumoVeic);

fs.writeFileSync(credJsPath, credJs, 'utf8');
console.log("Updated credenciamento.js with real-time UI counts and combined table columns.");