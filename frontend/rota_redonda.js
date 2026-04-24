/* ════════════════════════════════════════════════════════════════════════════
   MÓDULO: ROTA REDONDA (ORDENS DE SERVIÇO)
   ════════════════════════════════════════════════════════════════════════════ */

let osState = {
    produtos: [],
    tiposServico: new Set(),
    acoes: new Set(),
    tempoTotal: 10, // em minutos
    qtdTanques: 0
};

const TIPOS_SERVICO = ['TANQUE', 'CARGA', 'VAC', 'UTILITARIO', 'TECNICO', 'CARRETINHA', 'CARROCERIA', 'TANQUE GRANDE'];
const ACOES = ['LEVAR CARRINHO', 'ATENÇÃO AO HORÁRIO', 'TROCA DE CABINE', 'CONTATO COM CLIENTE', 'LEVAR EXTENSORA', 'APOIO DE SUCÇÃO', 'INFORMAÇÕES IMPORTANTES', 'TROCA DE EQUIPAMENTO', 'CARRETINHA', 'VAC', 'LEVAR EPI', 'INTEGRAÇÃO', '! AVULSO', 'BANHEIRO ITINERANTE'];

document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'view-logistica-rota-redonda' && mutation.target.classList.contains('active')) {
                if (!document.getElementById('rota-redonda-content')) {
                    renderRotaRedonda();
                }
            }
        });
    });

    const view = document.getElementById('view-logistica-rota-redonda');
    if (view) observer.observe(view, { attributes: true, attributeFilter: ['class'] });

    // Event Delegation
    document.addEventListener('click', (e) => {
        if (!document.getElementById('view-logistica-rota-redonda')?.classList.contains('active')) return;

        // Toggle Tipo Serviço
        const btnTipo = e.target.closest('.btn-tipo-servico');
        if (btnTipo) {
            const tipo = btnTipo.dataset.tipo;
            if (osState.tiposServico.has(tipo)) osState.tiposServico.delete(tipo);
            else osState.tiposServico.add(tipo);
            atualizarUI();
            return;
        }

        // Toggle Ação
        const btnAcao = e.target.closest('.btn-acao-azul');
        if (btnAcao) {
            const acao = btnAcao.dataset.acao;
            if (osState.acoes.has(acao)) osState.acoes.delete(acao);
            else osState.acoes.add(acao);
            atualizarUI();
            return;
        }

        // Adicionar Produto
        const btnAddProd = e.target.closest('#btn-add-produto');
        if (btnAddProd) {
            const desc = document.getElementById('rr-prod-desc').value.trim();
            const qtd = parseInt(document.getElementById('rr-prod-qtd').value) || 1;
            if (desc) {
                osState.produtos.push({ id: Date.now(), desc, qtd });
                document.getElementById('rr-prod-desc').value = '';
                document.getElementById('rr-prod-qtd').value = '';
                atualizarUI();
            }
            return;
        }

        // Remover Produto
        const btnRemProd = e.target.closest('.btn-rem-prod');
        if (btnRemProd) {
            const id = parseInt(btnRemProd.dataset.id);
            osState.produtos = osState.produtos.filter(p => p.id !== id);
            atualizarUI();
            return;
        }
        
        // Limpar OS
        const btnLimpar = e.target.closest('#btn-limpar-os');
        if (btnLimpar) {
            osState.produtos = [];
            osState.tiposServico.clear();
            osState.acoes.clear();
            document.querySelectorAll('#view-logistica-rota-redonda input').forEach(inp => {
                if(inp.type === 'checkbox') inp.checked = false;
                else inp.value = '';
            });
            atualizarUI();
            return;
        }
    });
});

