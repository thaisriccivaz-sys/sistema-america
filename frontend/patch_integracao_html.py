
import re

# ──────────────────────────────────────────────────────────────────────────────
# 1. index.html: Add "Conf. Integra." to Diretoria menu + badge to Integração
# ──────────────────────────────────────────────────────────────────────────────
html_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html'

with open(html_file, 'r', encoding='utf-8', errors='replace') as fh:
    html = fh.read()

# 1a. Add badge to existing Integração nav-item (in RH submenu)
old_integracao_nav = '<a href="#" class="nav-item" data-target="integracao"><i class="ph ph-users-three"></i>\n                        Integra&ccedil;&atilde;o</a>'
new_integracao_nav = '<a href="#" class="nav-item" data-target="integracao" id="nav-integracao-item"><i class="ph ph-users-three"></i>\n                        Integra&ccedil;&atilde;o <span id="integracao-badge" style="display:none;background:#ef4444;color:#fff;border-radius:50%;font-size:0.65rem;font-weight:700;padding:1px 5px;margin-left:4px;min-width:16px;text-align:center;line-height:16px;">0</span></a>'

if old_integracao_nav in html:
    html = html.replace(old_integracao_nav, new_integracao_nav)
    print('✅ Badge added to Integração nav item')
else:
    print('⚠️ Integração nav item not found exactly — trying partial match')
    # Try with different whitespace
    html = re.sub(
        r'(<a href="#" class="nav-item" data-target="integracao">)(<i class="ph ph-users-three"></i>)\s*Integra&ccedil;&atilde;o</a>',
        r'<a href="#" class="nav-item" data-target="integracao" id="nav-integracao-item">\2\n                        Integra&ccedil;&atilde;o <span id="integracao-badge" style="display:none;background:#ef4444;color:#fff;border-radius:50%;font-size:0.65rem;font-weight:700;padding:1px 5px;margin-left:4px;min-width:16px;text-align:center;line-height:16px;">0</span></a>',
        html
    )
    print('✅ Badge added via regex')

# 1b. Add "Conf. Integra." item to Diretoria menu (before the Desenvolvedor nav-group)
old_dir_item = '<!-- ── Desenvolvedor (submenu aninhado) ────────────────── -->'
new_dir_item = '''<a href="#" class="nav-item" data-target="conf-integracao" onclick="navigateTo('conf-integracao'); return false;"><i class="ph ph-sliders-horizontal"></i> Conf. Integra.</a>
                    <!-- ── Desenvolvedor (submenu aninhado) ────────────────── -->'''

if old_dir_item in html:
    html = html.replace(old_dir_item, new_dir_item)
    print('✅ Conf. Integra. added to Diretoria menu')
else:
    print('⚠️ Diretoria marker not found')

# 1c. Replace the existing view-integracao section with a proper implementation
old_integracao_view_start = '<!-- VIEW: INTEGRA'
old_integracao_view_end = '</section>\n\n\n                <!-- VIEW: FACULDADE -->'

