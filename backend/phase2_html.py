
# -*- coding: utf-8 -*-
"""
FASE 2 — HTML
Substitui a section view-conf-integracao + seus modais
por nova versão com layout idêntico às avaliações.
"""
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

OLD_START = '                <section id="view-conf-integracao" class="content-view">'
OLD_END   = '<!-- VIEW: FACULDADE -->'
idx_start = content.index(OLD_START)
idx_end   = content.index(OLD_END)
assert idx_start < idx_end

NEW_HTML = '''                <section id="view-conf-integracao" class="content-view">
                    <div id="conf-integ-main-container">
                        <!-- Renderizado por integracao.js → loadConfIntegracao() -->
                        <div style="padding:3rem;text-align:center;color:#94a3b8;">
                            <i class="ph ph-spinner-gap" style="font-size:2rem;"></i>
                            <p style="margin-top:0.75rem;">Carregando configurações...</p>
                        </div>
                    </div>
                </section>

                <!-- Modal: Nova/Editar Categoria de Integração -->
                <div id="modal-integ-categoria" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">
                    <div style="background:#fff;border-radius:16px;width:100%;max-width:440px;box-shadow:0 25px 60px rgba(0,0,0,0.25);overflow:hidden;">
                        <div style="background:linear-gradient(135deg,#0f4c81,#1d6fb8);padding:1.25rem 1.5rem;color:#fff;display:flex;justify-content:space-between;align-items:center;">
                            <h3 style="margin:0;font-weight:700;" id="modal-ic-title">Nova Categoria</h3>
                            <button onclick="window.fecharModalCategoria()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                                <i class="ph ph-x"></i>
                            </button>
                        </div>
                        <form id="form-integ-categoria" onsubmit="window.salvarCategoria(event)" style="padding:1.5rem;display:flex;flex-direction:column;gap:1rem;">
                            <input type="hidden" id="ic-id">
                            <div class="input-group">
                                <label>Nome da Categoria *</label>
                                <input type="text" id="ic-nome" placeholder="Ex: Documentação, TI, Benefícios..." required style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.95rem;">
                            </div>
                            <div class="input-group">
                                <label>Cor</label>
                                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                                    <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="ic-cor" value="#0f4c81" style="accent-color:#0f4c81;"> <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#0f4c81;"></span> Azul</label>
                                    <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="ic-cor" value="#7c3aed" style="accent-color:#7c3aed;"> <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#7c3aed;"></span> Roxo</label>
                                    <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="ic-cor" value="#059669" style="accent-color:#059669;"> <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#059669;"></span> Verde</label>
                                    <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="ic-cor" value="#d97706" style="accent-color:#d97706;"> <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#d97706;"></span> Âmbar</label>
                                    <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="ic-cor" value="#dc2626" style="accent-color:#dc2626;"> <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#dc2626;"></span> Vermelho</label>
                                    <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="ic-cor" value="#0891b2" style="accent-color:#0891b2;"> <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#0891b2;"></span> Ciano</label>
                                </div>
                            </div>
                            <div class="input-group">
                                <label>Ordem</label>
                                <input type="number" id="ic-ordem" value="0" min="0" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                            </div>
                            <div style="display:flex;gap:1rem;justify-content:flex-end;padding-top:0.5rem;">
                                <button type="button" onclick="window.fecharModalCategoria()" class="btn btn-secondary">Cancelar</button>
                                <button type="submit" class="btn btn-primary" style="background:#0f4c81;border-color:#0f4c81;display:flex;align-items:center;gap:6px;">
                                    <i class="ph ph-floppy-disk"></i> Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Modal: Nova/Editar Ação de Integração -->
                <div id="modal-integ-acao" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.55);z-index:9999;align-items:flex-start;justify-content:center;overflow-y:auto;">
                    <div style="background:#fff;border-radius:16px;width:100%;max-width:600px;box-shadow:0 25px 60px rgba(0,0,0,0.25);overflow:hidden;margin:2rem auto;">
                        <div style="background:linear-gradient(135deg,#059669,#0f4c81);padding:1.25rem 1.5rem;color:#fff;display:flex;justify-content:space-between;align-items:center;">
                            <h3 style="margin:0;font-weight:700;" id="modal-ia-title">Nova Ação</h3>
                            <button onclick="window.fecharModalAcao()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                                <i class="ph ph-x"></i>
                            </button>
                        </div>
                        <form id="form-integ-acao" onsubmit="window.salvarAcao(event)" style="padding:1.5rem;display:flex;flex-direction:column;gap:1rem;">
                            <input type="hidden" id="ia-id">
                            <div class="input-group">
                                <label>Título da Ação *</label>
                                <input type="text" id="ia-titulo" placeholder="Ex: Configurar acesso ao sistema" required style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.95rem;">
                            </div>
                            <div class="input-group">
                                <label>Descrição</label>
                                <textarea id="ia-descricao" rows="2" placeholder="Detalhes sobre como executar..." style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;resize:vertical;"></textarea>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                                <div class="input-group">
                                    <label>Categoria *</label>
                                    <select id="ia-categoria" required style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                                        <option value="">— Selecione —</option>
                                    </select>
                                </div>
                                <div class="input-group">
                                    <label>Condição</label>
                                    <select id="ia-condicao" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                                        <option value="">Sem condição (sempre)</option>
                                        <option value="vt">Somente VT</option>
                                        <option value="vc">Somente VC</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Departamentos -->
                            <div>
                                <label style="font-weight:600;font-size:0.88rem;color:#374151;display:block;margin-bottom:0.5rem;">
                                    <i class="ph ph-buildings" style="color:#0f4c81;"></i> Departamentos
                                </label>
                                <p style="font-size:0.8rem;color:#64748b;margin:0 0 0.6rem;">Para quais departamentos esta ação se aplica?</p>
                                <div style="padding:10px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
                                    <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;cursor:pointer;font-size:0.88rem;font-weight:600;color:#0f172a;">
                                        <input type="checkbox" id="ia-depto-todos" value="todos" style="accent-color:#0f4c81;width:15px;height:15px;" onchange="window.toggleTodosDeptos(this)">
                                        Todos os departamentos
                                    </label>
                                    <div id="ia-deptos-lista" style="display:flex;flex-direction:column;gap:6px;padding-top:6px;border-top:1px solid #e2e8f0;">
                                        <!-- preenchido via JS -->
                                    </div>
                                </div>
                            </div>

                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                                <div class="input-group">
                                    <label>Responsável</label>
                                    <select id="ia-responsavel" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                                        <option value="">— Nenhum —</option>
                                    </select>
                                </div>
                                <div class="input-group">
                                    <label>Ordem</label>
                                    <input type="number" id="ia-ordem" value="0" min="0" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                                </div>
                            </div>
                            <div style="display:flex;gap:1rem;justify-content:flex-end;padding-top:0.5rem;border-top:1px solid #e2e8f0;margin-top:0.25rem;">
                                <button type="button" onclick="window.fecharModalAcao()" class="btn btn-secondary">Cancelar</button>
                                <button type="submit" class="btn btn-primary" style="background:#059669;border-color:#059669;display:flex;align-items:center;gap:6px;">
                                    <i class="ph ph-floppy-disk"></i> Salvar Ação
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

'''

content = content[:idx_start] + NEW_HTML + content[idx_end:]

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print('OK: index.html reconstruído')
print(f'  view-conf-integracao: {content.count("view-conf-integracao")}')
print(f'  modal-integ-categoria: {content.count("modal-integ-categoria")}')
print(f'  modal-integ-acao: {content.count("modal-integ-acao")}')
