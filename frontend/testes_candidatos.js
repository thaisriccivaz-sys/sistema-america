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
                    <div style="font-size:0.8rem;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.nome}</div>
                    <span style="font-size:0.68rem;font-weight:700;color:${ct};background:${ct}18;border-radius:99px;padding:1px 6px;">${c.tipo === "Ajudante" ? "🪣 Ajudante" : (c.tipo === "Motorista B" ? "🛻 Motorista B" : (c.tipo === "Motorista D" ? "🚚 Motorista D" : "🚚 Motorista"))}</span>
                </div>
            </div>
            ${c.data_teste ? `<div style="font-size:0.7rem;color:#64748b;"><i class="ph ph-calendar"></i> ${fmtBR(c.data_teste)}</div>` : ""}
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
        let data_teste = cand.data_teste || null;
        if (novoStatus === "Teste 1\u00ba Dia") {
            if (!cand.doc_url && !cand.doc_filename) { Swal.fire({icon: "warning", title: "Atenção", text: "É obrigatório anexar um documento antes de mover para o Teste."}); return; }
            if (!cand.data_teste_1) { Swal.fire({icon: "warning", title: "Atenção", text: "Preencha a data do 1º Dia nos detalhes antes de mover para esta coluna."}); return; }
            data_teste = cand.data_teste_1;
        } else if (novoStatus === "Teste 2\u00ba Dia") {
            if (!cand.doc_url && !cand.doc_filename) { Swal.fire({icon: "warning", title: "Atenção", text: "É obrigatório anexar um documento antes de mover para o Teste."}); return; }
            if (!cand.data_teste_2) { Swal.fire({icon: "warning", title: "Atenção", text: "Preencha a data do 2º Dia nos detalhes antes de mover para esta coluna."}); return; }
            data_teste = cand.data_teste_2;
        } else if (novoStatus === "Teste Extra") {
            if (!cand.doc_url && !cand.doc_filename) { Swal.fire({icon: "warning", title: "Atenção", text: "É obrigatório anexar um documento antes de mover para o Teste."}); return; }
            if (!cand.data_teste_extra) { Swal.fire({icon: "warning", title: "Atenção", text: "Preencha a data do Teste Extra nos detalhes antes de mover para esta coluna."}); return; }
            data_teste = cand.data_teste_extra;
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