# Find start and end positions
start_idx = html.find('<!-- VIEW: INTEGRA')
if start_idx >= 0:
    # Find the next <!-- VIEW: comment after this one
    end_search_start = start_idx + 100
    faculdade_idx = html.find('<!-- VIEW: FACULDADE -->', end_search_start)
    if faculdade_idx >= 0:
        old_section = html[start_idx:faculdade_idx]
        new_integracao_view = '''<!-- VIEW: INTEGRAÇÃO -->
                <section id="view-integracao" class="content-view">
                    <div class="page-header flex-between" style="position:sticky;top:60px;z-index:20;background:var(--bg-main);padding:1.25rem 0;margin-top:-1.5rem;margin-bottom:1.5rem;border-bottom:1px solid var(--border-color);">
                        <div style="display:flex;align-items:center;gap:1.2rem;">
                            <div style="width:52px;height:52px;border-radius:12px;background:linear-gradient(135deg,#059669,#0f4c81);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.6rem;">
                                <i class="ph ph-handshake"></i>
                            </div>
                            <div>
                                <h1 style="margin:0;font-size:1.5rem;font-weight:700;color:#0f172a;">Processo de Integração</h1>
                                <p style="margin:2px 0 0;color:#64748b;font-size:0.88rem;">Acompanhe e confirme as atividades de integração dos colaboradores.</p>
                            </div>
                        </div>
                        <button onclick="window.loadIntegracaoProcessos()" class="btn btn-secondary" style="display:flex;align-items:center;gap:6px;">
                            <i class="ph ph-arrows-clockwise"></i> Atualizar
                        </button>
                    </div>

                    <!-- Filtro de status -->
                    <div style="display:flex;gap:8px;margin-bottom:1.2rem;flex-wrap:wrap;">
                        <button id="btn-filter-integ-todos" onclick="window.filterIntegracaoStatus('todos')"
                            class="btn btn-secondary" style="font-size:0.82rem;padding:6px 14px;border-radius:20px;background:#0f4c81;color:#fff;border:none;">
                            Todos
                        </button>
                        <button id="btn-filter-integ-pendente" onclick="window.filterIntegracaoStatus('pendente')"
                            class="btn btn-secondary" style="font-size:0.82rem;padding:6px 14px;border-radius:20px;">
                            <i class="ph ph-clock"></i> Pendente
                        </button>
                        <button id="btn-filter-integ-andamento" onclick="window.filterIntegracaoStatus('em_andamento')"
                            class="btn btn-secondary" style="font-size:0.82rem;padding:6px 14px;border-radius:20px;">
                            <i class="ph ph-spinner-gap"></i> Em Andamento
                        </button>
                    </div>

                    <div id="integracao-processos-lista" style="display:flex;flex-direction:column;gap:1rem;">
                        <div style="text-align:center;padding:3rem;color:#94a3b8;">
                            <i class="ph ph-spinner-gap" style="font-size:2rem;"></i>
                            <p style="margin-top:0.5rem;">Carregando...</p>
                        </div>
                    </div>

                    <!-- Modal de passos do processo -->
                    <div id="modal-integracao-processo" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:9999;overflow-y:auto;padding:2rem 1rem;">
                        <div style="max-width:700px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.2);">
                            <div style="background:linear-gradient(135deg,#0f4c81,#059669);padding:1.5rem 1.5rem 1rem;color:#fff;">
                                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                                    <div>
                                        <h2 style="margin:0;font-size:1.25rem;font-weight:700;" id="modal-integ-nome"></h2>
                                        <p style="margin:4px 0 0;opacity:0.85;font-size:0.88rem;" id="modal-integ-cargo"></p>
                                    </div>
                                    <button onclick="document.getElementById('modal-integracao-processo').style.display='none'"
                                        style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">
                                        <i class="ph ph-x"></i>
                                    </button>
                                </div>
                                <div style="margin-top:1rem;display:flex;gap:8px;flex-wrap:wrap;" id="modal-integ-badges"></div>
                            </div>
                            <div style="padding:1.5rem;" id="modal-integ-passos-container">
                                <!-- Passos renderizados via JS -->
                            </div>
                        </div>
                    </div>
                </section>

'''
        html = html[:start_idx] + new_integracao_view + html[faculdade_idx:]
        print('✅ view-integracao replaced')
    else:
        print('⚠️ Could not find end of integracao view section')
else:
    print('⚠️ view-integracao start not found')

