// frontend/treinamento.js — Módulo de Materiais de Treinamento
// IDs alinhados com o index.html

(function () {
    'use strict';

    // ── Estado ───────────────────────────────────────────────────────────────
    let _cache = [];                  // lista de treinamentos
    let _treinAtual = null;           // treinamento aberto no modal de detalhe
    let _tabAtual = 'todos';          // aba ativa no modal de detalhe
    let _anexosCache = [];            // anexos do treinamento aberto
    let _novoCapaFile = null;         // File selecionado para capa (novo treinamento)
    let _editarCapaFile = null;       // File selecionado para capa (editar treinamento)

    // ── Helpers ──────────────────────────────────────────────────────────────
    function tok() {
        return window.currentToken
            || localStorage.getItem('erp_token')
            || localStorage.getItem('token')
            || '';
    }

    function api(path, opts = {}) {
        return fetch((window.API_URL || '') + path, {
            ...opts,
            headers: { Authorization: 'Bearer ' + tok(), ...(opts.headers || {}) }
        });
    }

    function cat(mime, nome) {
        const m = (mime || '').toLowerCase();
        const n = (nome || '').toLowerCase();
        if (m.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv)$/.test(n)) return 'video';
        if (m === 'application/pdf' || n.endsWith('.pdf'))               return 'pdf';
        if (m.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg)$/.test(n)) return 'imagem';
        return 'outro';
    }

    const CAT_LABEL = { video: '🎬 Vídeos', pdf: '📄 PDFs', imagem: '🖼️ Imagens', outro: '📎 Outros' };
    const CAT_COLOR = { video: '#0e7490', pdf: '#c2410c', imagem: '#7c3aed', outro: '#475569' };
    const CAT_BG    = { video: '#cffafe', pdf: '#ffedd5', imagem: '#ede9fe', outro: '#f1f5f9' };
    const CAT_ICON  = { video: 'ph-film-strip', pdf: 'ph-file-pdf', imagem: 'ph-image', outro: 'ph-paperclip' };

    function el(id) { return document.getElementById(id); }

    // ── CAPA: Preview ao selecionar imagem ───────────────────────────────────
    window._novoCapaPreview = function (input) {
        const file = input.files[0];
        if (!file) return;
        _novoCapaFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = el('novo-capa-preview');
            const wrap = el('novo-capa-preview-wrap');
            const lbl  = el('novo-capa-label');
            if (img)  img.src = e.target.result;
            if (wrap) wrap.style.display = 'block';
            if (lbl)  lbl.textContent = file.name;
        };
        reader.readAsDataURL(file);
    };

    window._novoCapaRemover = function () {
        _novoCapaFile = null;
        const inp  = el('novo-treinamento-capa');
        const img  = el('novo-capa-preview');
        const wrap = el('novo-capa-preview-wrap');
        const lbl  = el('novo-capa-label');
        if (inp)  inp.value = '';
        if (img)  img.src = '';
        if (wrap) wrap.style.display = 'none';
        if (lbl)  lbl.textContent = 'Clique para selecionar uma imagem de capa...';
    };

    window._editarCapaPreview = function (input) {
        const file = input.files[0];
        if (!file) return;
        _editarCapaFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img  = el('editar-capa-preview');
            const wrap = el('editar-capa-preview-wrap');
            const lbl  = el('editar-capa-label');
            if (img)  img.src = e.target.result;
            if (wrap) wrap.style.display = 'block';
            if (lbl)  lbl.textContent = file.name;
        };
        reader.readAsDataURL(file);
    };

    window._editarCapaRemover = function () {
        _editarCapaFile = null;
        const inp     = el('editar-treinamento-capa');
        const urlInp  = el('editar-treinamento-capa-url');
        const img     = el('editar-capa-preview');
        const wrap    = el('editar-capa-preview-wrap');
        const lbl     = el('editar-capa-label');
        if (inp)    inp.value  = '';
        if (urlInp) urlInp.value = '';
        if (img)    img.src = '';
        if (wrap)   wrap.style.display = 'none';
        if (lbl)    lbl.textContent = 'Clique para alterar a imagem de capa...';
    };

    // ── CAPA: Upload para Cloudinary via endpoint de anexo ────────────────────
    // Sobe a imagem como "anexo" e retorna a URL, depois remove do BD
    // (é uma estratégia temporária usando o endpoint existente)
    // Melhor: usamos um endpoint dedicado POST /api/treinamentos/:id/capa
    // Mas como não temos esse endpoint, vamos fazer upload via multipart
    // direto para o mesmo Cloudinary usando o endpoint de upload geral de imagens
    async function _uploadCapa(treinId, file) {
        const form = new FormData();
        form.append('arquivo', file);
        const r = await api('/treinamentos/' + treinId + '/anexos', { method: 'POST', body: form });
        if (!r.ok) {
            const e = await r.json().catch(() => ({}));
            throw new Error(e.error || 'Erro ao fazer upload da capa');
        }
        const data = await r.json();
        // Retorna a URL do Cloudinary e o ID do anexo criado
        return { url: data.url_cloudinary || data.url || '', anexoId: data.id };
    }
    window.renderTreinamentosTable = async function () {
        const tbody = el('treinamentos-tbody');
        const badge = el('treinamento-count-badge');
        if (!tbody) return;

        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:#64748b;">
            <i class="ph ph-circle-notch" style="font-size:1.5rem;animation:spin 1s linear infinite;"></i>
            <br>Carregando...</td></tr>`;

        try {
            const r = await api('/treinamentos');
            if (!r.ok) throw new Error('Erro ' + r.status);
            _cache = await r.json();

            const filtro = (el('filtro-treinamento-busca') || { value: '' }).value.toLowerCase();
            const lista  = filtro ? _cache.filter(t => t.nome.toLowerCase().includes(filtro)) : _cache;

            if (badge) badge.textContent = `${lista.length} treinamento${lista.length !== 1 ? 's' : ''}`;

            if (!lista.length) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:3rem;color:#94a3b8;">
                    <i class="ph ph-graduation-cap" style="font-size:2.5rem;display:block;margin-bottom:0.5rem;"></i>
                    Nenhum treinamento cadastrado ainda.</td></tr>`;
                return;
            }

            tbody.innerHTML = lista.map(t => _rowHtml(t)).join('');
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:#ef4444;">
                <i class="ph ph-warning-circle"></i> ${e.message}</td></tr>`;
        }
    };

    function _rowHtml(t) {
        const anexos  = t.anexos || [];
        const videos  = anexos.filter(a => cat(a.tipo_mime, a.nome_arquivo) === 'video');
        const pdfs    = anexos.filter(a => cat(a.tipo_mime, a.nome_arquivo) === 'pdf');
        const imgs    = anexos.filter(a => cat(a.tipo_mime, a.nome_arquivo) === 'imagem');
        const outros  = anexos.filter(a => cat(a.tipo_mime, a.nome_arquivo) === 'outro');

        const pills = [
            videos.length  ? `<span style="background:#cffafe;color:#0e7490;border-radius:999px;padding:2px 9px;font-size:0.7rem;font-weight:600;">🎬 ${videos.length}</span>` : '',
            pdfs.length    ? `<span style="background:#ffedd5;color:#c2410c;border-radius:999px;padding:2px 9px;font-size:0.7rem;font-weight:600;">📄 ${pdfs.length}</span>` : '',
            imgs.length    ? `<span style="background:#ede9fe;color:#7c3aed;border-radius:999px;padding:2px 9px;font-size:0.7rem;font-weight:600;">🖼️ ${imgs.length}</span>` : '',
            outros.length  ? `<span style="background:#f1f5f9;color:#475569;border-radius:999px;padding:2px 9px;font-size:0.7rem;font-weight:600;">📎 ${outros.length}</span>` : '',
        ].filter(Boolean).join(' ');

        // Capa — SOMENTE via campo "Anexar Capa" dedicado → ícone por tipo como fallback
        let capa;
        if (t.capa_url) {
            capa = `<div style="width:56px;height:56px;border-radius:10px;overflow:hidden;flex-shrink:0;border:1px solid #e2e8f0;">
                <img src="${t.capa_url}" style="width:100%;height:100%;object-fit:cover;" loading="lazy"></div>`;
        } else if (videos.length) {
            capa = `<div style="width:56px;height:56px;border-radius:10px;background:linear-gradient(135deg,#0e7490,#0891b2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="ph ph-film-slate" style="color:#fff;font-size:1.5rem;"></i></div>`;
        } else if (pdfs.length) {
            capa = `<div style="width:56px;height:56px;border-radius:10px;background:#fff7f0;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid #fed7aa;">
                <i class="ph ph-file-pdf" style="color:#c2410c;font-size:1.5rem;"></i></div>`;
        } else {
            capa = `<div style="width:56px;height:56px;border-radius:10px;background:linear-gradient(135deg,#0e7490,#06b6d4);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="ph ph-graduation-cap" style="color:#fff;font-size:1.5rem;"></i></div>`;
        }

        const data = t.criado_em ? new Date(t.criado_em).toLocaleDateString('pt-BR') : '—';
        const desc = t.descricao ? `<div style="font-size:0.77rem;color:#64748b;margin-top:1px;max-width:380px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.descricao}</div>` : '';
        const nomeSafe = (t.nome || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

        return `<tr style="border-bottom:1px solid #f1f5f9;transition:background .15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
            <td style="padding:0.85rem 1rem;">
                <div style="display:flex;align-items:center;gap:0.9rem;">
                    ${capa}
                    <div style="min-width:0;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-weight:600;color:#0f172a;font-size:0.93rem;">${t.nome}</span>
                            <span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600;">${t.departamento || 'Todos'}</span>
                        </div>
                        ${desc}
                        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px;">${pills || '<span style="color:#94a3b8;font-size:0.72rem;">Sem arquivos</span>'}</div>
                    </div>
                </div>
            </td>
            <td style="padding:0.85rem 1rem;color:#475569;font-size:0.85rem;white-space:nowrap;">${anexos.length} arquivo${anexos.length !== 1 ? 's' : ''}</td>
            <td style="padding:0.85rem 1rem;color:#64748b;font-size:0.82rem;white-space:nowrap;">
                ${t.validade_dias && t.validade_dias > 0
                    ? `<span style="background:#fef3c7;color:#92400e;border-radius:8px;padding:3px 8px;font-size:0.78rem;font-weight:600;">⏰ ${t.validade_dias} meses</span>`
                    : `<span style="background:#f1f5f9;color:#94a3b8;border-radius:8px;padding:3px 8px;font-size:0.78rem;">Sem validade</span>`}
            </td>
            <td style="padding:0.85rem 1rem;color:#64748b;font-size:0.82rem;white-space:nowrap;">${data}</td>
            <td style="padding:0.85rem 1rem;text-align:right;">
                <div style="display:flex;gap:6px;justify-content:flex-end;">
                    <button onclick="window.abrirDetalheTreinamento(${t.id})"
                        style="background:#0e7490;color:#fff;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;transition:all .15s;"
                        onmouseover="this.style.background='#0891b2'" onmouseout="this.style.background='#0e7490'">
                        <i class="ph ph-folder-open"></i> Abrir
                    </button>
                    <button onclick="window.abrirModalEditarTreinamento(${t.id})"
                        style="background:#eff6ff;color:#1d4ed8;border:1.5px solid #bfdbfe;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;transition:all .15s;"
                        onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'"
                        title="Editar nome e descrição">
                        <i class="ph ph-pencil-simple"></i>
                    </button>
                    <!-- botão excluir ocultado a pedido: 
                    <button onclick="window.excluirTreinamento(${t.id},'${nomeSafe}')"
                        style="background:none;border:1.5px solid #fca5a5;color:#dc2626;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;"
                        onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='none'">
                        <i class="ph ph-trash"></i>
                    </button>
                    -->
                </div>
            </td>
        </tr>`;
    }

    // ── MODAL: NOVO TREINAMENTO ───────────────────────────────────────────────
    window.abrirModalNovoTreinamento = function () {
        const f = el('form-novo-treinamento');
        if (f) f.reset();
        const m = el('modal-novo-treinamento');
        if (m) { m.style.display = 'flex'; }
        _carregarDepartamentosSelect('novo-treinamento-departamento', 'Todos');
        window._novoCapaRemover(); // limpa capa anterior
        
        // Reset abas
        window.mudarAbaNovoTreinamento('detalhes');
        
        // Limpar perguntas de pesquisa e adicionar as padrão
        const lista = el('novo-pesquisa-perguntas-lista');
        if (lista) {
            lista.innerHTML = '';
            // Perguntas padrão
            const perguntasPadrao = [
                "O conteúdo do treinamento foi claro e de fácil compreensão?",
                "O instrutor demonstrou domínio sobre os temas abordados?",
                "A duração do treinamento foi adequada para o conteúdo apresentado?",
                "Os materiais de apoio (slides, apostilas, etc.) foram úteis?",
                "O treinamento contribuiu para o seu desenvolvimento profissional?"
            ];
            perguntasPadrao.forEach((p, idx) => {
                _adicionarInputPerguntaNovo(p, idx);
            });
        }

        setTimeout(() => { const n = el('novo-treinamento-nome'); if (n) n.focus(); }, 80);
    };

    window.mudarAbaNovoTreinamento = function (aba) {
        const btnDetalhes = el('btn-aba-novo-detalhes');
        const btnPesquisa = el('btn-aba-novo-pesquisa');
        const contentDetalhes = el('aba-novo-detalhes-content');
        const contentPesquisa = el('aba-novo-pesquisa-content');

        if (!btnDetalhes || !btnPesquisa || !contentDetalhes || !contentPesquisa) return;

        if (aba === 'detalhes') {
            btnDetalhes.style.color = '#0e7490';
            btnDetalhes.style.borderBottom = '2px solid #0e7490';
            btnPesquisa.style.color = '#64748b';
            btnPesquisa.style.borderBottom = '2px solid transparent';
            contentDetalhes.style.display = 'block';
            contentPesquisa.style.display = 'none';
        } else {
            btnPesquisa.style.color = '#0e7490';
            btnPesquisa.style.borderBottom = '2px solid #0e7490';
            btnDetalhes.style.color = '#64748b';
            btnDetalhes.style.borderBottom = '2px solid transparent';
            contentPesquisa.style.display = 'block';
            contentDetalhes.style.display = 'none';
        }
    };

    function _adicionarInputPerguntaNovo(texto = '', idx = null) {
        const lista = el('novo-pesquisa-perguntas-lista');
        if (!lista) return;

        if (idx === null) {
            idx = lista.children.length;
        }

        const div = document.createElement('div');
        div.className = 'novo-pesquisa-pergunta-item';
        div.style.display = 'flex';
        div.style.gap = '10px';
        div.style.alignItems = 'center';
        div.style.background = '#f8fafc';
        div.style.padding = '12px';
        div.style.borderRadius = '8px';
        div.style.border = '1px solid #e2e8f0';
        div.style.marginBottom = '10px';
        
        const dragHandle = document.createElement('div');
        dragHandle.innerHTML = '<i class="ph ph-dots-six-vertical"></i>';
        dragHandle.style.color = '#94a3b8';
        dragHandle.style.cursor = 'grab';

        const inputsDiv = document.createElement('div');
        inputsDiv.style.flex = '1';
        inputsDiv.style.display = 'flex';
        inputsDiv.style.gap = '10px';

        const selectTipo = document.createElement('select');
        selectTipo.className = 'form-control novo-pesquisa-input-tipo';
        selectTipo.style.width = '140px';
        selectTipo.style.padding = '10px';
        selectTipo.style.border = '1.5px solid #cbd5e1';
        selectTipo.style.borderRadius = '8px';
        selectTipo.style.fontSize = '0.9rem';
        selectTipo.innerHTML = `
            <option value="escala">Escala 1 a 5</option>
            <option value="texto">Texto Aberto</option>
            <option value="titulo">Título/Seção</option>
        `;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control novo-pesquisa-input-pergunta';
        input.placeholder = `Texto da pergunta ou título...`;
        if (typeof texto === 'object' && texto !== null) {
            input.value = texto.pergunta || '';
            selectTipo.value = texto.tipo || 'escala';
        } else {
            input.value = texto || '';
        }
        input.style.flex = '1';
        input.style.padding = '10px 14px';
        input.style.border = '1.5px solid #cbd5e1';
        input.style.borderRadius = '8px';
        input.style.fontSize = '0.93rem';

        const btnRemove = document.createElement('button');
        btnRemove.type = 'button';
        btnRemove.innerHTML = '<i class="ph ph-trash"></i>';
        btnRemove.style.background = '#fef2f2';
        btnRemove.style.color = '#ef4444';
        btnRemove.style.border = '1.5px solid #fca5a5';
        btnRemove.style.borderRadius = '8px';
        btnRemove.style.width = '42px';
        btnRemove.style.height = '42px';
        btnRemove.style.display = 'flex';
        btnRemove.style.alignItems = 'center';
        btnRemove.style.justifyContent = 'center';
        btnRemove.style.cursor = 'pointer';
        btnRemove.onclick = function () {
            lista.removeChild(div);
            _reordenarPlaceholdersNovo();
        };

        inputsDiv.appendChild(selectTipo);
        inputsDiv.appendChild(input);

        div.appendChild(dragHandle);
        div.appendChild(inputsDiv);
        div.appendChild(btnRemove);
        lista.appendChild(div);
    }

    function _reordenarPlaceholdersNovo() {
        // Nenhuma ação necessária, placeholder agora é genérico
    }

    window.adicionarNovaPerguntaPesquisaNovo = function () {
        _adicionarInputPerguntaNovo();
    };


    async function _carregarDepartamentosSelect(selectId, selecionado = 'Todos') {
        const select = el(selectId);
        if (!select) return;
        try {
            const r = await api('/departamentos');
            if (!r.ok) return;
            const deptos = await r.json();
            let html = `
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:0;font-size:0.95rem;">
                    <input type="checkbox" value="Todos" class="depto-checkbox"> Todos os Departamentos
                </label>
            `;
            deptos.forEach(d => {
                html += `
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:0;font-size:0.95rem;">
                        <input type="checkbox" value="${d.nome}" class="depto-checkbox"> ${d.nome}
                    </label>
                `;
            });
            select.innerHTML = html;
            const selArray = (typeof selecionado === 'string' ? selecionado : 'Todos').split(',').map(s => s.trim());
            const checkboxes = select.querySelectorAll('input[type="checkbox"]');
            
            const todoCheckbox = select.querySelector('input[value="Todos"]');
            const otherCheckboxes = Array.from(checkboxes).filter(cb => cb.value !== 'Todos');

            // Apply initial state
            if (selArray.includes('Todos')) {
                todoCheckbox.checked = true;
                otherCheckboxes.forEach(cb => cb.checked = true);
            } else {
                otherCheckboxes.forEach(cb => {
                    cb.checked = selArray.includes(cb.value);
                });
                todoCheckbox.checked = otherCheckboxes.length > 0 && otherCheckboxes.every(c => c.checked);
            }

            // Bind events
            if (todoCheckbox) {
                todoCheckbox.addEventListener('change', (e) => {
                    otherCheckboxes.forEach(cb => cb.checked = e.target.checked);
                });
            }

            otherCheckboxes.forEach(cb => {
                cb.addEventListener('change', () => {
                    if (!cb.checked) {
                        if (todoCheckbox) todoCheckbox.checked = false;
                    } else {
                        const allChecked = otherCheckboxes.every(c => c.checked);
                        if (todoCheckbox) todoCheckbox.checked = allChecked;
                    }
                });
            });
        } catch(e) {}
    }

    window.fecharModalNovoTreinamento = function () {
        const m = el('modal-novo-treinamento');
        if (m) m.style.display = 'none';
        window._novoCapaRemover();
    };

    window.salvarNovoTreinamento = async function (event) {
        if (event) event.preventDefault();
        const nome = (el('novo-treinamento-nome') || {}).value?.trim();
        const desc = (el('novo-treinamento-desc') || {}).value?.trim();
        const container = el('novo-treinamento-departamento');
        const checked = container ? Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value) : [];
        const departamento = checked.length > 0 ? checked.join(', ') : 'Todos';
        const validade_dias = parseInt((el('novo-treinamento-validade') || {}).value || '0', 10) || 0;
        if (!nome) { alert('Informe o nome do treinamento.'); return; }

        const btn = el('form-novo-treinamento')?.querySelector('[type=submit]');
        if (btn) { btn.disabled = true; btn.textContent = 'Criando...'; }

        try {
            // Extrair perguntas da pesquisa
            const itemsPesquisa = document.querySelectorAll('.novo-pesquisa-pergunta-item');
            const pesquisa_perguntas = Array.from(itemsPesquisa).map(item => {
                const pergunta = item.querySelector('.novo-pesquisa-input-pergunta').value.trim();
                const tipo = item.querySelector('.novo-pesquisa-input-tipo') ? item.querySelector('.novo-pesquisa-input-tipo').value : 'escala';
                return { pergunta, tipo, opcoes: null };
            }).filter(p => p.pergunta !== '');

            // 1. Cria o treinamento
            const r = await api('/treinamentos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, descricao: desc || '', departamento, validade_dias, pesquisa_perguntas })
            });
            if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Erro ao criar'); }
            const novoTrein = await r.json();

            // 2. Se tem imagem de capa, faz upload e atualiza
            if (_novoCapaFile && novoTrein.id) {
                if (btn) btn.textContent = 'Enviando capa...';
                try {
                    const { url } = await _uploadCapa(novoTrein.id, _novoCapaFile);
                    if (url) {
                        await api('/treinamentos/' + novoTrein.id, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ nome, descricao: desc || '', departamento, capa_url: url })
                        });
                    }
                } catch (capaErr) {
                    console.warn('[TREINAMENTO] Erro ao enviar capa:', capaErr.message);
                }
            }

            window.fecharModalNovoTreinamento();
            await window.renderTreinamentosTable();
        } catch (e) {
            alert('Erro: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Criar Treinamento'; }
        }
    };

    // ── MODAL: DETALHE / ANEXOS ───────────────────────────────────────────────
    window.abrirDetalheTreinamento = async function (id) {
        _treinAtual = _cache.find(x => x.id === id) || { id };
        _tabAtual   = 'todos';

        el('detalhe-treinamento-nome').textContent = _treinAtual.nome || '';
        el('detalhe-treinamento-desc').textContent = _treinAtual.descricao || '';

        // Reseta file input e progress
        const fi = el('treinamento-file-input');
        if (fi) fi.value = '';
        _esconderProgress();

        const m = el('modal-detalhe-treinamento');
        if (m) m.style.display = 'flex';

        _resetTabs();
        await _carregarAnexos(id);
    };

    window.fecharModalDetalheTreinamento = function () {
        const m = el('modal-detalhe-treinamento');
        if (m) m.style.display = 'none';
        _treinAtual = null;
        _anexosCache = [];
    };

    // ── TABS DO MODAL ─────────────────────────────────────────────────────────
    window.switchTreinTab = function (tab) {
        _tabAtual = tab;
        _resetTabs();
        const btn = el('tab-trein-' + tab);
        if (btn) {
            btn.style.color        = '#0e7490';
            btn.style.fontWeight   = '700';
            btn.style.borderBottom = '3px solid #0e7490';
        }
        _renderGrid();
    };

    function _resetTabs() {
        ['todos', 'videos', 'pdfs', 'imagens', 'outros'].forEach(t => {
            const b = el('tab-trein-' + t);
            if (!b) return;
            b.style.color        = '#64748b';
            b.style.fontWeight   = '600';
            b.style.borderBottom = '3px solid transparent';
        });
    }

    // ── CARREGAR ANEXOS ───────────────────────────────────────────────────────
    async function _carregarAnexos(id) {
        const grid  = el('treinamento-anexos-grid');
        const vazio = el('treinamento-anexos-vazio');
        if (!grid) return;

        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#64748b;">
            <i class="ph ph-circle-notch" style="font-size:1.5rem;"></i><br>Carregando...</div>`;
        if (vazio) vazio.style.display = 'none';

        try {
            const r = await api('/treinamentos/' + id + '/anexos');
            if (!r.ok) throw new Error('Erro ' + r.status);
            _anexosCache = await r.json();
            _renderGrid();
        } catch (e) {
            grid.innerHTML = `<div style="grid-column:1/-1;color:#ef4444;padding:1rem;">Erro: ${e.message}</div>`;
        }
    }

    function _renderGrid() {
        const grid  = el('treinamento-anexos-grid');
        const vazio = el('treinamento-anexos-vazio');
        if (!grid) return;

        const filtrado = _tabAtual === 'todos'
            ? _anexosCache
            : _tabAtual === 'videos'   ? _anexosCache.filter(a => cat(a.tipo_mime, a.nome_arquivo) === 'video')
            : _tabAtual === 'pdfs'     ? _anexosCache.filter(a => cat(a.tipo_mime, a.nome_arquivo) === 'pdf')
            : _tabAtual === 'imagens'  ? _anexosCache.filter(a => cat(a.tipo_mime, a.nome_arquivo) === 'imagem')
                                       : _anexosCache.filter(a => cat(a.tipo_mime, a.nome_arquivo) === 'outro');

        if (!filtrado.length) {
            grid.innerHTML = '';
            if (vazio) vazio.style.display = 'block';
            return;
        }
        if (vazio) vazio.style.display = 'none';
        grid.innerHTML = filtrado.map(a => _cardHtml(a)).join('');
    }

    function _cardHtml(a) {
        const c    = cat(a.tipo_mime, a.nome_arquivo);
        const url  = a.url_cloudinary || '';
        const nome = a.nome_arquivo || 'sem nome';
        const nomeSafe = nome.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const urlSafe  = url.replace(/'/g, "\\'");

        let preview = '';
        if (c === 'imagem') {
            preview = `<img src="${url}" alt="${nomeSafe}" loading="lazy"
                style="width:100%;height:120px;object-fit:cover;border-radius:10px 10px 0 0;display:block;cursor:zoom-in;"
                onclick="window.abrirLightbox('${urlSafe}','${nomeSafe}','imagem')">`;
        } else if (c === 'video') {
            preview = `<div onclick="window.abrirLightbox('${urlSafe}','${nomeSafe}','video')"
                style="width:100%;height:120px;background:linear-gradient(135deg,#0c4a6e,#0e7490);border-radius:10px 10px 0 0;
                display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;">
                <i class="ph ph-play-circle" style="color:#fff;font-size:3rem;transition:.2s;"
                    onmouseover="this.style.transform='scale(1.12)'" onmouseout="this.style.transform='scale(1)'"></i>
                <span style="color:#cffafe;font-size:0.65rem;margin-top:4px;opacity:0.85;">Reproduzir</span>
            </div>`;
        } else if (c === 'pdf') {
            preview = `<div onclick="window.open('${urlSafe}','_blank')"
                style="width:100%;height:120px;background:#fff7f0;border-radius:10px 10px 0 0;display:flex;flex-direction:column;
                align-items:center;justify-content:center;cursor:pointer;border-bottom:1px solid #fed7aa;">
                <i class="ph ph-file-pdf" style="color:#c2410c;font-size:3rem;"></i>
                <span style="color:#c2410c;font-size:0.65rem;margin-top:4px;font-weight:600;">Abrir PDF</span>
            </div>`;
        } else {
            preview = `<div onclick="window.open('${urlSafe}','_blank')"
                style="width:100%;height:120px;background:#f8fafc;border-radius:10px 10px 0 0;display:flex;flex-direction:column;
                align-items:center;justify-content:center;cursor:pointer;border-bottom:1px solid #e2e8f0;">
                <i class="ph ph-${CAT_ICON[c] || 'file'}" style="color:#64748b;font-size:2.5rem;"></i>
                <span style="color:#64748b;font-size:0.65rem;margin-top:4px;">Baixar</span>
            </div>`;
        }

        const treinId = _treinAtual?.id;

        return `<div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#fff;transition:box-shadow .15s;display:flex;flex-direction:column;"
            onmouseover="this.style.boxShadow='0 4px 18px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='none'">
            ${preview}
            <div style="padding:8px 10px;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
                <div style="font-size:0.74rem;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:6px;" title="${nomeSafe}">${nome}</div>
                <div style="display:flex;gap:4px;">
                    <button onclick="${c === 'video' ? `window.abrirLightbox('${urlSafe}','${nomeSafe}','video')` : `window.open('${urlSafe}','_blank')`}"
                        style="flex:1;background:#0e7490;color:#fff;border:none;border-radius:5px;padding:4px 0;font-size:0.72rem;cursor:pointer;
                        display:flex;align-items:center;justify-content:center;gap:3px;transition:.15s;"
                        onmouseover="this.style.background='#0891b2'" onmouseout="this.style.background='#0e7490'">
                        <i class="ph ph-arrow-square-out"></i> Abrir
                    </button>
                    <button onclick="window.excluirAnexoTrein(${a.id},${treinId})"
                        style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;border-radius:5px;padding:4px 8px;
                        font-size:0.72rem;cursor:pointer;display:flex;align-items:center;"
                        onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            </div>
        </div>`;
    }

    // ── LIGHTBOX ──────────────────────────────────────────────────────────────
    window.abrirLightbox = function (url, nome, tipo) {
        const lb      = el('treinamento-lightbox');
        const content = el('treinamento-lightbox-content');
        const caption = el('treinamento-lightbox-caption');
        if (!lb || !content) return;

        content.innerHTML = tipo === 'video'
            ? `<video src="${url}" controls autoplay style="max-width:90vw;max-height:80vh;border-radius:8px;"></video>`
            : `<img src="${url}" alt="${nome}" style="max-width:90vw;max-height:80vh;border-radius:8px;object-fit:contain;">`;

        if (caption) caption.textContent = nome;
        lb.style.display = 'flex';
    };

    window.fecharTreinamentoLightbox = function () {
        const lb = el('treinamento-lightbox');
        if (!lb) return;
        lb.style.display = 'none';
        const content = el('treinamento-lightbox-content');
        if (content) content.innerHTML = ''; // Parar vídeo
    };

    // ── UPLOAD ────────────────────────────────────────────────────────────────
    window.handleTreinamentoFileChange = async function (event) {
        if (!_treinAtual) return;
        await _uploadFiles(event.target.files);
        event.target.value = '';
    };

    window.handleTreinamentoDrop = async function (event) {
        event.preventDefault();
        const dz = el('treinamento-dropzone');
        if (dz) { dz.style.background = '#f0fdfe'; dz.style.borderColor = '#0e7490'; }
        if (!_treinAtual) return;
        await _uploadFiles(event.dataTransfer.files);
    };

    async function _uploadFiles(files) {
        if (!files || !files.length) return;
        const MAX_MB = 500;
        for (const f of files) {
            if (f.size > MAX_MB * 1024 * 1024) {
                alert(`"${f.name}" excede ${MAX_MB}MB.`);
                return;
            }
        }

        _mostrarProgress(0, `Preparando ${files.length} arquivo(s)...`);

        let ok = 0;
        const total = files.length;
        for (const arquivo of files) {
            _mostrarProgress(Math.round((ok / total) * 100), `Enviando ${ok + 1} de ${total}: ${arquivo.name}`);
            const form = new FormData();
            form.append('arquivo', arquivo);
            try {
                const r = await api('/treinamentos/' + _treinAtual.id + '/anexos', { method: 'POST', body: form });
                if (!r.ok) {
                    const e = await r.json().catch(() => ({}));
                    throw new Error(e.error || 'Erro no upload');
                }
                ok++;
            } catch (e) {
                alert(`Erro ao enviar "${arquivo.name}": ${e.message}`);
            }
        }

        _mostrarProgress(100, `✅ ${ok} de ${total} arquivo(s) enviado(s)`);
        setTimeout(_esconderProgress, 3000);

        await _carregarAnexos(_treinAtual.id);
        await window.renderTreinamentosTable();
    }

    function _mostrarProgress(pct, texto) {
        const wrap = el('treinamento-upload-progress');
        const bar  = el('treinamento-progress-bar');
        const txt  = el('treinamento-progress-text');
        if (wrap) wrap.style.display = 'block';
        if (bar)  bar.style.width = pct + '%';
        if (txt)  txt.textContent = texto;
    }

    function _esconderProgress() {
        const wrap = el('treinamento-upload-progress');
        const bar  = el('treinamento-progress-bar');
        const txt  = el('treinamento-progress-text');
        if (wrap) wrap.style.display = 'none';
        if (bar)  bar.style.width = '0%';
        if (txt)  txt.textContent = '';
    }

    // ── EDITAR TREINAMENTO ────────────────────────────────────────────────────
    window.abrirModalEditarTreinamento = function (id) {
        const t = _cache.find(x => x.id === id);
        if (!t) return;

        el('editar-treinamento-id').value   = t.id;
        el('editar-treinamento-nome').value = t.nome || '';
        el('editar-treinamento-desc').value = t.descricao || '';
        if (el('editar-treinamento-validade')) el('editar-treinamento-validade').value = t.validade_dias || 0;
        _carregarDepartamentosSelect('editar-treinamento-departamento', t.departamento || 'Todos');

        // Carrega capa existente
        _editarCapaFile = null;
        const urlInp = el('editar-treinamento-capa-url');
        const img    = el('editar-capa-preview');
        const wrap   = el('editar-capa-preview-wrap');
        const lbl    = el('editar-capa-label');
        const inp    = el('editar-treinamento-capa');
        if (inp) inp.value = '';
        if (urlInp) urlInp.value = t.capa_url || '';
        if (t.capa_url) {
            if (img)  img.src = t.capa_url;
            if (wrap) wrap.style.display = 'block';
            if (lbl)  lbl.textContent = 'Capa atual (clique para trocar)';
        } else {
            if (img)  img.src = '';
            if (wrap) wrap.style.display = 'none';
            if (lbl)  lbl.textContent = 'Clique para alterar a imagem de capa...';
        }

        const m = el('modal-editar-treinamento');
        if (m) m.style.display = 'flex';
        setTimeout(() => { const n = el('editar-treinamento-nome'); if (n) n.focus(); }, 80);
    };

    window.fecharModalEditarTreinamento = function () {
        const m = el('modal-editar-treinamento');
        if (m) m.style.display = 'none';
        _editarCapaFile = null;
    };

    window.salvarEdicaoTreinamento = async function (event) {
        if (event) event.preventDefault();
        const id   = parseInt(el('editar-treinamento-id').value, 10);
        const nome = (el('editar-treinamento-nome') || {}).value?.trim();
        const desc = (el('editar-treinamento-desc') || {}).value?.trim();
        const deptSelect = el('editar-treinamento-departamento');
        const checked = deptSelect ? Array.from(deptSelect.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value) : [];
        const departamento = checked.length > 0 ? checked.join(', ') : 'Todos';
        if (!nome) { alert('Informe o nome do treinamento.'); return; }

        const btn = el('btn-salvar-edicao-treinamento');
        if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

        try {
            // Determina a capa_url final
            let capa_url = (el('editar-treinamento-capa-url') || {}).value || '';

            // Se selecionou um novo arquivo de capa, faz upload primeiro
            if (_editarCapaFile) {
                if (btn) btn.textContent = 'Enviando capa...';
                try {
                    const { url } = await _uploadCapa(id, _editarCapaFile);
                    if (url) capa_url = url;
                } catch (capaErr) {
                    console.warn('[TREINAMENTO] Erro ao enviar capa:', capaErr.message);
                }
            }

            const validade_dias = parseInt((el('editar-treinamento-validade') || {}).value || '0', 10) || 0;

            const r = await api('/treinamentos/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, descricao: desc || '', departamento, capa_url, validade_dias })
            });
            if (!r.ok) {
                const e = await r.json().catch(() => ({}));
                throw new Error(e.error || 'Erro ao salvar');
            }

            // Atualiza o cache local
            const idx = _cache.findIndex(x => x.id === id);
            if (idx !== -1) {
                _cache[idx].nome        = nome;
                _cache[idx].descricao   = desc || '';
                _cache[idx].departamento = departamento;
                _cache[idx].capa_url    = capa_url;
            }

            // Se o modal de detalhe estiver aberto para este treinamento, atualiza o header
            if (_treinAtual && _treinAtual.id === id) {
                _treinAtual.nome      = nome;
                _treinAtual.descricao = desc || '';
                _treinAtual.departamento = departamento;
                const elNome = el('detalhe-treinamento-nome');
                const elDesc = el('detalhe-treinamento-desc');
                if (elNome) elNome.textContent = nome;
                if (elDesc) elDesc.textContent = desc || '';
            }

            // Salvar perguntas
            await salvarPerguntasTreinamento(id);

            window.fecharModalEditarTreinamento();
            await window.renderTreinamentosTable();

        } catch (e) {
            alert('Erro: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Salvar Altera\u00e7\u00f5es'; }
        }
    };

    // ── EXCLUIR TREINAMENTO ───────────────────────────────────────────────────
    window.excluirTreinamento = async function (id, nome) {
        if (!confirm(`Excluir o treinamento "${nome}" e TODOS os seus arquivos?\nEsta ação não pode ser desfeita.`)) return;
        try {
            const r = await api('/treinamentos/' + id, { method: 'DELETE' });
            if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Erro');
            await window.renderTreinamentosTable();
        } catch (e) { alert('Erro: ' + e.message); }
    };

    // ── EXCLUIR ANEXO ─────────────────────────────────────────────────────────
    window.excluirAnexoTrein = async function (anexoId, treinId) {
        if (!confirm('Excluir este arquivo permanentemente?')) return;
        try {
            const r = await api('/treinamentos/' + treinId + '/anexos/' + anexoId, { method: 'DELETE' });
            if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Erro');
            _anexosCache = _anexosCache.filter(a => a.id !== anexoId);
            _renderGrid();
            await window.renderTreinamentosTable();
        } catch (e) { alert('Erro: ' + e.message); }
    };

    // ── INIT (quando a view for aberta) ───────────────────────────────────────
    // O navigateTo('treinamento-materiais') carrega automaticamente se já existir hook
    // Também disponibilizamos para chamar manualmente
    window.initTreinamentoMateriais = function () {
        window.renderTreinamentosTable();
    };

    // CSS de spin inline para o ícone de loading
    if (!document.getElementById('trein-spin-style')) {
        const st = document.createElement('style');
        st.id = 'trein-spin-style';
        st.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
        document.head.appendChild(st);
    }

    console.log('[TREINAMENTO] Módulo v2 carregado.');

    // ── PESQUISA DE TREINAMENTO ───────────────────────────────────────────────
    window.mudarAbaEditarTreinamento = function(aba) {
        if (aba === 'detalhes') {
            if(el('aba-detalhes-content')) el('aba-detalhes-content').style.display = 'block';
            if(el('aba-pesquisa-content')) el('aba-pesquisa-content').style.display = 'none';
            if(el('btn-aba-detalhes')) { el('btn-aba-detalhes').style.borderBottom = '2px solid #1d4ed8'; el('btn-aba-detalhes').style.color = '#1d4ed8'; }
            if(el('btn-aba-pesquisa')) { el('btn-aba-pesquisa').style.borderBottom = 'none'; el('btn-aba-pesquisa').style.color = '#64748b'; }
        } else {
            if(el('aba-detalhes-content')) el('aba-detalhes-content').style.display = 'none';
            if(el('aba-pesquisa-content')) el('aba-pesquisa-content').style.display = 'block';
            if(el('btn-aba-pesquisa')) { el('btn-aba-pesquisa').style.borderBottom = '2px solid #1d4ed8'; el('btn-aba-pesquisa').style.color = '#1d4ed8'; }
            if(el('btn-aba-detalhes')) { el('btn-aba-detalhes').style.borderBottom = 'none'; el('btn-aba-detalhes').style.color = '#64748b'; }
            
            const id = el('editar-treinamento-id') ? el('editar-treinamento-id').value : null;
            if (id) window.carregarPerguntasTreinamento(id);
        }
    };

    window.carregarPerguntasTreinamento = async function(id) {
        const container = el('editar-treinamento-perguntas-container');
        if (!container) return;
        container.innerHTML = '<p>Carregando...</p>';
        try {
            const r = await api(`/treinamentos/${id}/pesquisa`);
            if (!r.ok) throw new Error('Erro ao carregar perguntas');
            const perguntas = await r.json();
            container.innerHTML = '';
            if (perguntas.length === 0) {
                // Perguntas default
                window.adicionarPerguntaTreinamento("Como você avalia o conteúdo abordado?");
                window.adicionarPerguntaTreinamento("Como você avalia o domínio do instrutor sobre o assunto?");
                window.adicionarPerguntaTreinamento("A didática do instrutor ajudou no aprendizado?");
                window.adicionarPerguntaTreinamento("A carga horária do treinamento foi adequada?");
                window.adicionarPerguntaTreinamento("O treinamento aplicou conhecimentos úteis ao seu trabalho?");
            } else {
                perguntas.forEach(p => window.adicionarPerguntaTreinamento(p));
            }
        } catch (e) {
            container.innerHTML = `<p style="color:red;">${e.message}</p>`;
        }
    };

    window.adicionarPerguntaTreinamento = function(texto = '') {
        const container = el('editar-treinamento-perguntas-container');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'editar-pesquisa-pergunta-item';
        div.style.display = 'flex';
        div.style.gap = '8px';
        div.style.alignItems = 'center';
        div.style.background = '#f8fafc';
        div.style.padding = '12px';
        div.style.borderRadius = '8px';
        div.style.border = '1px solid #e2e8f0';
        div.style.marginBottom = '8px';

        const selectTipo = document.createElement('select');
        selectTipo.className = 'form-control editar-pesquisa-input-tipo';
        selectTipo.style.width = '140px';
        selectTipo.style.padding = '8px';
        selectTipo.style.border = '1.5px solid #cbd5e1';
        selectTipo.style.borderRadius = '8px';
        selectTipo.style.fontSize = '0.9rem';
        selectTipo.innerHTML = `
            <option value="escala">Escala 1 a 5</option>
            <option value="texto">Texto Aberto</option>
            <option value="titulo">Título/Seção</option>
        `;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control input-pergunta';
        input.placeholder = 'Texto da pergunta ou título...';
        if (typeof texto === 'object' && texto !== null) {
            input.value = texto.pergunta || '';
            selectTipo.value = texto.tipo || 'escala';
        } else {
            input.value = texto || '';
        }
        input.style.flex = '1';
        input.style.padding = '8px 12px';
        input.style.border = '1.5px solid #cbd5e1';
        input.style.borderRadius = '8px';

        const btnRemove = document.createElement('button');
        btnRemove.type = 'button';
        btnRemove.innerHTML = '<i class="ph ph-trash"></i>';
        btnRemove.style.background = '#fef2f2';
        btnRemove.style.color = '#ef4444';
        btnRemove.style.border = '1.5px solid #fca5a5';
        btnRemove.style.borderRadius = '8px';
        btnRemove.style.width = '38px';
        btnRemove.style.height = '38px';
        btnRemove.style.display = 'flex';
        btnRemove.style.alignItems = 'center';
        btnRemove.style.justifyContent = 'center';
        btnRemove.style.cursor = 'pointer';
        btnRemove.onclick = function () {
            container.removeChild(div);
        };

        div.appendChild(selectTipo);
        div.appendChild(input);
        div.appendChild(btnRemove);
        container.appendChild(div);
    };

    window.salvarPerguntasTreinamento = async function(id) {
        const container = el('editar-treinamento-perguntas-container');
        if (!container) return;
        const items = document.querySelectorAll('.editar-pesquisa-pergunta-item');
        const perguntasArray = Array.from(items).map(item => {
            const pergunta = item.querySelector('.input-pergunta').value.trim();
            const tipo = item.querySelector('.editar-pesquisa-input-tipo').value;
            return { pergunta, tipo, opcoes: null };
        }).filter(p => p.pergunta !== '');
        
        try {
            await api(`/treinamentos/${id}/pesquisa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ perguntas: perguntasArray })
            });
        } catch (e) {
            console.error('Erro ao salvar perguntas', e);
        }
    };

    // Sobrescrever fecharModalEditarTreinamento para resetar a aba
    const oldFechar = window.fecharModalEditarTreinamento;
    window.fecharModalEditarTreinamento = function() {
        if (oldFechar) oldFechar();
        if (typeof window.mudarAbaEditarTreinamento === 'function') window.mudarAbaEditarTreinamento('detalhes');
        const container = el('editar-treinamento-perguntas-container');
        if (container) container.innerHTML = '';
    };

    window._adicionarPerguntaPesquisaEditar = window.adicionarPerguntaTreinamento;

})();