function atualizarUI() {
    // Atualiza Tipos
    document.querySelectorAll('.btn-tipo-servico').forEach(btn => {
        const tipo = btn.dataset.tipo;
        if (osState.tiposServico.has(tipo)) {
            btn.style.background = '#2d9e5f';
            btn.style.color = 'white';
        } else {
            btn.style.background = 'transparent';
            btn.style.color = '#2d9e5f';
        }
    });

    // Atualiza Ações
    document.querySelectorAll('.btn-acao-azul').forEach(btn => {
        const acao = btn.dataset.acao;
        if (osState.acoes.has(acao)) {
            btn.style.background = '#0284c7';
            btn.style.color = 'white';
            btn.querySelector('i').style.color = 'white';
        } else {
            btn.style.background = '#f0f9ff';
            btn.style.color = '#0284c7';
            btn.querySelector('i').style.color = '#f59e0b';
        }
    });

    // Atualiza Tabela Produtos
    const tbody = document.getElementById('rr-tbody-produtos');
    const totalItens = osState.produtos.reduce((acc, p) => acc + p.qtd, 0);
    
    if (osState.produtos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 1rem; color: #94a3b8; font-size:0.8rem;">Nenhum produto adicionado</td></tr>';
    } else {
        tbody.innerHTML = osState.produtos.map(p => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 0.3rem 0.5rem; font-size:0.75rem;">${p.desc}</td>
                <td style="padding: 0.3rem 0.5rem; text-align:center; font-size:0.75rem; font-weight:600;">${p.qtd}</td>
                <td style="padding: 0.3rem 0.5rem; text-align:center;">
                    <button class="btn-action btn-rem-prod" data-id="${p.id}" style="color:#ef4444; background:transparent; border:none; padding:2px;"><i class="ph ph-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }

    // Atualiza Totais
    document.getElementById('rr-total-prod').innerText = totalItens;
}

function renderRotaRedonda() {
    const container = document.getElementById('rota-redonda-container');
    if (!container) return;

    // Ajuste global para esta view caber em notebooks
    container.parentElement.style.padding = '0.5rem';

    const inputStyle = 'background: white; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 6px; font-size: 0.75rem; height: 26px; width: 100%; box-sizing: border-box;';
    const labelStyle = 'font-weight: 600; font-size: 0.7rem; color: #475569; display: block; margin-bottom: 2px; white-space: nowrap;';

    const html = `
    <div id="rota-redonda-content" style="background: #fff; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 0.75rem; display: flex; flex-direction: column; height: calc(100vh - 65px); box-sizing: border-box;">
        
        <!-- HEADER FORM -->
        <div style="display: flex; gap: 0.5rem; align-items: flex-end; margin-bottom: 0.75rem; background: #2d9e5f; padding: 0.5rem 0.75rem; border-radius: 6px; color: white; flex-shrink: 0;">
            <div style="flex: 0 0 100px;">
                <label style="${labelStyle} color:white;">Nº OS</label>
                <input type="text" style="${inputStyle} border:none;" placeholder="Ex: 12345">
            </div>
            <div style="flex: 1;">
                <label style="${labelStyle} color:white;">Cliente</label>
                <div style="display:flex; gap:2px;">
                    <input type="text" style="${inputStyle} border:none;" placeholder="Nome do Cliente">
                    <button style="background:#20804a; border:none; color:white; border-radius:4px; width:26px; height:26px; cursor:pointer;"><i class="ph ph-magnifying-glass"></i></button>
                    <button style="background:#0369a1; border:none; color:white; border-radius:4px; width:26px; height:26px; cursor:pointer;"><i class="ph ph-map-pin"></i></button>
                </div>
            </div>
            <div style="flex: 0 0 120px;">
                <label style="${labelStyle} color:white;">Contrato</label>
                <input type="text" style="${inputStyle} border:none;" placeholder="Nº Contrato">
            </div>
            <div style="flex: 0 0 120px;">
                <label style="${labelStyle} color:white;">Data</label>
                <input type="date" style="${inputStyle} border:none;">
            </div>
            <div style="display:flex; gap:0.5rem; margin-left: auto;">
                <button id="btn-limpar-os" style="background:#ef4444; color:white; border:none; height:26px; padding:0 10px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:600;"><i class="ph ph-x"></i> Limpar</button>
                <button style="background:#0ea5e9; color:white; border:none; height:26px; padding:0 10px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:600;"><i class="ph ph-pencil"></i> Editar OS</button>
                <button style="background:#14b8a6; color:white; border:none; height:26px; padding:0 10px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:600;"><i class="ph ph-check-circle"></i> Gerar OS</button>
            </div>
        </div>

        <!-- MAIN SPLIT -->
        <div style="display: flex; gap: 0.75rem; flex: 1; min-height: 0;">
            
            <!-- FORM LEFT COL -->
            <div style="display: flex; flex-direction: column; gap: 0.5rem; flex: 2; min-width: 0; overflow-y: auto; padding-right: 4px;">
                
                <div style="display: flex; gap: 0.5rem;">
                    <div style="flex: 2;">
                        <label style="${labelStyle}">Endereço</label>
                        <div style="display:flex; gap:2px;">
                            <input type="text" style="${inputStyle}" placeholder="Endereço completo">
                            <button style="background:#e2e8f0; border:none; color:#475569; width:26px; height:26px; border-radius:4px; cursor:pointer;"><i class="ph ph-magnifying-glass"></i></button>
                        </div>
                    </div>
                    <div style="flex: 1;">
                        <label style="${labelStyle}">Complemento / Lat Long</label>
                        <input type="text" style="${inputStyle}" placeholder="Apto, Sala, Bloco...">
                    </div>
                </div>

                <div style="display: flex; gap: 0.5rem;">
                    <div style="flex: 1;">
                        <label style="${labelStyle}">Responsável</label>
                        <input type="text" style="${inputStyle}" placeholder="Nome do contato">
                    </div>
                    <div style="flex: 1;">
                        <label style="${labelStyle}">SMS (Telefone)</label>
                        <input type="text" style="${inputStyle}" placeholder="(00) 00000-0000">
                    </div>
                    <div style="flex: 1;">
                        <label style="${labelStyle}">Email</label>
                        <input type="email" style="${inputStyle}" placeholder="email@exemplo.com">
                    </div>
                </div>

                <!-- HORÁRIOS E DIAS -->
                <div style="display: flex; gap: 0.5rem; align-items: center; background: #f8fafc; padding: 0.4rem 0.5rem; border-radius: 6px; border: 1px solid #e2e8f0; flex-wrap: wrap;">
                    <label style="display:flex; align-items:center; gap:2px; font-size:0.75rem; color:#475569; cursor:pointer;"><input type="checkbox"> Diurno</label>
                    <label style="display:flex; align-items:center; gap:2px; font-size:0.75rem; color:#475569; cursor:pointer;"><input type="checkbox"> Noturno</label>
                    <div style="width: 1px; height: 16px; background: #cbd5e1; margin: 0 2px;"></div>
                    <span style="font-size: 0.75rem; font-weight: 600; color:#475569;">Horário:</span>
                    <input type="time" style="${inputStyle} width: 75px;"> às 
                    <input type="time" style="${inputStyle} width: 75px;">
                    <div style="width: 1px; height: 16px; background: #cbd5e1; margin: 0 2px;"></div>
                    ${['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d => `<label style="display:flex; align-items:center; gap:2px; font-size:0.7rem; color:#475569; cursor:pointer;"><input type="checkbox"> ${d}</label>`).join('')}
                </div>

                <!-- TIPO SERVIÇO -->
                <div>
                    <label style="${labelStyle}">Selecione o tipo de serviço</label>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        ${TIPOS_SERVICO.map(s => 
                            `<button class="btn-tipo-servico" data-tipo="${s}" style="border: 1px solid #2d9e5f; color: #2d9e5f; background: transparent; border-radius: 99px; padding: 2px 10px; font-size: 0.7rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">${s}</button>`
                        ).join('')}
                    </div>
                </div>

                <!-- OBSERVAÇÕES -->
                <div style="display: flex; gap: 0.5rem;">
                    <div style="flex: 2;">
                        <label style="${labelStyle}">Observações</label>
                        <input type="text" style="${inputStyle}" placeholder="Observações Internas">
                    </div>
                    <div style="flex: 1;">
                        <label style="${labelStyle}">Link Vídeo</label>
                        <div style="display: flex; gap: 2px;">
                            <input type="text" style="${inputStyle}" placeholder="Link YouTube/Drive">
                            <button style="background:#3b82f6; color:white; width:26px; height:26px; border:none; border-radius:4px; cursor:pointer;"><i class="ph ph-video-camera"></i></button>
                        </div>
                    </div>
                </div>

                <!-- PRODUTOS LOGISTICA -->
                <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <input type="text" id="rr-prod-desc" style="${inputStyle} flex: 2;" placeholder="Selecione um código ou digite a descrição...">
                        <input type="number" id="rr-prod-qtd" style="${inputStyle} width: 60px;" placeholder="Qtd">
                        <button id="btn-add-produto" style="background: #3b82f6; color: white; width:26px; height:26px; border:none; border-radius:4px; cursor:pointer;"><i class="ph ph-plus"></i></button>
                        
                        <div style="display: flex; gap: 0.75rem; font-size: 0.7rem; color: #64748b; margin-left: auto; align-items: center;">
                            <span style="background:#f1f5f9; padding:2px 6px; border-radius:4px;"><i class="ph ph-package"></i> Produtos: <strong id="rr-total-prod">0</strong></span>
                            <span style="background:#f1f5f9; padding:2px 6px; border-radius:4px;"><i class="ph ph-clock"></i> Tempo: <strong>00:10</strong></span>
                            <span style="background:#f1f5f9; padding:2px 6px; border-radius:4px;"><i class="ph ph-truck"></i> Tanques: <strong>0</strong></span>
                        </div>
                    </div>
                    
                    <!-- TABELA PRODUTOS (tamanho reduzido) -->
                    <div style="border: 1px solid #e2e8f0; border-radius: 6px; overflow-y: auto; max-height: 100px; background: white;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <tr>
                                    <th style="padding: 0.3rem 0.5rem; text-align: left; font-size: 0.7rem; color: #64748b;">Descrição</th>
                                    <th style="padding: 0.3rem 0.5rem; text-align: center; font-size: 0.7rem; color: #64748b; width: 50px;">Qtd</th>
                                    <th style="padding: 0.3rem 0.5rem; text-align: center; font-size: 0.7rem; color: #64748b; width: 50px;">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="rr-tbody-produtos">
                                <!-- Preenchido pelo atualizarUI -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- BOTÕES DE AÇÃO (AZUIS) -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: auto; padding-top: 0.5rem;">
                    ${ACOES.map(s => 
                        `<button class="btn-acao-azul" data-acao="${s}" style="font-size:0.65rem; font-weight: 700; border: 1px solid #bae6fd; background: #f0f9ff; color: #0284c7; padding: 0.2rem; border-radius: 4px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; min-height: 40px; transition: all 0.2s; line-height: 1.1; text-align: center;">
                            <i class="ph ph-info" style="font-size:0.85rem; color:#f59e0b; margin-bottom:1px;"></i> ${s}
                        </button>`
                    ).join('')}
                </div>

            </div>

            <!-- MAPA E RESUMO RIGHT COL -->
            <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                <div style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; color: #64748b; position: relative; overflow: hidden; background-image: url('https://upload.wikimedia.org/wikipedia/commons/b/bd/Google_Maps_Logo_2020.svg'); background-size: 40px; background-repeat: no-repeat; background-position: center 40%;">
                    <!-- Header do Mapa -->
                    <div style="position: absolute; top: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); padding: 0.4rem 0.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; backdrop-filter: blur(2px);">
                        <span style="font-size:0.75rem; font-weight:700; color:#475569; display:flex; align-items:center; gap:4px;"><i class="ph ph-map-pin" style="color:#0ea5e9;"></i> Localização</span>
                        <button style="background: #3b82f6; color: white; padding: 2px 8px; font-size: 0.7rem; border-radius: 4px; border:none; cursor:pointer; font-weight:600;">Ampliar mapa</button>
                    </div>
                    <p style="margin-top: 3rem; font-size: 0.75rem; font-weight: 500; text-align: center; padding: 0 1rem;">O mapa será carregado aqui<br>(Integração Google Maps)</p>
                </div>
            </div>

        </div>
    </div>
    `;

    container.innerHTML = html;
    atualizarUI(); // Inicializa o estado visual
}
