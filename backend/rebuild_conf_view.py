
# -*- coding: utf-8 -*-
"""
Fase 2: HTML - Reestrutura view-conf-integracao com 2 abas:
  Tab 1 - Templates Padrao (lista por secoes/grupos)
  Tab 2 - Templates por Departamento (CRUD)
+ Modal novo-passo (existente, preservado)
+ Modal novo-template-depto (novo)
"""

f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html'

with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# Localizar o bloco atual (section + modal-conf-integ-passo) que termina antes do VIEW: FACULDADE
OLD_START = '                <section id="view-conf-integracao" class="content-view">'
OLD_END   = '<!-- VIEW: FACULDADE -->'

idx_start = content.index(OLD_START)
idx_end   = content.index(OLD_END)

assert idx_start < idx_end, 'Ordem incorreta'

NEW_HTML = '''                <section id="view-conf-integracao" class="content-view">
                    <!-- Header fixo -->
                    <div class="page-header flex-between" style="position:sticky;top:60px;z-index:20;background:var(--bg-main);padding:1.25rem 0;margin-top:-1.5rem;margin-bottom:0;border-bottom:1px solid var(--border-color);">
                        <div style="display:flex;align-items:center;gap:1.2rem;">
                            <div style="width:52px;height:52px;border-radius:12px;background:linear-gradient(135deg,#d9480f,#f59e0b);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.6rem;">
                                <i class="ph ph-sliders-horizontal"></i>
                            </div>
                            <div>
                                <h1 style="margin:0;font-size:1.5rem;font-weight:700;color:#0f172a;">Configuração de Integração</h1>
                                <p style="margin:2px 0 0;color:#64748b;font-size:0.88rem;">Templates padrão e templates personalizados por departamento.</p>
                            </div>
                        </div>
                        <div style="display:flex;gap:10px;align-items:center;" id="conf-integ-header-actions">
                            <!-- botões dinâmicos por aba -->
                        </div>
                    </div>

                    <!-- Tab Nav -->
                    <div style="display:flex;gap:0;border-bottom:2px solid #e2e8f0;margin-bottom:1.5rem;margin-top:1rem;">
                        <button id="tab-btn-ci-padrao" onclick="window.switchConfIntegTab('padrao')"
                            style="padding:10px 22px;border:none;background:none;font-size:0.9rem;font-weight:600;cursor:pointer;color:var(--primary-color);border-bottom:2px solid var(--primary-color);margin-bottom:-2px;display:flex;align-items:center;gap:6px;transition:all .2s;">
                            <i class="ph ph-list-checks"></i> Templates Padrão
                        </button>
                        <button id="tab-btn-ci-depto" onclick="window.switchConfIntegTab('depto')"
                            style="padding:10px 22px;border:none;background:none;font-size:0.9rem;font-weight:500;cursor:pointer;color:#64748b;border-bottom:2px solid transparent;margin-bottom:-2px;display:flex;align-items:center;gap:6px;transition:all .2s;">
                            <i class="ph ph-buildings"></i> Templates por Departamento
                        </button>
                    </div>

                    <!-- ===== TAB 1: Templates Padrão ===== -->
                    <div id="panel-ci-padrao">
                        <div id="conf-integ-secoes">
                            <div style="text-align:center;padding:3rem;color:#94a3b8;">
                                <i class="ph ph-spinner" style="font-size:2rem;"></i><br>Carregando...
                            </div>
                        </div>
                    </div>

                    <!-- ===== TAB 2: Templates por Departamento ===== -->
                    <div id="panel-ci-depto" style="display:none;">
                        <div id="conf-depto-lista">
                            <div style="text-align:center;padding:3rem;color:#94a3b8;">
                                <i class="ph ph-spinner" style="font-size:2rem;"></i><br>Carregando...
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Modal: Novo/Editar Passo Padrão -->
                <div id="modal-conf-integ-passo" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">
                    <div style="background:#fff;border-radius:16px;padding:0;width:100%;max-width:540px;box-shadow:0 25px 50px rgba(0,0,0,0.2);overflow:hidden;">
                        <div style="background:linear-gradient(135deg,#059669,#0f4c81);padding:1.25rem 1.5rem;color:#fff;display:flex;justify-content:space-between;align-items:center;">
                            <h3 style="margin:0;font-weight:700;" id="modal-conf-integ-title">Novo Passo Padrão</h3>
                            <button onclick="window.fecharModalPasso()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                                <i class="ph ph-x"></i>
                            </button>
                        </div>
                        <form id="form-conf-integ-passo" onsubmit="window.salvarPasso(event)" style="padding:1.5rem;display:flex;flex-direction:column;gap:1rem;">
                            <input type="hidden" id="conf-passo-id">
                            <div class="input-group">
                                <label>Título do Passo *</label>
                                <input type="text" id="conf-passo-titulo" placeholder="Ex: Configurar ponto eletrônico" required style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.95rem;">
                            </div>
                            <div class="input-group">
                                <label>Descrição</label>
                                <textarea id="conf-passo-descricao" rows="2" placeholder="Detalhes sobre como executar esta atividade..." style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;resize:vertical;"></textarea>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                                <div class="input-group">
                                    <label>Grupo *</label>
                                    <select id="conf-passo-grupo" required style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                                        <option value="todos">Para Todos</option>
                                        <option value="administrativo">Administrativo</option>
                                        <option value="motorista">Motorista</option>
                                        <option value="operacional">Operacional</option>
                                        <option value="acompanhamento">Acompanhamento</option>
                                    </select>
                                </div>
                                <div class="input-group">
                                    <label>Condição</label>
                                    <select id="conf-passo-condicao" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                                        <option value="">Sem condição (sempre)</option>
                                        <option value="vt">Somente VT (Vale Transporte)</option>
                                        <option value="vc">Somente VC (Vale Combustível)</option>
                                    </select>
                                </div>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                                <div class="input-group">
                                    <label>Responsável</label>
                                    <select id="conf-passo-responsavel" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                                        <option value="">— Nenhum —</option>
                                    </select>
                                </div>
                                <div class="input-group">
                                    <label>Ordem</label>
                                    <input type="number" id="conf-passo-ordem" value="0" min="0" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                                </div>
                            </div>
                            <div style="display:flex;gap:1rem;justify-content:flex-end;padding-top:0.5rem;">
                                <button type="button" onclick="window.fecharModalPasso()" class="btn btn-secondary">Cancelar</button>
                                <button type="submit" class="btn btn-primary" style="background:#059669;border-color:#059669;display:flex;align-items:center;gap:6px;">
                                    <i class="ph ph-floppy-disk"></i> Salvar Passo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Modal: Novo/Editar Template por Departamento -->
                <div id="modal-template-depto" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.55);z-index:9999;align-items:center;justify-content:center;overflow-y:auto;">
                    <div style="background:#fff;border-radius:16px;width:100%;max-width:680px;box-shadow:0 25px 60px rgba(0,0,0,0.25);overflow:hidden;margin:2rem auto;">
                        <div style="background:linear-gradient(135deg,#7c3aed,#0f4c81);padding:1.25rem 1.5rem;color:#fff;display:flex;justify-content:space-between;align-items:center;">
                            <h3 style="margin:0;font-weight:700;" id="modal-td-title">Novo Template de Departamento</h3>
                            <button onclick="window.fecharModalTemplateDepto()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                                <i class="ph ph-x"></i>
                            </button>
                        </div>
                        <form id="form-template-depto" onsubmit="window.salvarTemplateDepto(event)" style="padding:1.5rem;display:flex;flex-direction:column;gap:1.25rem;">
                            <input type="hidden" id="td-id">
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                                <div class="input-group">
                                    <label>Nome do Template *</label>
                                    <input type="text" id="td-nome" placeholder="Ex: Integração Logística" required style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.95rem;">
                                </div>
                                <div class="input-group">
                                    <label>Departamento</label>
                                    <select id="td-departamento" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                                        <option value="">— Todos os departamentos —</option>
                                    </select>
                                </div>
                            </div>
                            <div class="input-group">
                                <label>Descrição</label>
                                <textarea id="td-descricao" rows="2" placeholder="Descreva o objetivo deste template..." style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;resize:vertical;"></textarea>
                            </div>

                            <!-- Grupos padrão incluídos -->
                            <div>
                                <label style="font-weight:600;font-size:0.88rem;color:#374151;display:block;margin-bottom:0.75rem;">
                                    <i class="ph ph-list-checks" style="color:#7c3aed;"></i> Grupos Padrão Incluídos
                                </label>
                                <p style="font-size:0.82rem;color:#64748b;margin:0 0 0.75rem;">Selecione quais grupos de ações padrão serão incluídas automaticamente neste template:</p>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;" id="td-grupos-checkboxes">
                                    <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid #e2e8f0;border-radius:10px;cursor:pointer;font-size:0.9rem;color:#374151;transition:all .15s;">
                                        <input type="checkbox" name="td-grupo" value="todos" style="accent-color:#7c3aed;width:16px;height:16px;">
                                        <i class="ph ph-users" style="color:#0f4c81;"></i> Para Todos
                                    </label>
                                    <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid #e2e8f0;border-radius:10px;cursor:pointer;font-size:0.9rem;color:#374151;transition:all .15s;">
                                        <input type="checkbox" name="td-grupo" value="administrativo" style="accent-color:#7c3aed;width:16px;height:16px;">
                                        <i class="ph ph-desktop" style="color:#7c3aed;"></i> Administrativo
                                    </label>
                                    <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid #e2e8f0;border-radius:10px;cursor:pointer;font-size:0.9rem;color:#374151;transition:all .15s;">
                                        <input type="checkbox" name="td-grupo" value="motorista" style="accent-color:#7c3aed;width:16px;height:16px;">
                                        <i class="ph ph-truck" style="color:#d97706;"></i> Motorista
                                    </label>
                                    <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid #e2e8f0;border-radius:10px;cursor:pointer;font-size:0.9rem;color:#374151;transition:all .15s;">
                                        <input type="checkbox" name="td-grupo" value="operacional" style="accent-color:#7c3aed;width:16px;height:16px;">
                                        <i class="ph ph-hard-hat" style="color:#059669;"></i> Operacional
                                    </label>
                                    <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid #e2e8f0;border-radius:10px;cursor:pointer;font-size:0.9rem;color:#374151;transition:all .15s;">
                                        <input type="checkbox" name="td-grupo" value="acompanhamento" style="accent-color:#7c3aed;width:16px;height:16px;">
                                        <i class="ph ph-calendar-check" style="color:#dc2626;"></i> Acompanhamento
                                    </label>
                                </div>
                            </div>

                            <!-- Ações exclusivas do departamento -->
                            <div>
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
                                    <label style="font-weight:600;font-size:0.88rem;color:#374151;">
                                        <i class="ph ph-star" style="color:#d97706;"></i> Ações Exclusivas do Departamento
                                    </label>
                                    <button type="button" onclick="window.addAcaoCustom()" style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:6px 14px;font-size:0.82rem;cursor:pointer;display:flex;align-items:center;gap:5px;">
                                        <i class="ph ph-plus"></i> Adicionar Ação
                                    </button>
                                </div>
                                <p style="font-size:0.82rem;color:#64748b;margin:0 0 0.75rem;">Ações específicas que só aparecem para este departamento:</p>
                                <div id="td-acoes-lista" style="display:flex;flex-direction:column;gap:0.6rem;">
                                    <!-- linhas dinâmicas -->
                                </div>
                                <div id="td-acoes-empty" style="text-align:center;padding:1.5rem;color:#94a3b8;border:2px dashed #e2e8f0;border-radius:10px;font-size:0.88rem;">
                                    <i class="ph ph-plus-circle" style="font-size:1.5rem;display:block;margin-bottom:4px;"></i>
                                    Nenhuma ação exclusiva. Clique em "Adicionar Ação" para incluir.
                                </div>
                            </div>

                            <div style="display:flex;gap:1rem;justify-content:flex-end;padding-top:0.5rem;border-top:1px solid #e2e8f0;margin-top:0.5rem;">
                                <button type="button" onclick="window.fecharModalTemplateDepto()" class="btn btn-secondary">Cancelar</button>
                                <button type="submit" class="btn btn-primary" style="background:#7c3aed;border-color:#7c3aed;display:flex;align-items:center;gap:6px;">
                                    <i class="ph ph-floppy-disk"></i> Salvar Template
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

'''

content = content[:idx_start] + NEW_HTML + content[idx_end:]

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print('OK index.html reescrito')
print(f'   view-conf-integracao: {content.count("view-conf-integracao")} ocorrencias')
print(f'   modal-template-depto: {content.count("modal-template-depto")} ocorrencias')
