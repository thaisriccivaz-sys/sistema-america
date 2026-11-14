// ═══════════════════════════════════════════════════════════════════════════════
// FRONTEND: APP › LIDERANÇA › SEPARAÇÃO (Equipamentos, Insumos e Sucção Noturna)
// Arquivo: frontend/app_lideranca_separacao.js
//
// - Mobile-first (360-430px), ícones Phosphor, alvos >= 48px, busca em tempo real
// - Mostra separado por placa de veículo:
//   1. Equipamentos que sairão no dia seguinte (com ícone oficial: 💜, 💙, ⬜, ⚪, ♿, 🚽...)
//   2. Insumos que devem ser separados no dia anterior (🧪 Química, 🧻 Papel higiênico, 📄 Papel toalha, 🧴 Sabonete)
//   3. Todos os veículos que saíram no dia (inclusive na rota noturna do dia) para realizar a sucção (💦)
// - Todos os itens são registrados com foto (checklist simples com foto salva no Cloudflare R2)
// - Cores de status nos quadros:
//   * Verde claro (#dcfce7): todos os itens do quadro concluídos com foto
//   * Amarelo claro (#fef9c3): checklist iniciado (em andamento)
//   * Vermelho claro (#fee2e2): atrasado
// ═══════════════════════════════════════════════════════════════════════════════
(function () {
    "use strict";

    const TZ = 'America/Sao_Paulo';
    const hojeISO = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
    const somaDias = (iso, d) => {
        const dt = new Date(iso + 'T12:00:00');
        dt.setDate(dt.getDate() + d);
        return dt.toISOString().slice(0, 10);
    };
    const fmtBR = iso => {
        if (!iso) return '—';
        const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
        return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
    };
    const fmtDataExtenso = iso => {
        if (!iso) return '';
        const dt = new Date(iso + 'T12:00:00');
        const str = dt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        return str.charAt(0).toUpperCase() + str.slice(1);
    };
    const esc = s => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const normBusca = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const iniciais = n => {
        const p = String(n || '').trim().split(/\s+/).filter(Boolean);
        if (!p.length) return '?';
        if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
        return (p[0][0] + p[p.length - 1][0]).toUpperCase();
    };

    const S = {
        data: hojeISO(),
        modoRota: 'auto', // 'auto' | 'dia_seguinte' | 'mesmo_dia'
        calMode: 'week',  // 'week' | 'month'
        calCursor: hojeISO(),
        calDados: null,
        dadosDia: null,
        busca: '',
        filtro: 'todos', // 'todos' | 'pendentes' | 'equip_insumos' | 'succao' | 'concluidos'
        uploadingKey: null
    };

    function authHeaders() {
        const t = localStorage.getItem('token');
        return t ? { 'Authorization': 'Bearer ' + t, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
    }
    async function api(url, opts = {}) {
        const r = await fetch(url, Object.assign({ headers: authHeaders() }, opts));
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || ('Erro HTTP ' + r.status));
        return j;
    }

    function toast(msg, tipo = 'ok') {
        let el = document.getElementById('asep-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'asep-toast';
            document.body.appendChild(el);
        }
        el.className = 'alc-toast ' + (tipo === 'erro' ? 'erro' : 'ok');
        el.innerHTML = `<i class="ph-fill ${tipo === 'erro' ? 'ph-warning-circle' : 'ph-check-circle'}"></i><span>${esc(msg)}</span>`;
        el.classList.add('show');
        clearTimeout(el._t);
        el._t = setTimeout(() => el.classList.remove('show'), 2600);
    }

    // ── Compressão de imagem no celular antes do upload para o R2 ───────────────
    function lerArquivoComoBase64Comprimido(file, maxDim = 1280, quality = 0.82) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
            reader.onload = () => {
                const img = new Image();
                img.onerror = () => resolve(reader.result);
                img.onload = () => {
                    let w = img.width;
                    let h = img.height;
                    if (w > maxDim || h > maxDim) {
                        if (w >= h) { h = Math.round((h * maxDim) / w); w = maxDim; }
                        else { w = Math.round((w * maxDim) / h); h = maxDim; }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // ═══════════════ Estilos CSS dedicados ═══════════════
    function injectStyles() {
        if (document.getElementById('asep-styles')) return;
        const st = document.createElement('style');
        st.id = 'asep-styles';
        st.textContent = `
        #app-lideranca-separacao-view {
            padding-bottom: 84px;
        }
        .asep-wrap {
            max-width: 960px;
            margin: 0 auto;
        }
        .asep-hero {
            background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%);
            color: #fff;
            border-radius: 16px;
            padding: 14px 16px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
            box-shadow: 0 6px 18px rgba(49, 46, 129, 0.22);
        }
        .asep-hero-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .asep-hero-ic {
            width: 46px;
            height: 46px;
            border-radius: 12px;
            background: rgba(255,255,255,0.16);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            flex-shrink: 0;
        }
        .asep-hero-title {
            font-size: 1.1rem;
            font-weight: 800;
            letter-spacing: 0.01em;
            line-height: 1.2;
        }
        .asep-hero-sub {
            font-size: 0.8rem;
            opacity: 0.9;
            margin-top: 3px;
        }
        .asep-hero-pill {
            background: rgba(255,255,255,0.18);
            border: 1px solid rgba(255,255,255,0.3);
            padding: 7px 13px;
            border-radius: 999px;
            font-size: 0.84rem;
            font-weight: 800;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        /* Seletor de data da rota a separar (Dia Seguinte vs Data Selecionada) */
        .asep-modo-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            flex-wrap: wrap;
            background: #f8fafc;
            border: 1.5px solid #e2e8f0;
            border-radius: 12px;
            padding: 8px 12px;
            margin-bottom: 10px;
        }
        .asep-modo-lbl {
            font-size: 0.8rem;
            font-weight: 700;
            color: #334155;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .asep-modo-btns {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
        }
        .asep-modo-btn {
            min-height: 38px;
            padding: 6px 12px;
            border-radius: 999px;
            border: 1.5px solid #cbd5e1;
            background: #fff;
            color: #334155;
            font-size: 0.78rem;
            font-weight: 800;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            transition: all .15s;
        }
        .asep-modo-btn.on {
            background: #312e81;
            border-color: #312e81;
            color: #fff;
        }

        /* Quadro do veículo — cores de status obrigatórias */
        .asep-veic-card {
            background: #fff;
            border: 2px solid #cbd5e1;
            border-radius: 16px;
            margin-bottom: 14px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
            transition: background .2s, border-color .2s;
        }
        .asep-veic-card.st-concluido {
            background: #dcfce7 !important;
            border-color: #22c55e !important;
        }
        .asep-veic-card.st-em_andamento {
            background: #fef9c3 !important;
            border-color: #eab308 !important;
        }
        .asep-veic-card.st-atrasado {
            background: #fee2e2 !important;
            border-color: #ef4444 !important;
        }

        .asep-veic-head {
            padding: 12px 14px;
            border-bottom: 1.5px solid rgba(15, 23, 42, 0.08);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            flex-wrap: wrap;
            background: rgba(255, 255, 255, 0.55);
        }
        .asep-veic-title {
            font-size: 1rem;
            font-weight: 900;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .asep-placa-pill {
            background: #1e293b;
            color: #fff;
            padding: 4px 10px;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 900;
            letter-spacing: 0.04em;
        }
        .asep-crew-bar {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 14px;
            background: rgba(255,255,255,0.45);
            border-bottom: 1px solid rgba(15,23,42,0.06);
            flex-wrap: wrap;
        }
        .asep-crew-item {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            font-size: 0.8rem;
            color: #1e293b;
        }
        .asep-crew-av {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #e2e8f0;
            color: #1e293b;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 0.72rem;
            overflow: hidden;
            border: 2px solid #3b82f6;
            flex-shrink: 0;
        }
        .asep-crew-av.aju {
            border-color: #f59e0b;
        }
        .asep-crew-av img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .asep-veic-body {
            padding: 12px 14px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .asep-sec-block {
            background: rgba(255, 255, 255, 0.86);
            border: 1.5px solid rgba(15, 23, 42, 0.1);
            border-radius: 12px;
            padding: 10px 12px;
        }
        .asep-sec-title {
            font-size: 0.78rem;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
        }
        .asep-sec-title.eq { color: #1d4ed8; }
        .asep-sec-title.ins { color: #9a3412; }
        .asep-sec-title.suc { color: #0369a1; }

        .asep-item-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .asep-item-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            min-height: 54px;
            padding: 9px 11px;
            border-radius: 11px;
            background: #fff;
            border: 1.5px solid #e2e8f0;
            transition: all .15s;
        }
        .asep-item-row.done {
            background: #f0fdf4;
            border-color: #4ade80;
        }
        .asep-item-main {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
            min-width: 0;
        }
        .asep-item-ic {
            font-size: 1.35rem;
            line-height: 1;
            flex-shrink: 0;
        }
        .asep-item-txt {
            font-size: 0.92rem;
            font-weight: 800;
            color: #0f172a;
            line-height: 1.25;
            word-break: break-word;
        }
        .asep-item-row.done .asep-item-txt {
            color: #14532d;
        }
        .asep-item-sub {
            font-size: 0.74rem;
            color: #15803d;
            font-weight: 600;
            margin-top: 2px;
            display: flex;
            align-items: center;
            gap: 5px;
            flex-wrap: wrap;
        }

        .asep-item-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }
        .asep-thumb-btn {
            width: 46px;
            height: 46px;
            border-radius: 10px;
            overflow: hidden;
            border: 2px solid #22c55e;
            padding: 0;
            background: #f8fafc;
            cursor: pointer;
            position: relative;
            flex-shrink: 0;
        }
        .asep-thumb-btn img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .asep-cam-btn {
            min-height: 46px;
            padding: 8px 13px;
            border-radius: 10px;
            border: 1.5px solid #312e81;
            background: #312e81;
            color: #fff;
            font-size: 0.82rem;
            font-weight: 800;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all .15s;
        }
        .asep-cam-btn.done {
            background: #16a34a;
            border-color: #16a34a;
        }
        .asep-cam-btn:disabled {
            opacity: 0.6;
            cursor: wait;
        }

        /* Bloco dedicado de Sucção dos Veículos que Saíram no Dia */
        .asep-succao-panel {
            background: #f0f9ff;
            border: 2px solid #bae6fd;
            border-radius: 16px;
            padding: 12px 14px;
            margin-bottom: 14px;
        }
        .asep-succao-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 10px;
            flex-wrap: wrap;
        }
        .asep-succao-title {
            font-size: 0.96rem;
            font-weight: 900;
            color: #0c4a6e;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .asep-succao-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
            gap: 10px;
        }
        .asep-succao-card {
            background: #fff;
            border: 2px solid #cbd5e1;
            border-radius: 14px;
            padding: 11px 12px;
            display: flex;
            flex-direction: column;
            gap: 9px;
        }
        .asep-succao-card.st-concluido {
            background: #dcfce7 !important;
            border-color: #22c55e !important;
        }
        .asep-succao-card.st-atrasado {
            background: #fee2e2 !important;
            border-color: #ef4444 !important;
        }
        .asep-turno-tag {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 0.72rem;
            font-weight: 800;
            background: #e0f2fe;
            color: #0369a1;
        }
        .asep-turno-tag.noturno {
            background: #ede9fe;
            color: #5b21b6;
        }

        /* Modal de visualização da foto */
        .asep-lightbox {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.82);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
        }
        .asep-lightbox-card {
            background: #fff;
            border-radius: 16px;
            max-width: 520px;
            width: 100%;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0,0,0,0.45);
        }
        .asep-lightbox-img {
            width: 100%;
            max-height: 70vh;
            object-fit: contain;
            background: #0f172a;
            display: block;
        }
        .asep-lightbox-foot {
            padding: 12px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            flex-wrap: wrap;
        }
        `;
        document.head.appendChild(st);
    }

    // ═══════════════ Calendário Semanal / Mensal ═══════════════
    function rangeCalendario() {
        const ref = new Date(S.calCursor + 'T12:00:00');
        if (S.calMode === 'week') {
            const dow = ref.getDay();
            const seg = new Date(ref);
            seg.setDate(ref.getDate() - ((dow + 6) % 7));
            const dom = new Date(seg);
            dom.setDate(seg.getDate() + 6);
            return { ini: seg.toISOString().slice(0, 10), fim: dom.toISOString().slice(0, 10) };
        }
        const ini = new Date(ref.getFullYear(), ref.getMonth(), 1);
        const fim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
        return { ini: ini.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
    }

    async function carregarCalendario() {
        const { ini, fim } = rangeCalendario();
        try {
            S.calDados = await api(`/api/app/separacao/calendario?ini=${ini}&fim=${fim}`);
        } catch (e) {
            S.calDados = { ini, fim, hoje: hojeISO(), dias: {} };
        }
    }

    function renderCalendarioHTML() {
        const d = S.calDados || { dias: {}, hoje: hojeISO() };
        const dias = d.dias || {};
        const hoje = d.hoje || hojeISO();
        const DIAS_SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        let cells = '';
        if (S.calMode === 'week') {
            const { ini } = rangeCalendario();
            for (let i = 0; i < 7; i++) {
                const iso = somaDias(ini, i);
                const dt = new Date(iso + 'T12:00:00');
                const info = dias[iso] || { status: 'vazio', checks_concluidos: 0 };
                const sel = iso === S.data ? 'sel' : '';
                const hj = iso === hoje ? 'hoje' : '';
                cells += `
                <button type="button" class="alr-cal-day ${ info.status || 'vazio' } ${sel} ${hj}" data-iso="${iso}">
                    <span class="alr-cal-dow">${DIAS_SEM[dt.getDay()]}</span>
                    <span class="alr-cal-num">${String(dt.getDate()).padStart(2, '0')}</span>
                    <span class="alr-cal-dot">${info.checks_concluidos ? info.checks_concluidos : ''}</span>
                </button>`;
            }
        } else {
            const ref = new Date(S.calCursor + 'T12:00:00');
            const y = ref.getFullYear(), m = ref.getMonth();
            const first = new Date(y, m, 1);
            const last = new Date(y, m + 1, 0);
            const padStart = (first.getDay() + 6) % 7;
            cells += ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(w => `<div class="alr-cal-hdr">${w}</div>`).join('');
            for (let i = 0; i < padStart; i++) cells += `<div class="alr-cal-empty"></div>`;
            for (let day = 1; day <= last.getDate(); day++) {
                const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const info = dias[iso] || { status: 'vazio', checks_concluidos: 0 };
                const sel = iso === S.data ? 'sel' : '';
                const hj = iso === hoje ? 'hoje' : '';
                cells += `
                <button type="button" class="alr-cal-day ${info.status || 'vazio'} ${sel} ${hj}" data-iso="${iso}">
                    <span class="alr-cal-num">${day}</span>
                    <span class="alr-cal-dot">${info.checks_concluidos ? info.checks_concluidos : ''}</span>
                </button>`;
            }
        }

        const ref = new Date(S.calCursor + 'T12:00:00');
        const tituloMes = ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        return `
        <div class="alr-cal">
            <div class="alr-cal-top">
                <div class="alr-cal-nav">
                    <button type="button" class="alc-icon-btn sm" id="asep-cal-prev" title="Anterior"><i class="ph ph-caret-left"></i></button>
                    <strong class="alr-cal-title">${esc(tituloMes.charAt(0).toUpperCase() + tituloMes.slice(1))}</strong>
                    <button type="button" class="alc-icon-btn sm" id="asep-cal-next" title="Próximo"><i class="ph ph-caret-right"></i></button>
                    <button type="button" class="alr-hoje-pill" id="asep-cal-hoje">Hoje</button>
                </div>
                <div class="alr-cal-RightGrp">
                    <label class="alr-date-QuickPick" title="Ir para uma data específica">
                        <i class="ph ph-calendar-blank"></i>
                        <input type="date" id="asep-date-input" value="${esc(S.data)}">
                    </label>
                    <div class="alr-cal-toggle">
                        <button type="button" class="alr-tgl ${S.calMode === 'week' ? 'on' : ''}" data-mode="week">Semana</button>
                        <button type="button" class="alr-tgl ${S.calMode === 'month' ? 'on' : ''}" data-mode="month">Mês</button>
                    </div>
                </div>
            </div>
            <div class="alr-cal-grid ${S.calMode}">${cells}</div>
        </div>`;
    }

    // ═══════════════ Renderização de um Item de Checklist com Foto ═══════════════
    function renderItemChecklistFoto(dataRef, veiculoKey, veiculoNome, item) {
        const upKey = `${dataRef}|${veiculoKey}|${item.item_key}`;
        const isUploading = S.uploadingKey === upKey;
        const done = !!item.checked;
        const fotoUrl = item.ultima_foto_url || (item.fotos && item.fotos[0] && item.fotos[0].url) || null;
        const fotoId = (item.fotos && item.fotos[0] && item.fotos[0].id) || '';

        const subHtml = done
            ? `<div class="asep-item-sub">
                <i class="ph-fill ph-check-circle"></i>
                <span>Conferido c/ foto${item.lider_nome ? ` por <b>${esc(item.lider_nome.split(' ').slice(0, 2).join(' '))}</b>` : ''}</span>
               </div>`
            : `<div class="asep-item-sub" style="color:#64748b;">
                <i class="ph ph-camera"></i>
                <span>Obrigatório registrar 1 foto para confirmar</span>
               </div>`;

        return `
        <div class="asep-item-row ${done ? 'done' : ''}">
            <div class="asep-item-main">
                <span class="asep-item-ic">${item.icone || '📦'}</span>
                <div style="min-width:0;flex:1;">
                    <div class="asep-item-txt">${esc(item.texto)}</div>
                    ${subHtml}
                </div>
            </div>
            <div class="asep-item-actions">
                ${fotoUrl ? `
                    <button type="button" class="asep-thumb-btn"
                        data-action="ver-foto"
                        data-foto-url="${esc(fotoUrl)}"
                        data-foto-id="${esc(fotoId)}"
                        data-titulo="${esc(veiculoNome + ' — ' + item.texto)}"
                        title="Ver foto registrada">
                        <img src="${esc(fotoUrl)}" alt="Foto">
                    </button>
                ` : ''}
                <button type="button" class="asep-cam-btn ${done ? 'done' : ''}"
                    data-action="tirar-foto"
                    data-data-ref="${esc(dataRef)}"
                    data-veiculo-key="${esc(veiculoKey)}"
                    data-veiculo-nome="${esc(veiculoNome)}"
                    data-item-key="${esc(item.item_key)}"
                    data-categoria="${esc(item.categoria || 'equipamento')}"
                    data-titulo="${esc(item.texto)}"
                    ${isUploading ? 'disabled' : ''}>
                    <i class="ph-bold ${isUploading ? 'ph-spinner ph-spin' : (done ? 'ph-camera-rotate' : 'ph-camera')}"></i>
                    <span>${isUploading ? 'Enviando...' : (done ? 'Nova Foto' : 'Foto')}</span>
                </button>
            </div>
        </div>`;
    }

    // ═══════════════ Card por Placa de Veículo (Equipamentos + Insumos + Sucção) ═══════════════
    function renderCardVeiculoSeparacao(v) {
        const stClass = `st-${v.estado_visual || 'pendente'}`;
        const badgeColor = v.estado_visual === 'concluido'
            ? 'verde'
            : (v.estado_visual === 'em_andamento' ? 'laranja' : 'vermelho');

        const motIni = esc(iniciais(v.motorista?.nome || 'M'));
        const ajuIni = esc(iniciais(v.ajudante?.nome || 'A'));

        const motAv = v.motorista?.foto_url
            ? `<img src="${esc(v.motorista.foto_url)}" alt="" onerror="this.outerHTML='<span>${motIni}</span>'">`
            : `<span>${motIni}</span>`;
        const ajuAv = v.ajudante?.foto_url
            ? `<img src="${esc(v.ajudante.foto_url)}" alt="" onerror="this.outerHTML='<span>${ajuIni}</span>'">`
            : `<span>${ajuIni}</span>`;

        const eqDone = (v.equipamentos || []).filter(i => i.checked).length;
        const insDone = (v.insumos || []).filter(i => i.checked).length;

        return `
        <article class="asep-veic-card ${stClass}">
            <div class="asep-veic-head">
                <div class="asep-veic-title">
                    <span class="asep-placa-pill">🚚 ${esc(v.placa)}</span>
                    <span>${esc(v.veiculo)}</span>
                </div>
                <span class="alc-badge ${badgeColor}">
                    <i class="ph-fill ${v.estado_visual === 'concluido' ? 'ph-check-circle' : 'ph-camera'}"></i>
                    ${v.itens_concluidos}/${v.total_itens} c/ foto
                </span>
            </div>

            <div class="asep-crew-bar">
                <div class="asep-crew-item">
                    <span class="asep-crew-av">${motAv}</span>
                    <div><b>${esc(v.motorista?.nome || '—')}</b> <small style="color:#64748b;">(Motorista)</small></div>
                </div>
                ${v.ajudante?.nome && v.ajudante.nome !== '—' ? `
                <div class="asep-crew-item">
                    <span class="asep-crew-av aju">${ajuAv}</span>
                    <div><b>${esc(v.ajudante.nome)}</b> <small style="color:#64748b;">(Ajudante)</small></div>
                </div>` : ''}
            </div>

            <div class="asep-veic-body">
                <!-- 1. EQUIPAMENTOS QUE SAIRÃO NO DIA SEGUINTE -->
                <div class="asep-sec-block">
                    <div class="asep-sec-title eq">
                        <span><i class="ph-fill ph-package"></i> Equipamentos para Separar (Saída)</span>
                        <span class="alc-badge ${eqDone >= v.equipamentos.length && v.equipamentos.length > 0 ? 'verde' : 'azul'}">${eqDone}/${v.equipamentos.length}</span>
                    </div>
                    ${v.equipamentos.length ? `
                        <div class="asep-item-list">
                            ${v.equipamentos.map(eq => renderItemChecklistFoto(v.data_ref, v.veiculo_key, v.veiculo, eq)).join('')}
                        </div>
                    ` : `<div style="font-size:0.8rem;color:#64748b;padding:4px 0;">Nenhum equipamento de entrega/saída previsto para este veículo.</div>`}
                </div>

                <!-- 2. INSUMOS QUE DEVEM SER SEPARADOS NO DIA ANTERIOR -->
                <div class="asep-sec-block">
                    <div class="asep-sec-title ins">
                        <span><i class="ph-fill ph-flask"></i> Insumos para Separar no Dia Anterior</span>
                        <span class="alc-badge ${insDone >= v.insumos.length && v.insumos.length > 0 ? 'verde' : 'laranja'}">${insDone}/${v.insumos.length}</span>
                    </div>
                    ${v.insumos.length ? `
                        <div class="asep-item-list">
                            ${v.insumos.map(ins => renderItemChecklistFoto(v.data_ref, v.veiculo_key, v.veiculo, ins)).join('')}
                        </div>
                    ` : `<div style="font-size:0.8rem;color:#64748b;padding:4px 0;">Nenhum insumo calculado para este veículo.</div>`}
                </div>

                <!-- 3. SE ESTE VEÍCULO TAMBÉM SAIU NO DIA, MOSTRAR AVISO DE SUCÇÃO -->
                ${v.succao_hoje ? `
                <div class="asep-sec-block" style="background:#f0f9ff;border-color:#7dd3fc;">
                    <div class="asep-sec-title suc">
                        <span><i class="ph-fill ph-drop"></i> Sucção do Veículo (Saiu em ${esc(fmtBR(v.succao_hoje.data_ref))})</span>
                        <span class="alc-badge ${v.succao_hoje.checked ? 'verde' : 'vermelho'}">${v.succao_hoje.checked ? '1/1 OK' : 'Pendente'}</span>
                    </div>
                    <div class="asep-item-list">
                        ${renderItemChecklistFoto(v.succao_hoje.data_ref, v.succao_hoje.veiculo_key, v.veiculo, v.succao_hoje)}
                    </div>
                </div>
                ` : ''}
            </div>
        </article>`;
    }

    // ═══════════════ Painel de Todos os Veículos que Saíram no Dia (Diurna + Noturna) para Sucção ═══════════════
    function renderPainelSuccaoVeiculosDia(veiculosSuccao, dataNoiteBr) {
        if (!veiculosSuccao.length) {
            return `
            <div class="asep-succao-panel">
                <div class="asep-succao-head">
                    <div class="asep-succao-title">
                        <i class="ph-fill ph-drop"></i>
                        <span>Veículos que Saíram no Dia (${esc(dataNoiteBr)}) — Realizar Sucção</span>
                    </div>
                    <span class="alc-badge cinza">0 veículos</span>
                </div>
                <div style="font-size:0.82rem;color:#475569;">Nenhum veículo com rota salva em ${esc(dataNoiteBr)} para realizar sucção.</div>
            </div>`;
        }

        const concl = veiculosSuccao.filter(s => s.checked).length;

        return `
        <section class="asep-succao-panel">
            <div class="asep-succao-head">
                <div>
                    <div class="asep-succao-title">
                        <i class="ph-fill ph-drop"></i>
                        <span>💦 Veículos que Saíram no Dia (${esc(dataNoiteBr)}) — Realizar Sucção</span>
                    </div>
                    <small style="color:#0369a1;font-weight:600;">Inclui todos os veículos da Rota Diurna e da Rota Noturna do dia que precisam de sucção</small>
                </div>
                <span class="alc-badge ${concl >= veiculosSuccao.length ? 'verde' : 'vermelho'}">${concl}/${veiculosSuccao.length} c/ foto</span>
            </div>
            <div class="asep-succao-grid">
                ${veiculosSuccao.map(s => {
                    const turnosBadges = (s.turnos_saida || ['diurno']).map(t =>
                        t === 'noturno'
                            ? `<span class="asep-turno-tag noturno">🌙 Saiu na Rota Noturna</span>`
                            : `<span class="asep-turno-tag">☀️ Saiu na Rota Diurna</span>`
                    ).join(' ');
                    return `
                    <div class="asep-succao-card st-${s.estado_visual}">
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                            <span class="asep-placa-pill">🚚 ${esc(s.placa)}</span>
                            <div style="display:flex;gap:4px;flex-wrap:wrap;">${turnosBadges}</div>
                        </div>
                        <div style="font-size:0.82rem;font-weight:700;color:#1e293b;">
                            ${esc(s.veiculo)} • Mot.: ${esc(s.motorista?.nome || '—')}
                        </div>
                        ${renderItemChecklistFoto(s.data_ref, s.veiculo_key, s.veiculo, s)}
                    </div>`;
                }).join('')}
            </div>
        </section>`;
    }

    // ═══════════════ Carregar Dados e Renderizar Tela Principal ═══════════════
    async function carregarDia() {
        const root = document.getElementById('app-lideranca-separacao-view');
        if (!root) return;
        injectStyles();

        root.innerHTML = `
            <div class="asep-wrap">
                ${renderCalendarioHTML()}
                <div class="alc-empty"><i class="ph ph-spinner ph-spin"></i><p>Carregando separação noturna de equipamentos, insumos e sucção...</p></div>
            </div>`;
        bindCalendario();

        try {
            const d = await api(`/api/app/separacao?data=${encodeURIComponent(S.data)}&modo_rota=${encodeURIComponent(S.modoRota)}`);
            S.dadosDia = d;
            renderTela();
        } catch (e) {
            root.innerHTML = `
                <div class="asep-wrap">
                    ${renderCalendarioHTML()}
                    <div class="alc-empty erro"><i class="ph ph-warning-circle"></i><p>${esc(e.message)}</p></div>
                </div>`;
            bindCalendario();
        }
    }

    function renderListaConteudo() {
        const d = S.dadosDia || {};
        const q = normBusca(S.busca);

        const filtraVeicSep = (v) => {
            if (S.filtro === 'pendentes' && v.estado_visual === 'concluido') return false;
            if (S.filtro === 'concluidos' && v.estado_visual !== 'concluido') return false;
            if (!q) return true;
            const eqTxt = (v.equipamentos || []).map(e => e.texto).join(' ');
            const insTxt = (v.insumos || []).map(i => i.texto).join(' ');
            const alvo = normBusca([v.placa, v.veiculo, v.motorista?.nome, v.ajudante?.nome, eqTxt, insTxt].join(' '));
            return alvo.includes(q);
        };

        const filtraVeicSuc = (s) => {
            if (S.filtro === 'pendentes' && s.checked) return false;
            if (S.filtro === 'concluidos' && !s.checked) return false;
            if (!q) return true;
            const alvo = normBusca([s.placa, s.veiculo, s.motorista?.nome, s.ajudante?.nome, s.texto].join(' '));
            return alvo.includes(q);
        };

        const veiculosSep = (d.veiculos_separacao || []).filter(filtraVeicSep);
        const veiculosSuc = (d.veiculos_succao || []).filter(filtraVeicSuc);

        let html = '';

        // 1. Painel de Sucção dos Veículos que Saíram no Dia (Diurna + Noturna)
        if (S.filtro === 'todos' || S.filtro === 'pendentes' || S.filtro === 'succao' || S.filtro === 'concluidos') {
            html += renderPainelSuccaoVeiculosDia(veiculosSuc, d.data_noite_br || fmtBR(S.data));
        }

        // 2. Quadros por Placa de Veículo (Equipamentos + Insumos)
        if (S.filtro !== 'succao') {
            if (!veiculosSep.length) {
                html += `
                <div class="alc-empty" style="margin-top:10px;">
                    <i class="ph-duotone ph-package"></i>
                    <p>Nenhum veículo encontrado para separação em <b>${esc(d.data_rota_separacao_br || fmtBR(S.data))}</b>.</p>
                </div>`;
            } else {
                html += veiculosSep.map(renderCardVeiculoSeparacao).join('');
            }
        }

        return html;
    }

    function renderTela() {
        const root = document.getElementById('app-lideranca-separacao-view');
        if (!root) return;
        const d = S.dadosDia || {};
        const cnt = d.contadores || {
            total_geral: 0, concluidos_geral: 0, pendentes_geral: 0,
            total_veiculos_separacao: 0, total_succao: 0
        };

        root.innerHTML = `
        <div class="asep-wrap">
            ${renderCalendarioHTML()}

            <!-- Banner Principal da Separação Noturna -->
            <div class="asep-hero">
                <div class="asep-hero-left">
                    <div class="asep-hero-ic"><i class="ph-fill ph-package"></i></div>
                    <div>
                        <div class="asep-hero-title">Separação Noturna — Equipamentos, Insumos e Sucção</div>
                        <div class="asep-hero-sub">
                            Noite selecionada: <b>${esc(fmtDataExtenso(S.data))}</b> • Rota em separação: <b>${esc(d.data_rota_separacao_br || '')}</b>
                        </div>
                    </div>
                </div>
                <div class="asep-hero-pill">
                    <i class="ph-fill ph-camera"></i>
                    <span>${cnt.concluidos_geral} / ${cnt.total_geral} itens c/ foto</span>
                </div>
            </div>

            <!-- Alternador de Data da Rota para Separação (Dia Seguinte vs Data Selecionada) -->
            <div class="asep-modo-bar">
                <div class="asep-modo-lbl">
                    <i class="ph-fill ph-moon-stars"></i>
                    <span>Separando equipamentos e insumos para a rota de:</span>
                </div>
                <div class="asep-modo-btns">
                    <button type="button" class="asep-modo-btn ${d.modo_rota === 'dia_seguinte' ? 'on' : ''}" data-modo-rota="dia_seguinte">
                        🌙 Dia Seguinte (${esc(d.data_seguinte_br || '')})
                    </button>
                    <button type="button" class="asep-modo-btn ${d.modo_rota === 'mesmo_dia' ? 'on' : ''}" data-modo-rota="mesmo_dia">
                        📅 Data Selecionada (${esc(d.data_noite_br || '')})
                    </button>
                </div>
            </div>

            <!-- Barra de Pesquisa Digitável em Tempo Real + Chips de Filtro -->
            <div class="alr-busca-bar" style="margin-bottom:12px;">
                <div class="alr-busca">
                    <i class="ph ph-magnifying-glass"></i>
                    <input type="search" id="asep-busca-input" placeholder="Pesquisar placa, motorista, equipamento (STD, Guarita...) ou insumo..." value="${esc(S.busca)}" autocomplete="off">
                    ${S.busca ? `<button type="button" class="alc-icon-btn sm" id="asep-busca-clear"><i class="ph ph-x"></i></button>` : ''}
                </div>
                <div class="alr-chips">
                    <button type="button" class="alr-chip ${S.filtro === 'todos' ? 'on' : ''}" data-f="todos">
                        <i class="ph ph-squares-four"></i> Todos <span>${cnt.total_geral}</span>
                    </button>
                    <button type="button" class="alr-chip ${S.filtro === 'pendentes' ? 'on' : ''}" data-f="pendentes">
                        <i class="ph ph-clock-countdown"></i> Pendentes <span class="warn">${cnt.pendentes_geral}</span>
                    </button>
                    <button type="button" class="alr-chip ${S.filtro === 'equip_insumos' ? 'on' : ''}" data-f="equip_insumos">
                        <i class="ph ph-package"></i> Equipamentos & Insumos <span>${cnt.total_veiculos_separacao}</span>
                    </button>
                    <button type="button" class="alr-chip ${S.filtro === 'succao' ? 'on' : ''}" data-f="succao">
                        <i class="ph ph-drop"></i> Sucção do Dia <span>${cnt.total_succao}</span>
                    </button>
                    <button type="button" class="alr-chip ${S.filtro === 'concluidos' ? 'on' : ''}" data-f="concluidos">
                        <i class="ph ph-check-circle"></i> Concluídos <span class="ok">${cnt.concluidos_geral}</span>
                    </button>
                </div>
            </div>

            <!-- Conteúdo Principal -->
            <div id="asep-lista-root">
                ${renderListaConteudo()}
            </div>
        </div>

        <!-- Input oculto para câmera / galeria -->
        <input type="file" id="asep-hidden-file" accept="image/*" capture="environment" style="display:none;">
        `;

        bindCalendario();
        bindEventosTela();
    }

    function bindCalendario() {
        const prev = document.getElementById('asep-cal-prev');
        const next = document.getElementById('asep-cal-next');
        const hoje = document.getElementById('asep-cal-hoje');
        if (prev) prev.onclick = async () => {
            S.calCursor = somaDias(S.calCursor, S.calMode === 'week' ? -7 : -30);
            await carregarCalendario();
            renderTela();
        };
        if (next) next.onclick = async () => {
            S.calCursor = somaDias(S.calCursor, S.calMode === 'week' ? 7 : 30);
            await carregarCalendario();
            renderTela();
        };
        if (hoje) hoje.onclick = async () => {
            S.data = hojeISO();
            S.calCursor = S.data;
            await carregarCalendario();
            await carregarDia();
        };
        const dateInp = document.getElementById('asep-date-input');
        if (dateInp) {
            dateInp.onchange = async () => {
                const novaData = (dateInp.value || '').trim();
                if (!/^\d{4}-\d{2}-\d{2}$/.test(novaData) || novaData === S.data) return;
                S.data = novaData;
                S.calCursor = novaData;
                await carregarCalendario();
                await carregarDia();
            };
        }
        document.querySelectorAll('#app-lideranca-separacao-view .alr-tgl').forEach(b => {
            b.onclick = async () => {
                S.calMode = b.dataset.mode;
                await carregarCalendario();
                renderTela();
            };
        });
        document.querySelectorAll('#app-lideranca-separacao-view .alr-cal-day').forEach(b => {
            b.onclick = async () => {
                S.data = b.dataset.iso;
                S.calCursor = S.data;
                await carregarDia();
            };
        });
    }

    function bindEventosLista() {
        const root = document.getElementById('asep-lista-root');
        if (!root) return;

        // Botão de tirar / anexar foto
        root.querySelectorAll('[data-action="tirar-foto"]').forEach(btn => {
            btn.onclick = () => {
                const fileInp = document.getElementById('asep-hidden-file');
                if (!fileInp) return;
                fileInp.value = '';
                fileInp.onchange = async () => {
                    const file = fileInp.files && fileInp.files[0];
                    if (!file) return;
                    const dataRef = btn.dataset.dataRef;
                    const veiculoKey = btn.dataset.veiculoKey;
                    const veiculoNome = btn.dataset.veiculoNome;
                    const itemKey = btn.dataset.itemKey;
                    const categoria = btn.dataset.categoria;
                    const titulo = btn.dataset.titulo;

                    S.uploadingKey = `${dataRef}|${veiculoKey}|${itemKey}`;
                    const listaRoot = document.getElementById('asep-lista-root');
                    if (listaRoot) {
                        listaRoot.innerHTML = renderListaConteudo();
                        bindEventosLista();
                    }

                    try {
                        const b64 = await lerArquivoComoBase64Comprimido(file);
                        await api('/api/app/separacao/foto', {
                            method: 'POST',
                            body: JSON.stringify({
                                data_ref: dataRef,
                                veiculo_key: veiculoKey,
                                veiculo_nome: veiculoNome,
                                item_key: itemKey,
                                categoria,
                                titulo,
                                foto_base64: b64
                            })
                        });
                        toast('Foto salva e item confirmado!', 'ok');
                    } catch (e) {
                        toast(e.message || 'Erro ao enviar foto', 'erro');
                    } finally {
                        S.uploadingKey = null;
                        await carregarDia();
                    }
                };
                fileInp.click();
            };
        });

        // Visualizar foto no Lightbox
        root.querySelectorAll('[data-action="ver-foto"]').forEach(btn => {
            btn.onclick = () => {
                const url = btn.dataset.fotoUrl;
                const fotoId = btn.dataset.fotoId;
                const tit = btn.dataset.titulo || 'Foto da Separação';
                abrirLightboxFoto(url, fotoId, tit);
            };
        });
    }

    function abrirLightboxFoto(url, fotoId, titulo) {
        const old = document.getElementById('asep-lightbox');
        if (old) old.remove();
        const lb = document.createElement('div');
        lb.id = 'asep-lightbox';
        lb.className = 'asep-lightbox';
        lb.innerHTML = `
            <div class="asep-lightbox-card">
                <img src="${esc(url)}" alt="Foto" class="asep-lightbox-img">
                <div class="asep-lightbox-foot">
                    <strong style="font-size:0.86rem;color:#0f172a;">${esc(titulo)}</strong>
                    <div style="display:flex;gap:8px;">
                        ${fotoId ? `<button type="button" class="alc-btn" id="asep-lb-del" style="background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;">
                            <i class="ph ph-trash"></i> Remover vínculo
                        </button>` : ''}
                        <button type="button" class="alc-btn alc-btn-primary" id="asep-lb-close">Fechar</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(lb);
        lb.onclick = (ev) => { if (ev.target === lb) lb.remove(); };
        const bClose = document.getElementById('asep-lb-close');
        if (bClose) bClose.onclick = () => lb.remove();
        const bDel = document.getElementById('asep-lb-del');
        if (bDel && fotoId) {
            bDel.onclick = async () => {
                bDel.disabled = true;
                try {
                    await api(`/api/app/separacao/foto/${fotoId}`, { method: 'DELETE' });
                    lb.remove();
                    toast('Foto desvinculada do item.', 'ok');
                    await carregarDia();
                } catch (e) {
                    toast(e.message, 'erro');
                    bDel.disabled = false;
                }
            };
        }
    }

    function bindEventosTela() {
        // Alternar modo de rota (Dia Seguinte vs Data Selecionada)
        document.querySelectorAll('#app-lideranca-separacao-view [data-modo-rota]').forEach(b => {
            b.onclick = async () => {
                S.modoRota = b.dataset.modoRota;
                await carregarDia();
            };
        });

        // Busca digitável em tempo real (sem perder foco)
        const inp = document.getElementById('asep-busca-input');
        if (inp) {
            inp.oninput = () => {
                S.busca = inp.value;
                const listaRoot = document.getElementById('asep-lista-root');
                if (listaRoot) {
                    listaRoot.innerHTML = renderListaConteudo();
                    bindEventosLista();
                }
            };
        }
        const clr = document.getElementById('asep-busca-clear');
        if (clr) {
            clr.onclick = () => {
                S.busca = '';
                renderTela();
            };
        }

        // Chips de filtro
        document.querySelectorAll('#app-lideranca-separacao-view .alr-chip[data-f]').forEach(b => {
            b.onclick = () => {
                S.filtro = b.dataset.f;
                renderTela();
            };
        });

        bindEventosLista();
    }

    // ═══════════════ Ponto de entrada global ═══════════════
    window.abrirAppLiderancaSeparacao = async function () {
        if (!S.calDados) await carregarCalendario();
        await carregarDia();
    };
    window.renderAppLiderancaSeparacao = window.abrirAppLiderancaSeparacao;
})();
