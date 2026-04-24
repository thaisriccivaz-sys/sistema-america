/* ════════════════════════════════════════════════════════════════════════════
   MÓDULO: ROTA REDONDA (ORDENS DE SERVIÇO)
   ════════════════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    // Escuta o evento de navegação para inicializar a tela
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
    if (view) {
        observer.observe(view, { attributes: true, attributeFilter: ['class'] });
    }
});

function renderRotaRedonda() {
    const container = document.getElementById('rota-redonda-container');
    if (!container) return;

    const html = `
    <div id="rota-redonda-content" style="background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 1.5rem;">
        
        <!-- HEADER FORM -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; align-items: end; margin-bottom: 1.5rem; background: #2d9e5f; padding: 1rem; border-radius: 8px; color: white;">
            <div>
                <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 4px;">Nº OS</label>
                <input type="text" class="form-control" style="background: white; border: none; height: 36px;" placeholder="Ex: 12345">
            </div>
            <div style="grid-column: span 2;">
                <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 4px;">Cliente</label>
                <div style="display:flex; gap:0.5rem;">
                    <input type="text" class="form-control" style="background: white; border: none; flex: 1; height: 36px;" placeholder="Nome do Cliente">
                    <button class="btn-action" style="background: #20804a; border: none; color: white; border-radius:4px; height: 36px; width: 36px; display:flex; align-items:center; justify-content:center;"><i class="ph ph-magnifying-glass"></i></button>
                    <button class="btn-action" style="background: #0369a1; border: none; color: white; border-radius:4px; height: 36px; width: 36px; display:flex; align-items:center; justify-content:center;"><i class="ph ph-map-pin"></i></button>
                </div>
            </div>
            <div>
                <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 4px;">Contrato</label>
                <input type="text" class="form-control" style="background: white; border: none; height: 36px;" placeholder="Nº Contrato">
            </div>
            <div>
                <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 4px;">Data</label>
                <input type="date" class="form-control" style="background: white; border: none; height: 36px;">
            </div>
            <div style="display:flex; gap:0.5rem; justify-content: flex-end; align-items: flex-end;">
                <button class="btn-action" style="background: #ef4444; color: white; border: none; height: 36px; padding: 0 1rem; border-radius:4px;"><i class="ph ph-x"></i> Limpar</button>
                <button class="btn-action" style="background: #0ea5e9; color: white; border: none; height: 36px; padding: 0 1rem; border-radius:4px;"><i class="ph ph-pencil"></i> Editar OS</button>
                <button class="btn-action" style="background: #14b8a6; color: white; border: none; height: 36px; padding: 0 1rem; border-radius:4px;"><i class="ph ph-check-circle"></i> Gerar OS</button>
            </div>
        </div>

        <!-- MAIN SPLIT -->
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;">
            
            <!-- FORM LEFT COL -->
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                    <div>
                        <label style="font-weight: 600; font-size: 0.85rem;">Endereço</label>
                        <div style="display:flex; gap:0.5rem;">
                            <input type="text" class="form-control" placeholder="Endereço completo">
                            <button class="btn-action" style="background:#cbd5e1; color:#475569; width:36px; height:36px; display:flex; align-items:center; justify-content:center;"><i class="ph ph-magnifying-glass"></i></button>
                        </div>
                    </div>
                    <div>
                        <label style="font-weight: 600; font-size: 0.85rem;">Complemento</label>
                        <input type="text" class="form-control" placeholder="Apto, Sala, Bloco...">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                    <div>
                        <label style="font-weight: 600; font-size: 0.85rem;">Responsável</label>
                        <input type="text" class="form-control" placeholder="Nome do contato">
                    </div>
                    <div>
                        <label style="font-weight: 600; font-size: 0.85rem;">SMS (Telefone)</label>
                        <input type="text" class="form-control" placeholder="(00) 00000-0000">
                    </div>
                    <div>
                        <label style="font-weight: 600; font-size: 0.85rem;">Email</label>
                        <input type="email" class="form-control" placeholder="email@exemplo.com">
                    </div>
                </div>

                <!-- HORÁRIOS E DIAS -->
                <div style="display: flex; gap: 1rem; align-items: center; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <label style="display:flex; align-items:center; gap:4px; font-size:0.85rem; color:#475569;"><input type="checkbox"> Diurno</label>
                    <label style="display:flex; align-items:center; gap:4px; font-size:0.85rem; color:#475569;"><input type="checkbox"> Noturno</label>
                    <div style="width: 1px; height: 20px; background: #cbd5e1; margin: 0 0.5rem;"></div>
                    <span style="font-size: 0.85rem; font-weight: 600; color:#475569;">Horário:</span>
                    <input type="time" class="form-control" style="width: 100px; padding: 0.2rem 0.5rem;"> às 
                    <input type="time" class="form-control" style="width: 100px; padding: 0.2rem 0.5rem;">
                    <div style="width: 1px; height: 20px; background: #cbd5e1; margin: 0 0.5rem;"></div>
                    <label style="display:flex; align-items:center; gap:4px; font-size:0.85rem; color:#475569;"><input type="checkbox"> Seg</label>
                    <label style="display:flex; align-items:center; gap:4px; font-size:0.85rem; color:#475569;"><input type="checkbox"> Ter</label>
                    <label style="display:flex; align-items:center; gap:4px; font-size:0.85rem; color:#475569;"><input type="checkbox"> Qua</label>
                    <label style="display:flex; align-items:center; gap:4px; font-size:0.85rem; color:#475569;"><input type="checkbox"> Qui</label>
                    <label style="display:flex; align-items:center; gap:4px; font-size:0.85rem; color:#475569;"><input type="checkbox"> Sex</label>
                    <label style="display:flex; align-items:center; gap:4px; font-size:0.85rem; color:#475569;"><input type="checkbox"> Sáb</label>
                    <label style="display:flex; align-items:center; gap:4px; font-size:0.85rem; color:#475569;"><input type="checkbox"> Dom</label>
                </div>

                <!-- TIPO SERVIÇO -->
                <div>
                    <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.5rem;">Selecione o tipo de serviço</label>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${['TANQUE', 'CARGA', 'VAC', 'UTILITARIO', 'TECNICO', 'CARRETINHA', 'CARROCERIA', 'TANQUE GRANDE'].map(s => 
                            `<button class="btn-action" style="border: 1px solid #2d9e5f; color: #2d9e5f; background: transparent; border-radius: 99px; padding: 4px 12px; font-size: 0.75rem;">${s}</button>`
                        ).join('')}
                    </div>
                </div>

                <!-- OBSERVAÇÕES -->
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                    <div>
                        <label style="font-weight: 600; font-size: 0.85rem;">Observações</label>
                        <input type="text" class="form-control" placeholder="Observações Internas">
                    </div>
                    <div>
                        <label style="font-weight: 600; font-size: 0.85rem;">Link Vídeo</label>
                        <div style="display: flex; gap: 0.5rem;">
                            <input type="text" class="form-control" placeholder="Link YouTube/Drive">
                            <button class="btn-action" style="background:#3b82f6; color:white; width:36px; height:36px; display:flex; align-items:center; justify-content:center;"><i class="ph ph-video-camera"></i></button>
                        </div>
                    </div>
                </div>

                <!-- PRODUTOS LOGISTICA -->
                <div style="margin-top: 1rem;">
                    <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem;">
                        <input type="text" class="form-control" placeholder="Selecione um código..." style="flex: 2;">
                        <input type="number" class="form-control" placeholder="Qtd" style="width: 80px;">
                        <button class="btn-action" style="background: #3b82f6; color: white; width:36px; height:36px; display:flex; align-items:center; justify-content:center;"><i class="ph ph-plus"></i></button>
                        <div style="display: flex; gap: 1rem; font-size: 0.8rem; color: #64748b; margin-left: auto;">
                            <span><i class="ph ph-package"></i> Total Produtos: <strong>0</strong></span>
                            <span><i class="ph ph-clock"></i> Tempo Total: <strong>00:10</strong></span>
                            <span><i class="ph ph-truck"></i> Tanques: <strong>0</strong></span>
                        </div>
                    </div>
                    <div style="border: 1px solid #e2e8f0; border-radius: 8px; min-height: 120px; overflow: hidden;">
                        <table class="table table-sm" style="margin: 0; width: 100%;">
                            <thead style="background: #94a3b8; color: white;">
                                <tr>
                                    <th style="padding: 0.5rem;">Descrição</th>
                                    <th style="padding: 0.5rem; width: 80px; text-align: center;">Qtd</th>
                                    <th style="padding: 0.5rem; width: 80px; text-align: center;">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="3" style="text-align:center; padding: 2rem; color: #94a3b8;">Nenhum produto adicionado</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- BOTÕES DE AÇÃO (HABILIDADES/VARIÁVEIS) -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-top: 1rem;">
                    ${['LEVAR CARRINHO', 'ATENÇÃO AO HORÁRIO', 'TROCA DE CABINE', 'CONTATO COM CLIENTE', 'LEVAR EXTENSORA', 'APOIO DE SUCÇÃO', 'INFORMAÇÕES IMPORTANTES', 'TROCA DE EQUIPAMENTO', 'CARRETINHA', 'VAC', 'LEVAR EPI', 'INTEGRAÇÃO', '! AVULSO', 'BANHEIRO ITINERANTE'].map(s => 
                        `<button class="btn-action" style="font-size:0.7rem; font-weight: 600; border: 1px solid #bae6fd; background: #f0f9ff; color: #0284c7; padding: 0.5rem; border-radius: 6px; display:flex; flex-direction:column; align-items:center; gap: 4px; text-align:center; justify-content:center;">
                            <i class="ph ph-info" style="font-size:1rem; color:#f59e0b;"></i> ${s}
                        </button>`
                    ).join('')}
                </div>

            </div>

            <!-- MAPA E RESUMO RIGHT COL -->
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; flex: 1; min-height: 500px; display: flex; align-items: center; justify-content: center; flex-direction: column; color: #64748b; position: relative; overflow: hidden; background-image: url('https://upload.wikimedia.org/wikipedia/commons/b/bd/Google_Maps_Logo_2020.svg'); background-size: 50px; background-repeat: no-repeat; background-position: center 40%;">
                    <!-- Placeholder de Mapa -->
                    <div style="position: absolute; top: 0; left: 0; right: 0; background: rgba(255,255,255,0.9); padding: 0.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0;">
                        <span style="font-size:0.85rem; font-weight:600; color:#475569;"><i class="ph ph-map-pin"></i> Localização</span>
                        <button class="btn-action" style="background: #3b82f6; color: white; padding: 4px 12px; font-size: 0.8rem; border-radius: 4px; border:none;">Ampliar mapa</button>
                    </div>
                    <p style="margin-top: 5rem; font-size: 0.9rem; font-weight: 500;">O mapa será carregado aqui (Integração Google Maps)</p>
                </div>
            </div>

        </div>
    </div>
    `;

    container.innerHTML = html;
}
