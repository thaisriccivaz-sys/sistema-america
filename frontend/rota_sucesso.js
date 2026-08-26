// frontend/rota_sucesso.js - v5
(function () {
    "use strict";

    const API = (window.API_URL || "").replace(/\/api\/?$/, "");
    function headers() {
        const t = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
        return { "Authorization": "Bearer " + t, "Content-Type": "application/json" };
    }

    function truncate(str, max) {
        str = str || "";
        return str.length > max ? str.substring(0, max) + "\u2026" : str;
    }

    function avatarHtml(url, nome) {
        const ini = (nome || "?").split(" ").filter(Boolean).slice(0, 2).map(function(p){ return p[0]; }).join("").toUpperCase();
        return "<div style=\"width:38px;height:38px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid #1d4ed8;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-weight:700;color:#1d4ed8;font-size:0.85rem;\">" +
            "<img src=\"" + url + "\" style=\"width:100%;height:100%;object-fit:cover;\" onerror=\"this.parentElement.innerHTML='" + ini + "'\" alt=\"\">" +
            "</div>";
    }

    function badgeMeses(meses, ok) {
        const s = ok ? "background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;" : "background:#fef2f2;color:#dc2626;border:1px solid #fecaca;";
        return "<span style=\"" + s + "padding:2px 7px;border-radius:12px;font-size:0.72rem;font-weight:600;white-space:nowrap;\">" + meses + "m</span>";
    }

    function badgeBool(val) {
        if (val) return "<span style=\"background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:2px 7px;border-radius:12px;font-size:0.72rem;font-weight:600;\">\u26a0 Sim</span>";
        return "<span style=\"background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;padding:2px 7px;border-radius:12px;font-size:0.72rem;font-weight:600;\">\u2713 OK</span>";
    }

    function aptoBadge(apto) {
        if (apto) return "<span style=\"display:inline-flex;align-items:center;gap:3px;background:#dbeafe;color:#1d4ed8;border:1px solid #1d4ed8;padding:3px 9px;border-radius:12px;font-size:0.78rem;font-weight:700;white-space:nowrap;\">\u2705 Apto</span>";
        return "<span style=\"display:inline-flex;align-items:center;gap:3px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:3px 9px;border-radius:12px;font-size:0.78rem;font-weight:700;white-space:nowrap;\">\u274c Inapto</span>";
    }

    const TIPO_ICONS = {
        "hab_b":      { label: "Hab. B",  short: "\uD83D\uDE97 Hab.B"  },
        "motorista1": { label: "Mot. I",  short: "\uD83D\uDE9A Mot.I"  },
        "hab_d":      { label: "Hab. D",  short: "\uD83D\uDE9B Hab.D"  },
        "motorista2": { label: "Mot. II", short: "\uD83D\uDE9B Mot.II" }
    };

    const TIPOS_AJUDANTES  = ["hab_b", "motorista1"];
    const TIPOS_MOTORISTAS = ["hab_d", "motorista2"];

    async function copiarLink(colaborador_id, tipo, btnEl) {
        try {
            btnEl.disabled = true;
            const resp = await fetch(API + "/api/rota-sucesso/gerar-token", {
                method: "POST", headers: headers(),
                body: JSON.stringify({ colaborador_id: colaborador_id, tipo: tipo })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || "Erro");
            await navigator.clipboard.writeText(data.url);
            btnEl.innerHTML = "\u2705";
            btnEl.style.background = "#dbeafe";
            btnEl.style.color = "#1d4ed8";
            btnEl.style.borderColor = "#1d4ed8";
            setTimeout(function() {
                btnEl.innerHTML = "\uD83D\uDCCB";
                btnEl.style.background = "";
                btnEl.style.color = "";
                btnEl.style.borderColor = "";
                btnEl.disabled = false;
            }, 2500);
            // Mostrar botao olho se respondido
            const verBtn = document.getElementById("ver-" + colaborador_id + "-" + tipo);
            if (verBtn && data.id) {
                verBtn.setAttribute("data-id", data.id);
                if (data.status === "respondido") {
                    verBtn.style.display = "flex";
                }
            }
        } catch (e) {
            btnEl.disabled = false;
            alert("Erro: " + e.message);
        }
    }

    function verRespostas(idResposta) {
        if (!idResposta || idResposta === "undefined" || idResposta === "null") {
            alert("ID da resposta invalido."); return;
        }
        window.open(API + "/api/rota-sucesso/respostas/ver/" + idResposta + "/pdf", "_blank");
    }

    function renderTabela(colabs, containerId, tiposColuna) {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (!colabs || colabs.length === 0) {
            container.innerHTML = "<div style=\"text-align:center;padding:48px;color:#94a3b8;\"><div style=\"font-size:2.5rem;margin-bottom:12px;\">\uD83D\uDC64</div><p>Nenhum colaborador encontrado.</p></div>";
            return;
        }

        const tipoHeaders = tiposColuna.map(function(t) {
            const ti = TIPO_ICONS[t] || {};
            return "<th style=\"padding:8px 6px;text-align:center;font-size:0.68rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;min-width:82px;background:#f8fafc;\">" + (ti.short || t) + "</th>";
        }).join("");

        const rows = colabs.map(function(c) {
            const formsByTipo = {};
            (c.formularios || []).forEach(function(f) { formsByTipo[f.tipo] = f; });

            const tipoCells = tiposColuna.map(function(tipo) {
                const f = formsByTipo[tipo];
                if (!f) {
                    return "<td style=\"padding:8px 6px;text-align:center;\"><span style=\"color:#d1d5db;\">&mdash;</span></td>";
                }
                const idResp = f.id_resposta;
                const respondido = f.respondido && idResp;
                const verDisplay = respondido ? "flex" : "none";
                return "<td style=\"padding:8px 6px;text-align:center;\">" +
                    "<div style=\"display:flex;flex-direction:row;align-items:center;justify-content:center;gap:4px;\">" +
                    "<button onclick=\"window._rrsCopiarLink(" + c.id + ",'" + tipo + "',this)\" title=\"Copiar link\" " +
                    "style=\"width:30px;height:30px;border-radius:7px;border:1.5px solid #1d4ed8;background:#f0f4ff;color:#1d4ed8;font-size:0.9rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;\">\uD83D\uDCCB</button>" +
                    "<button id=\"ver-" + c.id + "-" + tipo + "\" onclick=\"window._rrsVerRespostas(this.getAttribute('data-id'))\" data-id=\"" + idResp + "\" title=\"Ver respostas\" " +
                    "style=\"width:30px;height:30px;border-radius:7px;border:1.5px solid #7c3aed;background:#faf5ff;color:#7c3aed;font-size:0.9rem;cursor:pointer;display:" + verDisplay + ";align-items:center;justify-content:center;flex-shrink:0;\">\uD83D\uDC41</button>" +
                    "</div></td>";
            }).join("");

            const nomeDisplay = truncate(c.nome_completo, 20);
            const nomeTitle = c.nome_completo && c.nome_completo.length > 20 ? " title=\"" + c.nome_completo + "\"" : "";

            return "<tr style=\"border-bottom:1px solid #f1f5f9;\" onmouseover=\"this.style.background='#f8fafc'\" onmouseout=\"this.style.background=''\">" +
                "<td style=\"padding:8px 12px;\">" +
                    "<div style=\"display:flex;align-items:center;gap:8px;\">" +
                        avatarHtml(c.foto_url, c.nome_completo) +
                        "<div>" +
                            "<div" + nomeTitle + " style=\"font-weight:700;color:#1e293b;font-size:0.84rem;max-width:145px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;\">" + nomeDisplay + "</div>" +
                            "<div style=\"font-size:0.69rem;color:#64748b;max-width:145px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;\">" + truncate(c.cargo || c.departamento || "-", 22) + "</div>" +
                        "</div>" +
                    "</div>" +
                "</td>" +
                "<td style=\"padding:8px 6px;text-align:center;font-size:0.82rem;font-weight:600;color:#475569;\">" + (c.cnh_categoria || "\u2014") + "</td>" +
                "<td style=\"padding:8px 6px;text-align:center;\">" + badgeMeses(c.mesesEmpresa, c.tempoOk) + "</td>" +
                "<td style=\"padding:8px 6px;text-align:center;\">" + badgeBool(c.temAdvEscrita) + "</td>" +
                "<td style=\"padding:8px 6px;text-align:center;\">" + badgeBool(c.temSuspensao) + "</td>" +
                "<td style=\"padding:8px 6px;text-align:center;\">" + badgeBool(c.temFaltaSemAtestado) + "</td>" +
                "<td style=\"padding:8px 6px;text-align:center;\">" + aptoBadge(c.apto) + "</td>" +
                tipoCells +
                "</tr>";
        }).join("");

        const colWidths = tiposColuna.map(function() { return "<col style=\"width:82px;\">"; }).join("");

        container.innerHTML = "<div style=\"overflow-x:auto;overflow-y:auto;max-height:calc(100vh - 260px);\">" +
            "<table style=\"width:100%;border-collapse:collapse;font-family:inherit;table-layout:fixed;\">" +
            "<colgroup><col style=\"width:185px;\"><col style=\"width:48px;\"><col style=\"width:56px;\"><col style=\"width:52px;\"><col style=\"width:52px;\"><col style=\"width:52px;\"><col style=\"width:78px;\">" + colWidths + "</colgroup>" +
            "<thead style=\"position:sticky;top:0;z-index:5;\"><tr style=\"background:#f8fafc;box-shadow:0 1px 3px rgba(0,0,0,0.08);\">" +
                "<th style=\"padding:10px 12px;text-align:left;font-size:0.68rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;background:#f8fafc;\">Colaborador</th>" +
                "<th style=\"padding:10px 6px;text-align:center;font-size:0.68rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;background:#f8fafc;\">CNH</th>" +
                "<th style=\"padding:10px 6px;text-align:center;font-size:0.68rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;background:#f8fafc;\">Tempo</th>" +
                "<th style=\"padding:10px 6px;text-align:center;font-size:0.68rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;background:#f8fafc;\">Adv.</th>" +
                "<th style=\"padding:10px 6px;text-align:center;font-size:0.68rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;background:#f8fafc;\">Susp.</th>" +
                "<th style=\"padding:10px 6px;text-align:center;font-size:0.68rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;background:#f8fafc;\">Falta</th>" +
                "<th style=\"padding:10px 6px;text-align:center;font-size:0.68rem;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;background:#f8fafc;\">Status</th>" +
                tipoHeaders +
            "</tr></thead>" +
            "<tbody>" + rows + "</tbody></table></div>";
    }

    async function initView(tipo, tableId, searchId, tiposColuna, aptosCheckId) {
        const tableEl = document.getElementById(tableId);
        if (tableEl) tableEl.innerHTML = "<div style=\"text-align:center;padding:40px;color:#94a3b8;\"><p>\u23f3 Carregando...</p></div>";

        let allData = [];
        try {
            const resp = await fetch(API + "/api/rota-sucesso/elegibilidade?tipo=" + tipo, { headers: headers() });
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            allData = await resp.json();
        } catch (e) {
            if (tableEl) tableEl.innerHTML = "<div style=\"text-align:center;padding:40px;color:#dc2626;\"><p>Erro ao carregar: " + e.message + "</p></div>";
            return;
        }

        function filtrar() {
            const q = (document.getElementById(searchId) ? document.getElementById(searchId).value : "").toLowerCase();
            const aptosEl = document.getElementById(aptosCheckId);
            const somenteAptos = aptosEl ? aptosEl.checked : false;
            let filtrado = allData;
            if (q) filtrado = filtrado.filter(function(c) { return c.nome_completo.toLowerCase().includes(q) || (c.cargo || "").toLowerCase().includes(q); });
            if (somenteAptos) filtrado = filtrado.filter(function(c) { return c.apto; });
            renderTabela(filtrado, tableId, tiposColuna);
        }

        const searchEl = document.getElementById(searchId);
        if (searchEl) searchEl.addEventListener("input", filtrar);
        const aptosEl = document.getElementById(aptosCheckId);
        if (aptosEl) aptosEl.addEventListener("change", filtrar);

        renderTabela(allData, tableId, tiposColuna);
    }

    window._rrsCopiarLink   = copiarLink;
    window._rrsVerRespostas = verRespostas;
    window.initRotaSucessoAjudantes  = function () { initView("ajudantes",  "rrs-table-ajudantes",  "rrs-search-ajudantes",  TIPOS_AJUDANTES,  "rota-sucesso-ajudantes-aptos");  };
    window.initRotaSucessoMotoristas = function () { initView("motoristas", "rrs-table-motoristas", "rrs-search-motoristas", TIPOS_MOTORISTAS, "rota-sucesso-motoristas-aptos"); };

})();