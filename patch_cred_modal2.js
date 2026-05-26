const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

// The modal body is inside <div id="modal-novo-credenciamento" ...>
const modalStart = html.indexOf('<!-- MODAL: NOVO CREDENCIAMENTO (TELA CHEIA) -->');
if (modalStart === -1) {
    console.log("Error: Modal start not found");
    process.exit(1);
}

const modalContentStart = html.indexOf('<div style="padding:1.5rem; overflow-y:auto; flex:1;">', modalStart) + '<div style="padding:1.5rem; overflow-y:auto; flex:1;">'.length;
const modalContentEnd = html.indexOf('</div>\r\n        </div>\r\n    </div>', modalContentStart);

const newLayout = `
                <!-- Layout reorganizado conforme pedido -->
                
                <!-- 1. Dados do Cliente -->
                <div class="card" style="margin-bottom: 1.5rem;">
                    <h3><i class="ph ph-user"></i> Dados do Cliente</h3>
                    <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                        <div class="form-group">
                            <label>Nome do Cliente / Obra <span class="required">*</span></label>
                            <input type="text" id="cred-cliente-nome" placeholder="Ex: Construtora XPTO">
                        </div>
                        <div class="form-group">
                            <label>E-mail do Cliente <span class="required">*</span></label>
                            <input type="email" id="cred-cliente-email" placeholder="Ex: contato@xpto.com.br">
                        </div>
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label>Endereço de Instalação</label>
                            <input type="text" id="cred-endereco-instalacao" placeholder="Ex: Rua das Flores, 123 - Centro">
                        </div>
                    </div>
                </div>

                <!-- 2. Documentos -->
                <div class="card" style="margin-bottom: 1.5rem;">
                    <h3 style="margin-bottom: 1rem;"><i class="ph ph-files"></i> Documentos Exigidos</h3>
                    <div class="form-grid" style="grid-template-columns: repeat(4, 1fr); gap: 10px;" id="cred-docs-exigidos">
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

                <!-- 3. Colaboradores e Veículos -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 1.5rem;">
                    <div class="card">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                            <h3><i class="ph ph-users"></i> Colaboradores</h3>
                            <button class="btn btn-outline" style="padding: 4px 8px; font-size: 12px;" onclick="window.abrirModalAddCredColab()"><i class="ph ph-plus"></i> Adicionar</button>
                        </div>
                        <div id="cred-colabs-list" style="display:flex; flex-direction:column; gap: 8px;">
                            <p style="color:#94a3b8; font-size:13px; font-style:italic;">Nenhum colaborador selecionado.</p>
                        </div>
                    </div>

                    <div class="card">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                            <h3><i class="ph ph-truck"></i> Veículos</h3>
                            <button class="btn btn-outline" style="padding: 4px 8px; font-size: 12px;" onclick="window.abrirModalAddCredVeic()"><i class="ph ph-plus"></i> Adicionar</button>
                        </div>
                        <div id="cred-veiculos-list" style="display:flex; flex-direction:column; gap: 8px;">
                            <p style="color:#94a3b8; font-size:13px; font-style:italic;">Nenhum veículo selecionado.</p>
                        </div>
                    </div>
                </div>

                <!-- 4. Licenças -->
                <div class="card" style="margin-bottom: 1.5rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                        <h3><i class="ph ph-seal-check" style="color:#16a34a;"></i> Licenças da Empresa</h3>
                        <button class="btn btn-outline" style="padding: 4px 8px; font-size: 12px;" onclick="window.abrirModalAddCredLicenca()"><i class="ph ph-plus"></i> Adicionar</button>
                    </div>
                    <div id="cred-licencas-list" style="display:flex; flex-direction:column; gap: 8px;">
                        <p style="color:#94a3b8; font-size:13px; font-style:italic;">Nenhuma licença selecionada.</p>
                    </div>
                </div>

                <!-- 5. Botão Enviar -->
                <div class="card" style="background:#f8fafc; border: 1px solid #e2e8f0; text-align: center;">
                    <i class="ph ph-envelope-simple" style="font-size: 2.5rem; color: #2d9e5f; margin-bottom: 1rem;"></i>
                    <h3 style="margin-bottom: 0.5rem;">Enviar Credenciamento</h3>
                    <p style="color:#64748b; font-size:13px; margin-bottom: 1.5rem;">Um e-mail será enviado com um link seguro válido por 7 dias, contendo todos os documentos e certificados da equipe selecionada.</p>
                    <button class="btn btn-primary" style="width: 100%; justify-content: center; padding: 12px; font-size: 1rem;" onclick="window.gerarEnviarCredenciamento()" id="btn-enviar-cred">
                        <i class="ph ph-paper-plane-right"></i> Gerar e Enviar E-mail
                    </button>
                </div>
`;

html = html.substring(0, modalContentStart) + newLayout + html.substring(modalContentEnd);
fs.writeFileSync('frontend/index.html', html, 'utf8');
console.log('Layout reorganizado.');