# 1d. Add view-conf-integracao BEFORE view-faculdade
new_conf_view = '''<!-- VIEW: CONF. INTEGRAÇÃO -->
                <section id="view-conf-integracao" class="content-view">
                    <div class="page-header flex-between" style="position:sticky;top:60px;z-index:20;background:var(--bg-main);padding:1.25rem 0;margin-top:-1.5rem;margin-bottom:1.5rem;border-bottom:1px solid var(--border-color);">
                        <div style="display:flex;align-items:center;gap:1.2rem;">
                            <div style="width:52px;height:52px;border-radius:12px;background:linear-gradient(135deg,#d9480f,#f59e0b);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.6rem;">
                                <i class="ph ph-sliders-horizontal"></i>
                            </div>
                            <div>
                                <h1 style="margin:0;font-size:1.5rem;font-weight:700;color:#0f172a;">Configuração de Integração</h1>
                                <p style="margin:2px 0 0;color:#64748b;font-size:0.88rem;">Configure os passos e responsáveis do plano de integração.</p>
                            </div>
                        </div>
                        <button onclick="window.abrirModalNovoPasso()" class="btn btn-primary" style="display:flex;align-items:center;gap:6px;background:#059669;border-color:#059669;">
                            <i class="ph ph-plus"></i> Novo Passo
                        </button>
                    </div>

                    <!-- Tabela de passos configurados -->
                    <div class="card mb-4 p-0" style="overflow:hidden;">
                        <div style="padding:1rem 1.25rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;">
                            <h3 style="margin:0;font-size:1rem;font-weight:700;color:#0f172a;"><i class="ph ph-list-checks" style="color:#059669;"></i> Passos do Plano de Integração</h3>
                            <select id="conf-integ-filtro-grupo" onchange="window.filtrarConfIntegGrupo(this.value)"
                                style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;color:#334155;">
                                <option value="">Todos os grupos</option>
                                <option value="todos">Para Todos</option>
                                <option value="administrativo">Administrativo</option>
                                <option value="motorista">Motorista</option>
                                <option value="operacional">Operacional</option>
                                <option value="acompanhamento">Acompanhamento</option>
                            </select>
                        </div>
                        <div style="overflow-x:auto;">
                            <table style="width:100%;border-collapse:collapse;">
                                <thead>
                                    <tr style="background:#f8fafc;">
                                        <th style="padding:10px 12px;text-align:left;font-size:0.8rem;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Ordem</th>
                                        <th style="padding:10px 12px;text-align:left;font-size:0.8rem;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Título</th>
                                        <th style="padding:10px 12px;text-align:left;font-size:0.8rem;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Grupo</th>
                                        <th style="padding:10px 12px;text-align:left;font-size:0.8rem;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Condição</th>
                                        <th style="padding:10px 12px;text-align:left;font-size:0.8rem;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Responsável</th>
                                        <th style="padding:10px 12px;text-align:left;font-size:0.8rem;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="conf-integ-tbody">
                                    <tr><td colspan="6" style="text-align:center;padding:2rem;color:#94a3b8;">Carregando...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <!-- Modal: Novo/Editar Passo de Integração -->
                <div id="modal-conf-integ-passo" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">
                    <div style="background:#fff;border-radius:16px;padding:0;width:100%;max-width:540px;box-shadow:0 25px 50px rgba(0,0,0,0.2);overflow:hidden;">
                        <div style="background:linear-gradient(135deg,#059669,#0f4c81);padding:1.25rem 1.5rem;color:#fff;display:flex;justify-content:space-between;align-items:center;">
                            <h3 style="margin:0;font-weight:700;" id="modal-conf-integ-title">Novo Passo</h3>
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
                                        <option value="">— Nenhum (sem responsável) —</option>
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

'''

# Insert before view-faculdade
faculdade_marker = '<!-- VIEW: FACULDADE -->'
if faculdade_marker in html:
    html = html.replace(faculdade_marker, new_conf_view + faculdade_marker)
    print('✅ view-conf-integracao added before view-faculdade')
else:
    print('⚠️ view-faculdade marker not found')

with open(html_file, 'w', encoding='utf-8') as fh:
    fh.write(html)

print(f'HTML file written. Size: {len(html)} chars')
