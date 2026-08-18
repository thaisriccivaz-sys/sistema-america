// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE CANDIDATOS — Kanban RH
// ═══════════════════════════════════════════════════════════════════════════════

(function() {
    "use strict";

    const COLUNAS = [
        { id: "Entrevistas",       cor: "#6366f1", icone: "ph-users" },
        { id: "Aguardando Data",   cor: "#f59e0b", icone: "ph-calendar-blank" },
        { id: "Teste 1\u00ba Dia", cor: "#3b82f6", icone: "ph-file-text" },
        { id: "Teste 2\u00ba Dia", cor: "#8b5cf6", icone: "ph-file-text" },
        { id: "Teste Extra",       cor: "#ec4899", icone: "ph-plus-circle" },
        { id: "Teste Finalizado",  cor: "#14b8a6", icone: "ph-flag-checkered" },
        { id: "Aprovado",          cor: "#10b981", icone: "ph-check-circle" },
        { id: "Reprovado",         cor: "#ef4444", icone: "ph-x-circle" },
    ];

    let _candidatos = [];
    let _dragId = null;
    let _dragStatus = null;

    const API = (path) => (window.API_URL || "/api").replace(/\/$/, '') + path.replace(/^\/api/, '');
    const token = () => localStorage.getItem("erp_token") || "";
    const authH = () => ({ "Authorization": "Bearer " + token(), "Content-Type": "application/json" });

    
    function getProxTesteHTML(c) {
        const dates = [];
        if (c.data_teste_1) dates.push({d: c.data_teste_1, t: '1º Dia', color: '#3b82f6', bg: '#eff6ff'});
        if (c.data_teste_2) dates.push({d: c.data_teste_2, t: '2º Dia', color: '#8b5cf6', bg: '#f5f3ff'});
        if (c.data_teste_extra) dates.push({d: c.data_teste_extra, t: 'Extra', color: '#ec4899', bg: '#fdf2f8'});
        if (dates.length === 0) return '';
        dates.sort((a,b) => a.d.localeCompare(b.d));
        let todayStr;
        try { todayStr = new Date().toLocaleString("en-CA", {timeZone: "America/Sao_Paulo"}).split(',')[0]; } 
        catch(e) { todayStr = new Date().toISOString().split('T')[0]; }
        let prox = dates.find(x => x.d >= todayStr) || dates[dates.length - 1];
        return `<div style="display:flex;align-items:center;gap:6px;font-size:0.75rem;color:#475569;margin-top:4px;">
            <i class="ph ph-calendar"></i>
            <span style="font-weight:700;background:${prox.bg};color:${prox.color};padding:2px 6px;border-radius:4px;font-size:0.7rem;">${prox.t}</span>
            <span style="font-weight:500;">${fmtBR(prox.d)}</span>
        </div>`;
    }
    function fmtBR(s) {
        if (!s) return "—";
        const d = new Date(s + (s.includes("T") ? "" : "T12:00:00-03:00"));
        return d.toLocaleDateString("pt-BR");
    }

    function fmtDTBR(s) {
        if (!s) return "";
        let dStr = s.replace(' ', 'T');
        if (!dStr.endsWith('Z') && !dStr.includes('-03:00')) dStr += 'Z';
        return new Date(dStr).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }

    window.initTestesCandidatos = async function() {
        const c = document.getElementById("view-testes-candidatos");
        if (!c) return;
        document.removeEventListener("paste", _onPasteGlobal);
        document.addEventListener("paste", _onPasteGlobal);
        await _load();
        _render();
    };

    async function _load() {
        try {
            const r = await fetch(API("/api/candidatos-teste"), { headers: { Authorization: "Bearer " + token() } });
            _candidatos = r.ok ? await r.json() : [];
        } catch(e) { _candidatos = []; }
    }

    function _render() {
        const el = document.getElementById("view-testes-candidatos");
        if (!el) return;
        el.innerHTML = `
        <div style="padding:16px 20px 0;">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
                <h2 style="margin:0;font-size:1.3rem;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:8px;">
                    <i class="ph ph-clipboard-text" style="color:#7c3aed;font-size:1.5rem;"></i> Testes de Candidatos
                </h2>
                <span style="background:#f3f4f6;border-radius:99px;padding:2px 12px;font-size:0.8rem;color:#64748b;">${_candidatos.length} candidato(s)</span>
                <button onclick="window._tcNovo()" style="margin-left:auto;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border:none;border-radius:8px;padding:8px 18px;font-size:0.85rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="ph ph-plus"></i> Novo Candidato</button>
                <button onclick="window.initTestesCandidatos()" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;cursor:pointer;color:#64748b;"><i class="ph ph-arrows-clockwise"></i></button>
            </div>
        </div>
        <div style="display:flex;gap:14px;overflow-x:auto;padding:0 20px 24px;min-height:calc(100vh - 180px);align-items:flex-start;">
            ${COLUNAS.map(col => _renderCol(col)).join("")}
        </div>`;
    }

    function _renderCol(col) {
        const cards = _candidatos.filter(c => c.status === col.id);
        return `<div style="flex-shrink:0;width:230px;background:#f8fafc;border-radius:12px;border:2px solid ${col.cor}22;display:flex;flex-direction:column;"
             ondragover="event.preventDefault()" ondrop="window._tcDrop(event,'${col.id}')">
            <div style="padding:10px 12px;background:${col.cor}11;border-radius:10px 10px 0 0;border-bottom:2px solid ${col.cor}33;display:flex;align-items:center;gap:6px;">
                <i class="ph ${col.icone}" style="color:${col.cor};font-size:1rem;"></i>
                <span style="font-size:0.8rem;font-weight:700;color:${col.cor};">${col.id}</span>
                <span style="margin-left:auto;background:${col.cor};color:#fff;border-radius:99px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;">${cards.length}</span>
            </div>
            <div style="padding:8px;display:flex;flex-direction:column;gap:8px;min-height:60px;flex:1;">
                ${cards.map(c => _renderCard(c)).join("")}
            </div>
        </div>`;
    }

    function _renderCard(c) {
        const ct = (c.tipo||"").includes("Motorista") ? "#2563eb" : "#d97706";
        const fotoEl = c.foto_base64
            ? `<img src="${c.foto_base64}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid ${ct};flex-shrink:0;">`
            : `<div style="width:38px;height:38px;border-radius:50%;background:${ct}22;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:${ct};flex-shrink:0;">${(c.nome||"?")[0].toUpperCase()}</div>`;
        return `<div draggable="true" ondragstart="window._tcDragStart(event,${c.id},'${c.status}')" onclick="window._tcDetalhes(${c.id})"
             style="background:#fff;border-radius:8px;padding:10px;box-shadow:0 1px 4px rgba(0,0,0,0.08);cursor:grab;border:1px solid #e2e8f0;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                ${fotoEl}
                <div style="min-width:0;flex:1;">
                    <div style="font-size:0.8rem;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${c.nome}">${c.nome.length > 15 ? c.nome.substring(0, 15) + "..." : c.nome}</div>
                    <span style="font-size:0.68rem;font-weight:700;color:${ct};background:${ct}18;border-radius:99px;padding:1px 6px;">${c.tipo === "Ajudante" ? "🪣 Ajudante" : (c.tipo === "Motorista B" ? "🛻 Motorista B" : (c.tipo === "Motorista D" ? "🚚 Motorista D" : "🚚 Motorista"))}</span>
                </div>
            </div>
            ${getProxTesteHTML(c)}
            <div style="display:flex;gap:4px;margin-top:4px;">
                <span style="font-size:0.68rem;color:${c.doc_url?"#10b981":"#ef4444"};background:${c.doc_url?"#f0fdf4":"#fef2f2"};border-radius:4px;padding:1px 5px;"><i class="ph ph-file-pdf"></i></span>
                ${(c.total_comentarios>0)?`<span style="font-size:0.68rem;color:#6366f1;background:#eef2ff;border-radius:4px;padding:1px 5px;"><i class="ph ph-chat-circle"></i> ${c.total_comentarios}</span>`:""}
                ${c.rota_motorista?`<span style="font-size:0.68rem;color:#f59e0b;background:#fffbeb;border-radius:4px;padding:1px 5px;"><i class="ph ph-truck"></i></span>`:""}
            </div>
        </div>`;
    }

    window._tcDragStart = function(e, id, status) { _dragId=id; _dragStatus=status; e.dataTransfer.effectAllowed="move"; };

    window._tcDrop = async function(e, novoStatus) {
        e.preventDefault();
        if (!_dragId || novoStatus === _dragStatus) return;
        const cand = _candidatos.find(c => c.id === _dragId);
        if (!cand) return;
        if (novoStatus === "Dias de Teste") {
            if (!cand.doc_url && !cand.doc_filename) { Swal.fire({icon: "warning", title: "Atenção", text: "É obrigatório anexar um documento antes de mover para o Teste."}); return; }
            if (cand.retornou_teste_extra) {
                if (!cand.data_teste_extra) { Swal.fire({icon: "warning", title: "Atenção", text: "Este candidato já retornou de testes antes. Preencha a data do Teste Extra nos detalhes antes de mover."}); return; }
            } else {
                if (!cand.data_teste_1 || !cand.data_teste_2) { Swal.fire({icon: "warning", title: "Atenção", text: "Preencha as datas do 1º Dia e 2º Dia nos detalhes antes de mover para esta coluna."}); return; }
            }
        }
        try {
            const r = await fetch(API(`/api/candidatos-teste/${_dragId}/status`), { method:"PUT", headers:authH(), body:JSON.stringify({status:novoStatus,data_teste}) });
            const data = await r.json();
            if (!r.ok) { Swal.fire({icon:"error",title:"Não permitido",text:data.error||"Erro ao mover.",confirmButtonColor:"#7c3aed"}); return; }
            await _load(); _render();
        } catch(err) { Swal.fire({icon:"error",title:"Erro",text:err.message}); }
    };
    window._tcNovo = function() {
        window._tcModalFoto = null;
        _modal(`<div style="max-width:460px;width:100%;background:#fff;border-radius:16px;padding:28px;position:relative;">
            <button onclick="window._tcFecharModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:1.3rem;cursor:pointer;color:#94a3b8;"><i class="ph ph-x"></i></button>
            <h3 style="margin:0 0 20px;color:#1e293b;font-size:1.1rem;display:flex;align-items:center;gap:8px;"><i class="ph ph-user-plus" style="color:#7c3aed;"></i> Novo Candidato</h3>
            <div style="margin-bottom:14px;">
                <label style="font-size:0.82rem;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Nome completo *</label>
                <input id="tc-n-nome" type="text" placeholder="Nome do candidato" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.88rem;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-size:0.82rem;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Tipo *</label>
                <div style="display:flex;gap:10px;">
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-n-tipo" value="Ajudante" checked> 🪣 Ajudante</label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-n-tipo" value="Motorista B"> 🛻 Motorista B</label><label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-n-tipo" value="Motorista D"> 🚚 Motorista D</label>
                </div>
            </div>
            <div style="margin-bottom:18px;">
                <label style="font-size:0.82rem;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Foto <span style="font-weight:400;color:#94a3b8;">(arquivo ou Ctrl+V)</span></label>
                <div id="tc-n-fprev" style="width:80px;height:80px;border-radius:50%;background:#f1f5f9;border:2px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:2rem;cursor:pointer;overflow:hidden;margin-bottom:8px;" onclick="document.getElementById('tc-n-finput').click()"><i class="ph ph-camera"></i></div>
                <input id="tc-n-finput" type="file" accept="image/*" style="display:none;" onchange="window._tcFoto(this,'tc-n-fprev')">
                <button onclick="document.getElementById('tc-n-finput').click()" style="font-size:0.78rem;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:4px 10px;cursor:pointer;color:#64748b;">Escolher arquivo</button>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button onclick="window._tcFecharModal()" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:0.85rem;color:#64748b;">Cancelar</button>
                <button onclick="window._tcSalvNovo()" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border:none;border-radius:8px;padding:8px 20px;font-size:0.85rem;font-weight:600;cursor:pointer;">Salvar</button>
            </div>
        </div>`);
    };

    window._tcFoto = function(input, prevId) {
        if (!input.files || !input.files[0]) return;
        const reader = new FileReader();
        reader.onload = e => {
            window._tcModalFoto = e.target.result;
            const p = document.getElementById(prevId);
            if (p) p.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
        };
        reader.readAsDataURL(input.files[0]);
    };

    function _onPasteGlobal(e) {
        const ov = document.getElementById("tc-modal-overlay");
        if (!ov || ov.style.display==="none") return;
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (let i=0; i<items.length; i++) {
            if (items[i].type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = ev => {
                    window._tcModalFoto = ev.target.result;
                    const p = document.getElementById("tc-n-fprev") || document.getElementById("tc-e-fprev");
                    if (p) p.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
                };
                reader.readAsDataURL(items[i].getAsFile());
                break;
            }
        }
    }

    window._tcSalvNovo = async function() {
        const nome = (document.getElementById("tc-n-nome")||{}).value||"";
        const tipo = document.querySelector("input[name=\"tc-n-tipo\"]:checked");
        if (!nome.trim()) { Swal.fire({icon:"warning",title:"Atenção",text:"Informe o nome."}); return; }
        try {
            const r = await fetch(API("/api/candidatos-teste"), { method:"POST", headers:authH(), body:JSON.stringify({nome:nome.trim(),tipo:tipo?tipo.value:"Ajudante",foto_base64:window._tcModalFoto||null}) });
            const d = await r.json();
            if (!r.ok) { Swal.fire({icon:"error",title:"Erro",text:d.error}); return; }
            window._tcFecharModal(); await _load(); _render();
            Swal.fire({icon:"success",title:"Candidato criado!",showConfirmButton:false,timer:1500});
        } catch(e) { Swal.fire({icon:"error",title:"Erro",text:e.message}); }
    };

    window._tcDetalhes = async function(id) {
        try {
            const r = await fetch(API(`/api/candidatos-teste/${id}`), { headers:{Authorization:"Bearer "+token()} });
            _renderDet(await r.json());
        } catch(e) { Swal.fire({icon:"error",title:"Erro",text:e.message}); }
    };

    function _renderDet(c) {
    const ct = (c.tipo||"").includes("Motorista")?"#2563eb":"#d97706";
    const foto = c.foto_base64
        ? `<img src="${c.foto_base64}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:3px solid ${ct};">`
        : `<div style="width:70px;height:70px;border-radius:50%;background:${ct}22;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:700;color:${ct};">${(c.nome||"?")[0].toUpperCase()}</div>`;

    const timelineHtml = (c.comentarios||[])
        .map(x => {
            if (x.tipo === "comentario") {
                return `<div style="background:#f8fafc;border-radius:8px;padding:10px;margin-bottom:8px;border-left:3px solid #7c3aed;">
                    <div style="font-size:0.75rem;font-weight:700;color:#334155;">${x.usuario_nome||"Usuário"}</div>
                    <div style="font-size:0.7rem;color:#94a3b8;margin-bottom:4px;">${fmtDTBR(x.created_at)}</div>
                    <div style="font-size:0.82rem;">${x.texto}</div>
                </div>`;
            } else {
                return `<div style="background:#f1f5f9;border-radius:8px;padding:8px 12px;margin-bottom:6px;font-size:0.78rem;color:#475569;display:flex;gap:6px;">
                    <i class="ph ph-arrow-right" style="color:#7c3aed;flex-shrink:0;margin-top:2px;"></i><span style="line-height:1.4;">${x.texto} <span style="color:#94a3b8;">- ${fmtDTBR(x.created_at)}</span></span>
                </div>`;
            }
        }).join("") || "<p style=\"text-align:center;color:#94a3b8;font-size:0.82rem;\">Sem histórico.</p>";

    const rotaHtml = c.rota
        ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px;margin-bottom:15px;">
            <p style="margin:0 0 6px;"><b>Data:</b> ${fmtBR(c.rota.data_rota)}</p>
            <p style="margin:0 0 6px;"><b>Motorista:</b> ${c.rota.motorista_nome||"-"}</p>
            <p style="margin:0 0 6px;"><b>Veículo:</b> ${c.rota.veiculo_texto||c.rota.placa||"-"}</p>
            <p style="margin:0;"><b>Etapa:</b> ${c.rota.etapa_teste||"-"}</p>
            <button onclick="window._tcRemRota(${c.id})" style="margin-top:10px;background:#fee2e2;color:#ef4444;border:1px solid #fecaca;border-radius:6px;padding:5px 12px;font-size:0.78rem;cursor:pointer;font-weight:600;"><i class="ph ph-trash"></i> Remover Rota</button>
        </div>` : "";

    const testesStr = [["1º Dia",c.data_teste_1,"Teste 1º Dia","#3b82f6"],["2º Dia",c.data_teste_2,"Teste 2º Dia","#8b5cf6"],["Extra",c.data_teste_extra,"Teste Extra","#ec4899"]].map(([label,data,status,cor])=>`
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;display:flex;align-items:center;gap:12px;">
            <div style="background:${cor}22;color:${cor};border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:700;"><i class="ph ph-check"></i></div>
            <div style="flex:1;"><div style="font-weight:700;font-size:0.85rem;color:#334155;">${label}</div><div style="font-size:0.75rem;color:#64748b;">${data?fmtBR(data):"Pendente"}</div></div>
            <button onclick="window._tcSetDTeste(${c.id},'${status}')" style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.75rem;cursor:pointer;color:#475569;font-weight:600;">Definir Data</button>
        </div>`).join("");

    const statusOptions = COLUNAS.map(col => `<option value="${col.id}" ${c.status === col.id ? 'selected' : ''}>${col.id}</option>`).join('');

    _modal(`<div style="width:85vw;max-width:1200px;background:#fff;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;max-height:90vh;">
        <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:20px 24px;display:flex;align-items:center;gap:16px;flex-shrink:0;">
            ${foto}
            <div style="flex:1;min-width:0;">
                <div style="font-size:1.4rem;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.nome}</div>
                <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;align-items:center;">
                    <span style="background:#fff3;color:#fff;border-radius:99px;padding:3px 12px;font-size:0.75rem;font-weight:700;">${c.tipo === "Ajudante" ? "🪣 Ajudante" : (c.tipo === "Motorista B" ? "🛻 Motorista B" : (c.tipo === "Motorista D" ? "🚚 Motorista D" : "🚚 Motorista"))}</span>
                    
                    <div style="display:flex;align-items:center;gap:6px;background:#fff;border-radius:6px;padding:3px 8px;">
                        <span style="font-size:0.75rem;font-weight:700;color:#7c3aed;">Status:</span>
                        <select onchange="window._tcChangeStatus(${c.id}, this.value)" style="border:none;background:transparent;font-size:0.8rem;font-weight:700;color:#334155;outline:none;cursor:pointer;">
                            ${statusOptions}
                        </select>
                    </div>

                    ${(function(){
    const datesArr = [c.data_teste_1, c.data_teste_2, c.data_teste_extra, c.data_teste].filter(d=>d).sort();
    let todayStr;
    try { todayStr = new Date().toLocaleString("en-CA", {timeZone: "America/Sao_Paulo"}).split(',')[0]; } catch(e) { todayStr = new Date().toISOString().split('T')[0]; }
    const proxData = datesArr.find(d => d >= todayStr) || datesArr[datesArr.length - 1] || "";
    return `<div style="display:flex;align-items:center;gap:6px;background:#fff;border-radius:6px;padding:3px 8px;">
        <span style="font-size:0.75rem;font-weight:700;color:#7c3aed;">Próx. Teste:</span>
        <span style="border:none;background:transparent;font-size:0.8rem;font-weight:700;color:#334155;outline:none;padding:2px;">${proxData ? fmtBR(proxData) : '-'}</span>
    </div>`;
})()}

                </div>
            </div>
            <div style="display:flex;gap:8px;align-self:flex-start;">
                <button onclick="window._tcEditar(${c.id})" style="background:#fff3;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;" title="Editar"><i class="ph ph-pencil"></i></button>
                <button onclick="window._tcExcluir(${c.id},'${c.nome.replace(/'/g,"\\\\'")}')" style="background:#fff3;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;" title="Excluir"><i class="ph ph-trash"></i></button>
                <button onclick="window._tcFecharModal()" style="background:#fff3;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:1.1rem;" title="Fechar"><i class="ph ph-x"></i></button>
            </div>
        </div>
        
        <div style="display:flex;flex:1;overflow:hidden;background:#f8fafc;">
            <!-- Coluna Esquerda: Dados, Docs, Testes -->
            <div style="flex:1;padding:24px;overflow-y:auto;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;gap:20px;">
                
                <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #f1f5f9;">
                    <h3 style="margin:0 0 12px 0;font-size:0.95rem;color:#334155;display:flex;align-items:center;gap:6px;"><i class="ph ph-user"></i> Informações</h3>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:0.85rem;">
                        <div><b style="color:#64748b;">Tipo:</b> ${c.tipo}</div>
                        <div><b style="color:#64748b;">Status Atual:</b> ${c.status}</div>
                        <div><b style="color:#64748b;">Próx. Teste:</b> ${(function(){
    const datesArr = [c.data_teste_1, c.data_teste_2, c.data_teste_extra, c.data_teste].filter(d=>d).sort();
    let todayStr;
    try { todayStr = new Date().toLocaleString("en-CA", {timeZone: "America/Sao_Paulo"}).split(',')[0]; } catch(e) { todayStr = new Date().toISOString().split('T')[0]; }
    const proxData = datesArr.find(d => d >= todayStr) || datesArr[datesArr.length - 1] || "";
    return proxData ? fmtBR(proxData) : "Não definida";
})()}</div>
                        <div><b style="color:#64748b;">Criado por:</b> ${c.criado_por_nome||"-"}</div>
                    </div>
                </div>

                <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #f1f5f9;">
                    <h3 style="margin:0 0 12px 0;font-size:0.95rem;color:#334155;display:flex;align-items:center;gap:6px;"><i class="ph ph-file-pdf"></i> Documento</h3>
                    ${c.doc_url?`<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin-bottom:12px;display:flex;align-items:center;gap:10px;">
                        <i class="ph ph-file-pdf" style="color:#10b981;font-size:1.4rem;"></i>
                        <div style="flex:1;min-width:0;overflow:hidden;"><div style="font-size:0.82rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.doc_filename||"Documento"}</div>
                        <div style="font-size:0.72rem;color:#10b981;">${c.doc_tipo||""} anexado</div></div>
                        <a href="${c.doc_url}" target="_blank" style="background:#10b981;color:#fff;border-radius:6px;padding:5px 12px;text-decoration:none;font-size:0.8rem;font-weight:600;">Ver</a>
                    </div>`:`<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin-bottom:12px;color:#ef4444;font-size:0.85rem;"><i class="ph ph-warning"></i> Nenhum documento anexado.</div>`}
                    <div style="display:flex;gap:8px;align-items:center;">
                        <input type="file" id="tc-doc-${c.id}" accept=".pdf" style="font-size:0.85rem;border:1px solid #cbd5e1;background:#f8fafc;border-radius:6px;padding:6px 10px;flex:1;">
                        <button onclick="window._tcUpDoc(${c.id},'\')" style="background:#6366f1;color:#fff;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;font-size:0.85rem;font-weight:600;white-space:nowrap;"><i class="ph ph-upload"></i> Enviar</button>
                    </div>
                </div>

                <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #f1f5f9;">
                    <h3 style="margin:0 0 12px 0;font-size:0.95rem;color:#334155;display:flex;align-items:center;gap:6px;"><i class="ph ph-calendar-check"></i> Testes</h3>
                    ${rotaHtml}
                    <div style="display:flex;flex-direction:column;gap:10px;">
                        ${testesStr}
                    </div>
                </div>
            </div>

            <!-- Coluna Direita: Comentários, Histórico -->
            <div style="width:380px;background:#fff;border-left:1px solid #e2e8f0;display:flex;flex-direction:column;flex-shrink:0;">
                <div style="padding:16px;border-bottom:1px solid #e2e8f0;display:flex;flex-direction:column;gap:10px;background:#f8fafc;">
                    <h3 style="margin:0;font-size:0.95rem;color:#334155;display:flex;align-items:center;gap:6px;"><i class="ph ph-chat-circle"></i> Comentários</h3>
                    <div style="display:flex;gap:6px;">
                        <input type="text" id="tc-novo-coment-${c.id}" placeholder="Escrever comentário..." style="flex:1;border:1px solid #cbd5e1;border-radius:6px;padding:8px 12px;font-size:0.85rem;outline:none;">
                        <button onclick="window._tcEnvCom(${c.id})" style="background:#7c3aed;color:#fff;border:none;border-radius:6px;padding:0 14px;cursor:pointer;font-weight:600;"><i class="ph ph-paper-plane-right"></i></button>
                    </div>
                </div>
                <div style="flex:1;overflow-y:auto;padding:16px;background:#fff;">
                    <div style="margin-bottom:24px;">
                        ${timelineHtml}
                    </div>
                </div>
            </div>
        </div>
    </div>`);
}

    
    window._tcChangeStatus = async function(id, novoStatus) {
        const c = _candidatos.find(x => x.id === id);
        if (!c || c.status === novoStatus) return;
        
        let dt = c.data_teste || null;
        if (novoStatus === "Teste 1º Dia" && !dt) {
            const res = await Swal.fire({ title:"Data do Teste", input:"date", showCancelButton:true, confirmButtonText:"Salvar" });
            if (!res.value) {
                window._tcDetalhes(id); // reset UI
                return;
            }
            dt = res.value;
        }

        try {
            const r = await fetch(API(`/api/candidatos-teste/${id}/status`), {
                method: "PUT",
                headers: authH(),
                body: JSON.stringify({ status: novoStatus, data_teste: dt })
            });
            if (!r.ok) throw new Error(await r.text());
            await _load();
            _render();
            window._tcDetalhes(id);
        } catch (e) {
            Swal.fire({ icon:"error", title:"Erro", text:e.message });
            window._tcDetalhes(id);
        }
    };

    window._tcUpdateDataTeste = async function(id, novaData) {
        try {
            const r = await fetch(API(`/api/candidatos-teste/${id}/data`), {
                method: "PUT",
                headers: authH(),
                body: JSON.stringify({ data_teste: novaData })
            });
            if (!r.ok) throw new Error(await r.text());
            await _load();
            _render();
            window._tcDetalhes(id);
            Swal.fire({ icon: "success", title: "Data atualizada!", showConfirmButton: false, timer: 1500 });
        } catch (e) {
            Swal.fire({ icon: "error", title: "Erro", text: e.message });
        }
    };

    window._tcUpDoc = async function(id, tipo) {
        const inp=document.getElementById(`tc-doc-${id}`);
        if(!inp||!inp.files||!inp.files[0]){ Swal.fire({icon:"warning",title:"Atenção",text:"Selecione um PDF."}); return; }
        const fd=new FormData(); fd.append("file",inp.files[0]); fd.append("doc_tipo",tipo);
        const r=await fetch(API(`/api/candidatos-teste/${id}/documento`),{method:"POST",headers:{Authorization:"Bearer "+token()},body:fd});
        const d=await r.json();
        if(!r.ok){ Swal.fire({icon:"error",title:"Erro",text:d.error}); return; }
        await _load(); _render(); window._tcDetalhes(id);
        Swal.fire({icon:"success",title:"Documento enviado!",showConfirmButton:false,timer:1500});
    };

    window._tcEnvCom = async function(id) {
        const ta=document.getElementById(`tc-novo-coment-${id}`);
        if(!ta||!ta.value.trim()){ Swal.fire({icon:"warning",title:"Atenção",text:"Comentário vazio."}); return; }
        const r=await fetch(API(`/api/candidatos-teste/${id}/comentario`),{method:"POST",headers:authH(),body:JSON.stringify({texto:ta.value.trim()})});
        const d=await r.json();
        if(!r.ok){ Swal.fire({icon:"error",title:"Erro",text:d.error}); return; }
        await _load(); _render(); window._tcDetalhes(id);
    };

    window._tcRemRota = async function(id) {
        const c=await Swal.fire({title:"Remover atribuição?",text:"O candidato será desvinculado da rota.",icon:"warning",showCancelButton:true,confirmButtonColor:"#ef4444",confirmButtonText:"Sim",cancelButtonText:"Cancelar"});
        if(!c.isConfirmed) return;
        const r=await fetch(API(`/api/candidatos-teste/${id}/atribuir-rota`),{method:"DELETE",headers:authH()});
        if(r.ok){ window._tcFecharModal(); await _load(); _render(); Swal.fire({icon:"success",title:"Removido!",showConfirmButton:false,timer:1200}); }
    };

    window._tcExcluir = async function(id, nome) {
        const c=await Swal.fire({title:`Excluir ${nome}?`,text:"Esta ação não pode ser desfeita.",icon:"warning",showCancelButton:true,confirmButtonColor:"#ef4444",confirmButtonText:"Sim",cancelButtonText:"Cancelar"});
        if(!c.isConfirmed) return;
        const r=await fetch(API(`/api/candidatos-teste/${id}`),{method:"DELETE",headers:authH()});
        if(r.ok){ window._tcFecharModal(); await _load(); _render(); Swal.fire({icon:"success",title:"Excluído!",showConfirmButton:false,timer:1200}); }
    };

    window._tcEditar = async function(id) {
        const cand=_candidatos.find(c=>c.id===id); if(!cand) return;
        window._tcModalFoto=null;
        _modal(`<div style="max-width:420px;width:100%;background:#fff;border-radius:16px;padding:24px;position:relative;">
            <button onclick="window._tcFecharModal()" style="position:absolute;top:10px;right:10px;background:none;border:none;font-size:1.2rem;cursor:pointer;color:#94a3b8;"><i class="ph ph-x"></i></button>
            <h3 style="margin:0 0 18px;color:#1e293b;font-size:1rem;">Editar Candidato</h3>
            <div style="margin-bottom:12px;"><label style="font-size:0.82rem;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Nome</label>
            <input id="tc-e-nome" type="text" value="${cand.nome.replace(/"/g,"&quot;")}" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.88rem;box-sizing:border-box;"></div>
            <div style="margin-bottom:12px;"><label style="font-size:0.82rem;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Tipo</label>
            <div style="display:flex;gap:10px;">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-e-tipo" value="Ajudante" ${cand.tipo==="Ajudante"?"checked":""}> Ajudante</label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-e-tipo" value="Motorista B" ${cand.tipo==="Motorista B"?"checked":""}> Motorista B</label><label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem;"><input type="radio" name="tc-e-tipo" value="Motorista D" ${cand.tipo==="Motorista D"?"checked":""}> Motorista D</label>
            </div></div>
            <div style="margin-bottom:16px;"><label style="font-size:0.82rem;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Foto <span style="font-weight:400;color:#94a3b8;">(ou Ctrl+V)</span></label>
            <div id="tc-e-fprev" style="width:70px;height:70px;border-radius:50%;background:#f1f5f9;border:2px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:1.8rem;cursor:pointer;overflow:hidden;margin-bottom:6px;" onclick="document.getElementById('tc-e-finput').click()">
                ${cand.foto_base64?`<img src="${cand.foto_base64}" style="width:100%;height:100%;object-fit:cover;">`:"<i class=\"ph ph-camera\"></i>"}
            </div>
            <input id="tc-e-finput" type="file" accept="image/*" style="display:none;" onchange="window._tcFoto(this,'tc-e-fprev')">
            <button onclick="document.getElementById('tc-e-finput').click()" style="font-size:0.78rem;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:4px 10px;cursor:pointer;color:#64748b;">Trocar foto</button></div>
            <div style="display:flex;gap:8px;justify-content:flex-end;">
                <button onclick="window._tcFecharModal()" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:0.83rem;color:#64748b;">Cancelar</button>
                <button onclick="window._tcSalvEdit(${id})" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border:none;border-radius:8px;padding:7px 18px;font-size:0.83rem;font-weight:600;cursor:pointer;">Salvar</button>
            </div>
        </div>`);
    };

    window._tcSalvEdit = async function(id) {
        const nome=(document.getElementById("tc-e-nome")||{}).value||"";
        const tipo=document.querySelector("input[name=\"tc-e-tipo\"]:checked");
        const body={nome:nome.trim(),tipo:tipo?tipo.value:undefined};
        if(window._tcModalFoto) body.foto_base64=window._tcModalFoto;
        const r=await fetch(API(`/api/candidatos-teste/${id}`),{method:"PUT",headers:authH(),body:JSON.stringify(body)});
        if(r.ok){ window._tcFecharModal(); await _load(); _render(); Swal.fire({icon:"success",title:"Salvo!",showConfirmButton:false,timer:1200}); }
    };

    function _modal(html) {
        let ov=document.getElementById("tc-modal-overlay");
        if(!ov){ ov=document.createElement("div"); ov.id="tc-modal-overlay"; document.body.appendChild(ov); }
        ov.style.cssText="display:flex;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9000;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;";
        ov.innerHTML=html;
        ov.addEventListener("click",e=>{ if(e.target===ov) window._tcFecharModal(); },{once:true});
    }

    window._tcFecharModal = function() {
        const ov=document.getElementById("tc-modal-overlay");
        if(ov) ov.style.display="none";
        window._tcModalFoto=null;
    };


    window._tcSetDTeste = async function(id, status) {
        const { value: dt } = await Swal.fire({
            title: "Data para " + status,
            html: '<input type="date" id="swal-dt" class="swal2-input">',
            confirmButtonColor: "#7c3aed",
            confirmButtonText: "Salvar",
            showCancelButton: true,
            cancelButtonText: "Cancelar",
            preConfirm: () => document.getElementById("swal-dt").value
        });
        if (!dt) return;
        try {
            const r = await fetch(API('/api/candidatos-teste/' + id + '/data'), { method:"PUT", headers:authH(), body:JSON.stringify({etapa:status,data_teste:dt}) });
            const data = await r.json();
            if (!r.ok) { Swal.fire({icon:"error",title:"Erro",text:data.error}); return; }
            await _load(); _render(); window._tcDetalhes(id);
        } catch(e) { Swal.fire({icon:"error",title:"Erro",text:e.message}); }
    };

})();