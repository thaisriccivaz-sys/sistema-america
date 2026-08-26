// backend/rota_sucesso_routes.js
// Módulo de rotas para o programa "Rota de Sucesso"

const { randomUUID } = require("crypto");
const path = require("path");

module.exports = function (app, db, authenticateToken, sendEmailParaNotificados) {

    // MIGRATION
    db.run(`CREATE TABLE IF NOT EXISTS rota_sucesso_respostas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        colaborador_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        status TEXT DEFAULT "aguardando",
        respostas_json TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        respondido_em DATETIME,
        FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)
    )`, (err) => {
        if (err) console.error("[RotaSucesso] Erro ao criar tabela:", err.message);
        else console.log("[RotaSucesso] Tabela rota_sucesso_respostas OK");
    });

    function calcularElegibilidade(colab, docs, faltas) {
        const agora = new Date();
        const admissao = colab.data_admissao ? new Date(colab.data_admissao) : null;
        let mesesEmpresa = 0;
        if (admissao) {
            mesesEmpresa = Math.floor((agora - admissao) / (1000 * 60 * 60 * 24 * 30.44));
        }
        const tempoOk = mesesEmpresa >= 6;
        const seisAtras = new Date(agora);
        seisAtras.setMonth(seisAtras.getMonth() - 6);

        const temAdvEscrita = docs.some(d => {
            if (!d.upload_date) return false;
            if (new Date(d.upload_date) < seisAtras) return false;
            const tipo = (d.document_type || "").toLowerCase();
            const tab = (d.tab_name || "").toLowerCase();
            return tab.includes("advert") && tipo.includes("escrita");
        });

        const temSuspensao = docs.some(d => {
            if (!d.upload_date) return false;
            if (new Date(d.upload_date) < seisAtras) return false;
            const tipo = (d.document_type || "").toLowerCase();
            const tab = (d.tab_name || "").toLowerCase();
            return (tab.includes("advert") || tab.includes("suspens")) &&
                (tipo.includes("suspens") || tipo.includes("suspensao") || tipo.includes("suspensão")) &&
                (tipo.includes("1 dia") || tipo.includes("2 dia") || tipo.includes("3 dia") ||
                 tipo.includes("1dia") || tipo.includes("2dia") || tipo.includes("3dia"));
        });

        const temFaltaSemAtestado = faltas.length > 0;
        const baseOk = tempoOk && !temAdvEscrita && !temSuspensao && !temFaltaSemAtestado;

        const cargo = (colab.cargo || "").toLowerCase();
        const dept  = (colab.departamento || "").toLowerCase();
        const isAjudante  = cargo.includes("ajudante") || dept.includes("ajudante");
        const isMotorista = cargo.includes("motorista") || dept.includes("motorista");
        const cnh = (colab.cnh_categoria || "").toUpperCase().trim();

        const formularios = [];
        if (isAjudante) {
            formularios.push({ tipo: "hab_b",     label: "Habilitação B",          apto: baseOk });
            formularios.push({ tipo: "motorista1", label: "Motorista I",            apto: baseOk });
        }
        if (isMotorista) {
            const cnhB = cnh === "B" || cnh === "AB" || cnh === "A/B" || cnh === "A+B";
            const cnhD = cnh.includes("D") || cnh.includes("E");
            if (cnhB) formularios.push({ tipo: "hab_d",     label: "Habilitação D (B→D)", apto: baseOk });
            if (cnhD) formularios.push({ tipo: "motorista2", label: "Motorista II",        apto: baseOk });
            // Motorista sem CNH mapeada: mostrar todos
            if (!cnhB && !cnhD && cnh === "") {
                formularios.push({ tipo: "hab_d",     label: "Habilitação D",  apto: baseOk });
                formularios.push({ tipo: "motorista2", label: "Motorista II", apto: baseOk });
            }
        }

        return { mesesEmpresa, tempoOk, temAdvEscrita, temSuspensao, temFaltaSemAtestado,
            apto: baseOk && formularios.length > 0, formularios };
    }

    // GET elegibilidade
    app.get("/api/rota-sucesso/elegibilidade", authenticateToken, (req, res) => {
        const filtro = req.query.tipo || "todos";
        let extra = "";
        if (filtro === "ajudantes") {
            extra = " AND (LOWER(c.cargo) LIKE '%ajudante%' OR LOWER(c.departamento) LIKE '%ajudante%')";
        } else if (filtro === "motoristas") {
            extra = " AND (LOWER(c.cargo) LIKE '%motorista%' OR LOWER(c.departamento) LIKE '%motorista%')";
        } else {
            extra = " AND (LOWER(c.cargo) LIKE '%ajudante%' OR LOWER(c.departamento) LIKE '%ajudante%' OR LOWER(c.cargo) LIKE '%motorista%' OR LOWER(c.departamento) LIKE '%motorista%')";
        }

        db.all(`SELECT c.id, c.nome_completo, c.cargo, c.departamento, c.cnh_categoria,
            c.data_admissao, c.foto_path, c.status
            FROM colaboradores c
            WHERE c.status NOT LIKE '%esligado%' AND c.status NOT LIKE '%niciado%'${extra}
            ORDER BY c.nome_completo ASC`, [], (err, colabs) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!colabs || colabs.length === 0) return res.json([]);

            const ids = colabs.map(c => c.id);
            const ph = ids.map(() => "?").join(",");

            db.all(`SELECT colaborador_id, tab_name, document_type, upload_date FROM documentos
                WHERE colaborador_id IN (${ph})
                AND (LOWER(tab_name) LIKE '%advert%' OR LOWER(tab_name) LIKE '%suspens%')`, ids, (errD, docs) => {
                if (errD) docs = [];

                db.all(`SELECT colaborador_id FROM faltas WHERE colaborador_id IN (${ph})`, ids, (errF, faltasRows) => {
                    if (errF) faltasRows = [];

                    db.all(`SELECT id, colaborador_id, tipo, token, status FROM rota_sucesso_respostas WHERE colaborador_id IN (${ph})`, ids, (errT, tokens) => {
                        if (errT) tokens = [];

                        const result = colabs.map(colab => {
                            const eleg = calcularElegibilidade(
                                colab,
                                docs.filter(d => d.colaborador_id === colab.id),
                                faltasRows.filter(f => f.colaborador_id === colab.id)
                            );
                            const colabTokens = tokens.filter(t => t.colaborador_id === colab.id);
                            eleg.formularios = eleg.formularios.map(f => {
                                const ex = colabTokens.find(t => t.tipo === f.tipo);
                                return { ...f, token: ex ? ex.token : null, respondido: ex ? ex.status === "respondido" : false, id_resposta: ex ? ex.id : null };
                            });
                            return { ...colab, foto_url: `/api/colaboradores/foto/${colab.id}`, ...eleg };
                        });
                        res.json(result);
                    });
                });
            });
        });
    });

    // POST gerar-token
    app.post("/api/rota-sucesso/gerar-token", authenticateToken, (req, res) => {
        const { colaborador_id, tipo } = req.body;
        if (!colaborador_id || !tipo) return res.status(400).json({ error: "colaborador_id e tipo obrigatórios" });

        db.get(`SELECT id, token, status FROM rota_sucesso_respostas WHERE colaborador_id = ? AND tipo = ?`, [colaborador_id, tipo], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            const base = process.env.RENDER_EXTERNAL_URL || "https://sistema.america.onrender.com";
            if (row) return res.json({ token: row.token, url: `${base}/rota-sucesso/formulario/${row.token}`, status: row.status, id: row.id });
            const token = randomUUID();
            db.run(`INSERT INTO rota_sucesso_respostas (colaborador_id, tipo, token) VALUES (?, ?, ?)`, [colaborador_id, tipo, token], function(errI) {
                if (errI) return res.status(500).json({ error: errI.message });
                res.json({ token, url: `${base}/rota-sucesso/formulario/${token}`, status: "aguardando", id: this.lastID });
            });
        });
    });

    // GET formulário público - SEM AUTH
    app.get("/api/rota-sucesso/formulario/:token", (req, res) => {
        db.get(`SELECT r.*, c.nome_completo, c.cargo, c.departamento, c.cnh_categoria
            FROM rota_sucesso_respostas r JOIN colaboradores c ON c.id = r.colaborador_id
            WHERE r.token = ?`, [req.params.token], (err, row) => {
            if (err || !row) return res.status(404).json({ error: "Formulário não encontrado" });
            res.json({ tipo: row.tipo, status: row.status, colaborador: { nome: row.nome_completo, cargo: row.cargo, departamento: row.departamento, cnh_categoria: row.cnh_categoria } });
        });
    });

    // POST submissão - SEM AUTH
    app.post("/api/rota-sucesso/formulario/:token", (req, res) => {
        const { respostas } = req.body;
        if (!respostas) return res.status(400).json({ error: "Respostas obrigatórias" });
        db.get(`SELECT r.*, c.nome_completo, c.cargo, c.email, c.email_corporativo FROM rota_sucesso_respostas r JOIN colaboradores c ON c.id = r.colaborador_id WHERE r.token = ?`, [req.params.token], (err, row) => {
            if (err || !row) return res.status(404).json({ error: "Não encontrado" });
            if (row.status === "respondido") return res.status(400).json({ error: "Já respondido" });
            const now = new Date().toISOString();
            db.run(`UPDATE rota_sucesso_respostas SET status='respondido', respostas_json=?, respondido_em=? WHERE token=?`, [JSON.stringify(respostas), now, req.params.token], (errU) => {
                if (errU) return res.status(500).json({ error: errU.message });
                const labels = { hab_b: "Habilitação B", motorista1: "Motorista I", hab_d: "Habilitação D (B→D)", motorista2: "Motorista II" };
                const tipoLabel = labels[row.tipo] || row.tipo;
                const msg = `📋 Formulário "${tipoLabel}" preenchido por ${row.nome_completo}`;
                const dados = JSON.stringify({ id: row.id, colaborador_id: row.colaborador_id, nome: row.nome_completo, tipo: row.tipo, cargo: row.cargo || '' });

                // Popup + email para usuários configurados
                db.all(`SELECT usuario_id FROM config_notificacoes WHERE tipo='rota_sucesso_formulario'`, [], (errN, rowsN) => {
                    if (!errN && rowsN) {
                        rowsN.forEach(r => db.run(`INSERT INTO notificacoes_usuarios (usuario_id, tipo, mensagem, dados) VALUES (?,?,?,?)`, [r.usuario_id, "rota_sucesso_formulario", msg, dados]));
                    }
                });

                // Enviar e-mail de notificação
                if (typeof sendEmailParaNotificados === 'function') {
                    const respostasObj = respostas || {};
                    const qaHtml = Object.entries(respostasObj).map(([p, r]) =>
                        `<div style="margin-bottom:12px;padding:10px 14px;border-radius:8px;border-left:3px solid #15803d;background:#f8fafc;">
                            <div style="font-size:0.82rem;font-weight:700;color:#374151;margin-bottom:4px;">${p}</div>
                            <div style="font-size:0.9rem;color:#1e293b;">${r || '—'}</div>
                        </div>`).join('');

                    sendEmailParaNotificados('rota_sucesso_formulario', {
                        subject: `🚀 Rota de Sucesso — Formulário preenchido por ${row.nome_completo}`,
                        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                            <div style="background:linear-gradient(135deg,#15803d,#166534);padding:24px;color:white;border-radius:12px 12px 0 0;">
                                <div style="font-size:1.2rem;font-weight:700;">🚀 Programa Rota de Sucesso</div>
                                <div style="opacity:.8;font-size:.85rem;">Novo formulário preenchido</div>
                            </div>
                            <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
                                <div style="font-size:1rem;font-weight:700;margin-bottom:4px;color:#1e293b;">${row.nome_completo}</div>
                                <div style="font-size:.85rem;color:#64748b;margin-bottom:16px;">${row.cargo || ''} — ${tipoLabel}</div>
                                <div style="font-size:.8rem;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;border-bottom:2px solid #dcfce7;padding-bottom:6px;">Respostas</div>
                                ${qaHtml || '<p style="color:#94a3b8;">Sem respostas registradas.</p>'}
                                <p style="font-size:.75rem;color:#94a3b8;margin-top:20px;text-align:center;">Este é um e-mail automático do Sistema América Rental.</p>
                            </div>
                        </div>`
                    }).catch(e => console.error('[RotaSucesso] Erro ao enviar e-mail:', e.message));
                }

                res.json({ success: true });
            });
        });
    });

    // GET respostas por colaborador
    app.get("/api/rota-sucesso/respostas/:colaborador_id", authenticateToken, (req, res) => {
        db.all(`SELECT * FROM rota_sucesso_respostas WHERE colaborador_id=? ORDER BY criado_em DESC`, [req.params.colaborador_id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows || []);
        });
    });

    // GET PDF/impressão de resposta
    app.get("/api/rota-sucesso/respostas/ver/:id/pdf", authenticateToken, (req, res) => {
        db.get(`SELECT r.*, c.nome_completo, c.cargo, c.departamento FROM rota_sucesso_respostas r JOIN colaboradores c ON c.id=r.colaborador_id WHERE r.id=?`, [req.params.id], (err, row) => {
            if (err || !row) return res.status(404).json({ error: "Não encontrado" });
            if (!row.respostas_json) return res.status(400).json({ error: "Sem respostas" });
            let respostas = {};
            try { respostas = JSON.parse(row.respostas_json); } catch(e) {}
            const labels = { hab_b: "Solicitação de Habilitação B", motorista1: "Solicitação para Motorista I", hab_d: "Solicitação de Mudança de Categoria (B → D)", motorista2: "Solicitação para Motorista II" };
            const tipoLabel = labels[row.tipo] || row.tipo;
            const dataResp = row.respondido_em ? new Date(row.respondido_em).toLocaleDateString("pt-BR") : "-";
            const qaHtml = Object.entries(respostas).map(([p, r]) =>
                `<div style="margin-bottom:16px;padding:14px 18px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;">
                    <div style="font-size:0.85rem;font-weight:700;color:#334155;margin-bottom:8px;">${p}</div>
                    <div style="font-size:0.95rem;color:#1e293b;background:#f8fafc;border-radius:6px;padding:10px 14px;border-left:3px solid #15803d;">${r || "-"}</div>
                </div>`).join("");
            const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${tipoLabel} — ${row.nome_completo}</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;color:#1e293b;background:#fff;}
.hdr{background:linear-gradient(135deg,#15803d,#166534);color:white;padding:24px 32px;display:flex;align-items:center;justify-content:space-between;}
.logo{display:flex;align-items:center;gap:14px;}.circle{width:52px;height:52px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:900;}
.co{font-size:1.2rem;font-weight:700;}.co-sub{font-size:.75rem;opacity:.8;}.badge{background:rgba(255,255,255,.2);border-radius:20px;padding:4px 14px;font-size:.8rem;}
.body{padding:32px;}.card{background:#f8fafc;border-radius:12px;padding:20px 24px;margin-bottom:24px;border:1px solid #e2e8f0;}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;}.lbl{font-size:.7rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:700;display:block;margin-bottom:3px;}
.val{font-size:.95rem;font-weight:600;}.sec{font-size:.75rem;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.1em;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #dcfce7;}
.ftr{margin-top:32px;padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:.72rem;color:#94a3b8;}
@media print{@page{margin:1cm}}</style></head><body>
<div class="hdr"><div class="logo"><div class="circle">A</div><div><div class="co">América Rental</div><div class="co-sub">Equipamentos Ltda.</div></div></div>
<div style="text-align:right"><div style="font-size:1rem;font-weight:700;">${tipoLabel}</div><span class="badge">🚀 Programa Rota de Sucesso</span></div></div>
<div class="body"><div class="card"><div class="sec">Dados do Colaborador</div><div class="grid">
<div><span class="lbl">Nome</span><span class="val">${row.nome_completo}</span></div>
<div><span class="lbl">Cargo</span><span class="val">${row.cargo || "-"}</span></div>
<div><span class="lbl">Formulário</span><span class="val">${tipoLabel}</span></div>
<div><span class="lbl">Data da Resposta</span><span class="val">${dataResp}</span></div>
</div></div>
<div class="sec">Respostas do Formulário</div>${qaHtml || "<p style='color:#94a3b8;'>Nenhuma resposta.</p>"}</div>
<div class="ftr"><span>América Rental Equipamentos — Rota de Sucesso</span><span>Gerado em ${new Date().toLocaleDateString("pt-BR")}</span></div>
<script>window.onload=()=>window.print();</script></body></html>`;
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.send(html);
        });
    });

    // Serve página pública do formulário
    app.get("/rota-sucesso/formulario/:token", (req, res) => {
        res.sendFile(path.join(__dirname, "../frontend/rota_sucesso_form.html"));
    });

    console.log("[RotaSucesso] Rotas registradas com sucesso");
};
