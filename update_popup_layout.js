const fs = require('fs');
let path = 'backend/server.js';
let content = fs.readFileSync(path, 'utf8');

// 1. ADD ALTER TABLE
const regexCreateTable = /CREATE TABLE IF NOT EXISTS comercial_notificacoes \([\s\S]*?\);/m;
const replacementCreateTable = `CREATE TABLE IF NOT EXISTS comercial_notificacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER,
            mensagem TEXT,
            tipo TEXT,
            dados TEXT,
            lida INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        db.run("ALTER TABLE comercial_notificacoes ADD COLUMN dados TEXT", () => {});`;
content = content.replace(regexCreateTable, replacementCreateTable);

// 2. UPDATE INSERT ENVIADO
const regexInsertEnviado = /db\.run\("INSERT INTO comercial_notificacoes \(usuario_id, mensagem, tipo\) VALUES \(\?, \?, 'credenciamento_enviado'\)", \[cred\.solicitado_por_id, `A Log(.*?)stica enviou o credenciamento da OS \$\{cred\.os\} para o cliente \$\{cred\.cliente_nome\}\.`\]\);/g;
const replacementInsertEnviado = `db.run("INSERT INTO comercial_notificacoes (usuario_id, mensagem, tipo, dados) VALUES (?, ?, 'credenciamento_enviado', ?)", [cred.solicitado_por_id, \`A Logística enviou o credenciamento da OS \${cred.os} para o cliente \${cred.cliente_nome}.\`, JSON.stringify({ cliente_nome: cred.cliente_nome, remetente: req.user ? req.user.nome_completo : 'Logística' })]);`;
content = content.replace(regexInsertEnviado, replacementInsertEnviado);

// 3. UPDATE INSERT ACESSADO
const regexInsertAcessado = /db\.run\("INSERT INTO comercial_notificacoes \(usuario_id, mensagem, tipo\) VALUES \(\?, \?, 'credenciamento_acessado'\)", \[cred\.solicitado_por_id, `O cliente \$\{cred\.cliente_nome\} acessou o link do credenciamento da OS \$\{cred\.os \|\| '-'\}\.`\]\);/g;
const replacementInsertAcessado = `db.run("INSERT INTO comercial_notificacoes (usuario_id, mensagem, tipo, dados) VALUES (?, ?, 'credenciamento_acessado', ?)", [cred.solicitado_por_id, \`O cliente \${cred.cliente_nome} acessou o link do credenciamento da OS \${cred.os || '-'}.\`, JSON.stringify({ cliente_nome: cred.cliente_nome, remetente: 'Cliente' })]);`;
content = content.replace(regexInsertAcessado, replacementInsertAcessado);

fs.writeFileSync(path, content, 'utf8');

// NOW UPDATE FRONTEND
path = 'frontend/app.js';
content = fs.readFileSync(path, 'utf8');

const regexPopup = /popup\.innerHTML = `[\s\S]*?<\/div>\s*`;/m;
const replacementPopup = `let dados = {};
                try { dados = JSON.parse(notif.dados || '{}'); } catch(e) {}
                const remetente = dados.remetente || 'Logística';
                const clienteNome = dados.cliente_nome || 'Cliente não informado';

                popup.innerHTML = \`
                    <div style="display:flex;align-items:flex-start;gap:1rem;">
                        <div style="width:44px;height:44px;border-radius:12px;background:#dcfce7;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.4rem;color:#16a34a;">
                            <i class="ph \${icon}"></i>
                        </div>
                        <div style="flex:1;">
                            <div style="font-weight:700;font-size:0.9rem;color:#0f172a;margin-bottom:4px;">
                                <i class="ph ph-bell-ringing" style="color:#16a34a;"></i> \${titulo}
                            </div>
                            <div style="color:#16a34a;font-weight:600;font-size:0.95rem;margin-bottom:4px;">\${clienteNome}</div>
                            <div style="color:#64748b;font-size:0.8rem;">
                                \${notif.tipo === 'credenciamento_enviado' ? \`Enviado por: <strong>\${remetente}</strong>\` : \`O cliente acessou o link gerado.\`}
                            </div>
                            <div style="display:flex;gap:8px;margin-top:12px;">
                                <button onclick="window.markComNotifLida('\${notif.id}'); navigateTo('comercial-credenciamento'); this.closest('[data-notif-id]').remove();" 
                                    style="flex:1;padding:6px 12px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.8rem;">
                                    Ver Credenciamento
                                </button>
                                <button onclick="window.markComNotifLida('\${notif.id}'); this.closest('[data-notif-id]').remove();" 
                                    style="padding:6px 12px;background:#f1f5f9;color:#334155;border:none;border-radius:8px;cursor:pointer;font-size:0.8rem;">
                                    X 
                                </button>
                            </div>
                        </div>
                    </div>
                \`;`;
                
content = content.replace(regexPopup, replacementPopup);
fs.writeFileSync(path, content, 'utf8');

// Also bust cache again
path = 'frontend/index.html';
content = fs.readFileSync(path, 'utf8');
content = content.replace(/app\.js\?v=\d+/g, 'app.js?v=133');
fs.writeFileSync(path, content, 'utf8');

console.log("Updated both files");