// Reescreve o bloco problemático do modal de estoque de forma cirúrgica
const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

// Encontrar o ponto de início e fim do bloco problemático
// Início: a tag <form id="form-estoque"
// Fim: </form>
// Vamos extrair e reescrever apenas o interior do form

// Encontrar a linha com <form id="form-estoque"
const formStart = html.indexOf('<form id="form-estoque"');
const formEnd = html.indexOf('</form>', formStart) + '</form>'.length;

const before = html.slice(0, formStart);
const after = html.slice(formEnd);

const newForm = `<form id="form-estoque" onsubmit="window.salvarEstoque(event)">
                            <input type="hidden" id="estoque-id">

                            <div style="display:flex;gap:2rem;">
                                <!-- Coluna da Foto -->
                                <div style="width:150px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:1rem;">
                                    <div style="width:150px;height:150px;border-radius:8px;border:2px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;background:#f8fafc;overflow:hidden;position:relative;">
                                        <img id="estoque-foto-preview" src="" style="width:100%;height:100%;object-fit:cover;display:none;">
                                        <i id="estoque-foto-icon" class="ph ph-camera" style="font-size:2.5rem;color:#94a3b8;"></i>
                                    </div>
                                    <label class="btn btn-sm" style="background:#f1f5f9;border:1px solid #cbd5e1;color:#475569;cursor:pointer;width:100%;text-align:center;">
                                        <i class="ph ph-upload-simple"></i> Escolher Foto
                                        <input type="file" id="estoque-foto" accept="image/*" style="display:none;" onchange="window.previewEstoqueFoto(event)">
                                    </label>
                                    <input type="hidden" id="estoque-foto-base64">
                                </div>

                                <!-- Coluna dos Dados -->
                                <div style="flex:1;">
                                    <div style="margin-bottom:1rem;">
                                        <label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85rem;color:#475569;">Nome do Item *</label>
                                        <input type="text" id="estoque-nome" required class="form-control" placeholder="Ex: Capacete">
                                    </div>
                                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                                        <div>
                                            <label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85rem;color:#475569;">Departamento *</label>
                                            <select id="estoque-dept" required class="form-control">
                                                <option value="RH">RH</option>
                                                <option value="Administrativo">Administrativo</option>
                                                <option value="Logística">Logística</option>
                                                <option value="Financeiro">Financeiro</option>
                                                <option value="Comercial">Comercial</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85rem;color:#475569;">Categoria *</label>
                                            <select id="estoque-cat" required class="form-control">
                                                <option value="EPI">EPI</option>
                                                <option value="Uniforme">Uniforme</option>
                                                <option value="Itens de Escritório">Itens de Escritório</option>
                                                <option value="Outros">Outros</option>
                                            </select>
                                        </div>
                                    </div>
                                    <!-- Campos globais de Qtd/Mín/Máx removidos — controle é por endereço -->
                                    <input type="hidden" id="estoque-qtd" value="0">
                                    <input type="hidden" id="estoque-min" value="0">
                                    <input type="hidden" id="estoque-max" value="0">
                                </div><!-- fim coluna dados -->
                            </div><!-- fim flex foto+dados -->

                            <!-- SEÇÃO: ENDEREÇOS DO PRODUTO -->
                            <div style="margin-top:1.5rem;border-top:1px solid #e2e8f0;padding-top:1.2rem;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
                                    <label style="font-weight:700;font-size:0.88rem;color:#334155;display:flex;align-items:center;gap:6px;">
                                        <i class="ph ph-map-pin" style="color:#1d4ed8;"></i> Endereços do Produto
                                    </label>
                                    <button type="button" onclick="window._adicionarLinhaEndereco()" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;padding:4px 12px;font-size:0.8rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;">
                                        <i class="ph ph-plus"></i> Adicionar Endereço
                                    </button>
                                </div>
                                <div id="estoque-enderecos-lista" style="display:flex;flex-direction:column;gap:8px;max-height:200px;overflow-y:auto;">
                                    <!-- linhas adicionadas dinamicamente -->
                                </div>
                                <p id="estoque-enderecos-vazio" style="font-size:0.8rem;color:#94a3b8;font-style:italic;margin:6px 0 0;">Nenhum endereço vinculado. Use o botão acima para adicionar. Para novos produtos, pelo menos 1 endereço é obrigatório.</p>
                            </div>

                            <div style="display:flex;justify-content:flex-end;gap:1rem;margin-top:1rem;">
                                <button type="button" class="btn btn-secondary" onclick="window.fecharModalEstoque()">Cancelar</button>
                                <button type="submit" id="btn-salvar-estoque" class="btn btn-primary" style="background:#e67700;border-color:#e67700;">Salvar Item</button>
                            </div>
                        </form>`;

html = before + newForm + after;
fs.writeFileSync('frontend/index.html', html, 'utf8');
console.log('✅ Modal de estoque reescrito com estrutura limpa');

// Verificar
const check = html.includes('id="estoque-qtd"') && html.includes('id="estoque-enderecos-lista"');
console.log('Campos verificados:', check ? '✅ OK' : '❌ Faltando');
const count = (html.match(/id="estoque-qtd"/g) || []).length;
console.log(`Ocorrências estoque-qtd: ${count} (deve ser 1)`);
