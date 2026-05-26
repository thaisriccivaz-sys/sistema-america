const fs = require('fs');

let html = fs.readFileSync('frontend/index.html', 'utf8');

// 1. ADICIONAR MENU NO COMERCIAL
const menuComercial = `<div class="dept-submenu-header" style="color:#7048e8;"><i class="ph ph-handshake"></i> Comercial</div>
                    <a href="#" class="nav-item" data-target="comercial-em-breve" style="color:#94a3b8;pointer-events:none;"><i class="ph ph-hourglass"></i> Em breve...</a>`;
const menuComercialNovo = `<div class="dept-submenu-header" style="color:#7048e8;"><i class="ph ph-handshake"></i> Comercial</div>
                    <a href="#" class="nav-item" data-target="comercial-credenciamento" onclick="navigateTo('comercial-credenciamento'); return false;"><i class="ph ph-identification-card"></i> Solicitar Credencial</a>`;
                    
if (html.includes(menuComercial)) {
    html = html.replace(menuComercial, menuComercialNovo);
}

// 2. ADICIONAR VIEW DO COMERCIAL E MODAL DE SOLICITAÇÃO
const newView = `
                <!-- VIEW: COMERCIAL - CREDENCIAMENTO -->
                <section id="view-comercial-credenciamento" class="content-view" style="padding:1.5rem;">
                    <div class="page-header flex-between" style="margin-bottom: 2rem;">
                        <div>
                            <h2 style="font-size: 1.5rem; color: #1e293b; font-weight: bold; margin-bottom: 0.2rem;"><i class="ph ph-handshake" style="margin-right:8px; color:#7048e8;"></i> Solicitar Credenciamento</h2>
                            <p style="color: #64748b; font-size: 0.95rem;">Solicite o credenciamento de equipe e frota para a Logística.</p>
                        </div>
                        <div>
                            <button class="btn btn-primary" onclick="window.abrirModalSolicitarCredenciamento()" style="display:flex; align-items:center; gap:8px; background-color: #7048e8; border-color: #7048e8;">
                                <i class="ph ph-plus"></i> Nova Solicitação
                            </button>
                        </div>
                    </div>

                    <div class="card" style="margin-top: 2rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                            <div style="display:flex; align-items:center; gap: 15px; flex-wrap: wrap;">
                                <h3><i class="ph ph-list-dashes"></i> Minhas Solicitações</h3>
                                <div style="position:relative;">
                                    <i class="ph ph-magnifying-glass" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8;"></i>
                                    <input type="text" id="filtro-pesquisa-com-cred" class="form-control" placeholder="Buscar cliente ou e-mail..." onkeyup="window.filtrarHistoricoComCred()" style="width: 300px; padding: 6px 12px 6px 30px;">
                                </div>
                            </div>
                            <button class="btn btn-outline" style="padding: 4px 12px; font-size: 12px;" onclick="window.carregarHistoricoComCred()">
                                <i class="ph ph-arrows-clockwise"></i> Atualizar
                            </button>
                        </div>
                        <div class="table-responsive" style="max-height: calc(100vh - 280px); overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <table class="table" style="font-size:0.85rem; margin:0; width:100%;">
                                <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                    <tr>
                                        <th style="cursor:pointer;" onclick="window.ordenarHistoricoComCred('cliente')">Cliente / Obra <i class="ph ph-arrows-down-up"></i></th>
                                        <th>Colaboradores (Qtd Max)</th>
                                        <th>Veículos (Qtd Max)</th>
                                        <th>Licenças</th>
                                        <th>Data Limite</th>
                                        <th style="cursor:pointer;" onclick="window.ordenarHistoricoComCred('data')">Status <i class="ph ph-arrows-down-up"></i></th>
                                        <th style="text-align:right;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="tbody-comercial-cred">
                                    <tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:2rem;">Carregando histórico...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <!-- MODAL: SOLICITAR CREDENCIAMENTO -->
                <div id="modal-solicitar-credenciamento" class="modal" style="z-index:9998; padding:20px;">
                    <div class="modal-content" style="max-width: 900px; height: calc(100vh - 40px); display: flex; flex-direction: column;">
                        <div class="modal-header">
                            <h2 style="margin:0;"><i class="ph ph-paper-plane-tilt" style="color:#7048e8; margin-right:8px;"></i> Solicitação de Credenciamento</h2>
                            <span class="close-modal" onclick="window.fecharModalSolicitarCredenciamento()">&times;</span>
                        </div>
                        <div class="modal-body" style="flex:1; overflow-y:auto; padding:1.5rem;">
                            
                            <div class="card" style="margin-bottom: 1.5rem;">
                                <h3><i class="ph ph-user"></i> Dados do Cliente</h3>
                                <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                                    <div class="form-group">
                                        <label>Nome do Cliente / Obra <span class="required">*</span></label>
                                        <input type="text" id="solic-cliente-nome" placeholder="Ex: Construtora XPTO">
                                    </div>
                                    <div class="form-group">
                                        <label>E-mail do Cliente <span class="required">*</span></label>
                                        <input type="email" id="solic-cliente-email" placeholder="Ex: contato@xpto.com.br">
                                    </div>
                                    <div class="form-group" style="grid-column: 1 / -1;">
                                        <label>Endereço de Instalação</label>
                                        <input type="text" id="solic-endereco-instalacao" placeholder="Ex: Rua das Flores, 123 - Centro">
                                    </div>
                                </div>
                            </div>

                            <div class="card" style="margin-bottom: 1.5rem;">
                                <h3><i class="ph ph-users"></i> Requisitos da Equipe e Frota</h3>
                                <div class="form-grid" style="grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                                    <div class="form-group">
                                        <label>Máx. Colaboradores</label>
                                        <input type="number" id="solic-qtd-colabs" value="0" min="0">
                                    </div>
                                    <div class="form-group">
                                        <label>Máx. Veículos</label>
                                        <input type="number" id="solic-qtd-veiculos" value="0" min="0">
                                    </div>
                                    <div class="form-group">
                                        <label>Data Limite para Envio</label>
                                        <input type="date" id="solic-data-limite">
                                    </div>
                                </div>
                            </div>

                            <div class="card" style="margin-bottom: 1.5rem;">
                                <h3 style="margin-bottom: 1rem;"><i class="ph ph-files"></i> Documentos Exigidos (Colaboradores)</h3>
                                <div class="form-grid" style="grid-template-columns: repeat(4, 1fr); gap: 10px;" id="solic-docs-exigidos">
                                    <div><label><input type="checkbox" value="cnh"> CNH</label></div>
                                    <div><label><input type="checkbox" value="cpf"> CPF</label></div>
                                    <div><label><input type="checkbox" value="aso"> ASO</label></div>
                                    <div><label><input type="checkbox" value="ficha_registro"> Ficha de Registro</label></div>
                                    <div><label><input type="checkbox" value="treinamento"> Carteira de Vacinação</label></div>
                                    <div><label><input type="checkbox" value="epi"> Ficha de EPI</label></div>
                                    <div><label><input type="checkbox" value="contrato_esocial"> Contrato e-social</label></div>
                                    <div><label><input type="checkbox" value="nr1"> NR1 / Ordem de Serviço</label></div>
                                </div>
                            </div>

                            <div class="card" style="margin-bottom: 1.5rem;">
                                <h3 style="margin-bottom: 1rem;"><i class="ph ph-seal-check"></i> Licenças da Empresa Exigidas</h3>
                                <div id="solic-licencas-list" style="display:flex; flex-direction:column; gap: 8px; border: 1px solid #e2e8f0; padding:10px; border-radius:4px; max-height:200px; overflow-y:auto;">
                                    <p style="color:#94a3b8; font-size:13px;">Carregando licenças disponíveis...</p>
                                </div>
                            </div>

                        </div>
                        <div class="modal-footer" style="padding:15px; border-top:1px solid #e2e8f0; background:#f8fafc; text-align:right;">
                            <input type="hidden" id="solic-id-edit" value="">
                            <button class="btn btn-outline" onclick="window.fecharModalSolicitarCredenciamento()">Cancelar</button>
                            <button class="btn btn-primary" style="background-color: #7048e8; border-color: #7048e8;" onclick="window.salvarSolicitacaoCredenciamento()"><i class="ph ph-paper-plane-right"></i> Salvar e Notificar Logística</button>
                        </div>
                    </div>
                </div>
`;

if (!html.includes('id="view-comercial-credenciamento"')) {
    const attachPoint = '<!-- VIEW: LICENCAS -->';
    html = html.replace(attachPoint, newView + '\n                ' + attachPoint);
}

// 3. ADICIONAR SCRIPT NO INDEX.HTML
if (!html.includes('comercial_credenciamento.js')) {
    html = html.replace('<script src="credenciamento.js"></script>', '<script src="credenciamento.js"></script>\n    <script src="comercial_credenciamento.js"></script>');
}

fs.writeFileSync('frontend/index.html', html, 'utf8');
console.log('index.html atualizado para suportar credenciamento comercial');
