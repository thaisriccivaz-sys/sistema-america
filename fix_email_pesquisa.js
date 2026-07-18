const fs = require('fs');

// ─────────────────────────────────────────────────────────────────────────────
// Fix 1: Add pesquisa_respondida_em and pesquisa_token columns to database.js
// ─────────────────────────────────────────────────────────────────────────────
let dbCode = fs.readFileSync('backend/database.js', 'utf8');

const oldTableDef = `                    ip_address TEXT,\r\n                    hash_assinatura TEXT,\r\n                    data_assinatura DATETIME DEFAULT CURRENT_TIMESTAMP\r\n                )`;
const newTableDef = `                    ip_address TEXT,\r\n                    hash_assinatura TEXT,\r\n                    pesquisa_token TEXT,\r\n                    pesquisa_respondida_em DATETIME,\r\n                    data_assinatura DATETIME DEFAULT CURRENT_TIMESTAMP\r\n                )`;

const cntDb = dbCode.split(oldTableDef).length - 1;
console.log('database.js occurrences:', cntDb);
if (cntDb === 1) {
  dbCode = dbCode.replace(oldTableDef, newTableDef);
  fs.writeFileSync('backend/database.js', dbCode);
  console.log('✅ database.js updated with new columns');
} else {
  console.error('❌ Could not find table def in database.js');
}

// ─────────────────────────────────────────────────────────────────────────────
// Fix 2: Add ALTER TABLE migration in server.js for the new columns
//        Find a reliable anchor near startup/db init
// ─────────────────────────────────────────────────────────────────────────────
let serverCode = fs.readFileSync('backend/server.js', 'utf8');

// Check if migration already exists
if (serverCode.includes('ALTER TABLE assinaturas_auditoria ADD COLUMN pesquisa_token')) {
  console.log('ℹ️ Migration already present in server.js');
} else {
  // Find a good anchor: app.listen
  const anchor = `app.listen(PORT, () => {`;
  const idx = serverCode.indexOf(anchor);
  if (idx === -1) {
    console.error('❌ Could not find app.listen anchor in server.js');
  } else {
    const migration = `// ── Migration: Add pesquisa columns to assinaturas_auditoria ──────────────\r\ntry { db.run(\`ALTER TABLE assinaturas_auditoria ADD COLUMN pesquisa_token TEXT\`); } catch(_) {}\r\ntry { db.run(\`ALTER TABLE assinaturas_auditoria ADD COLUMN pesquisa_respondida_em DATETIME\`); } catch(_) {}\r\n\r\n`;
    serverCode = serverCode.slice(0, idx) + migration + serverCode.slice(idx);
    fs.writeFileSync('backend/server.js', serverCode);
    console.log('✅ Migration added to server.js');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fix 3: Update registrarAuditoria to send survey email
// ─────────────────────────────────────────────────────────────────────────────
serverCode = fs.readFileSync('backend/server.js', 'utf8');

// Find the exact old function (with CRLF)
const oldFn = "  const registrarAuditoria = (presencaId) => {\r\n    try {\r\n      const crypto = require('crypto');\r\n      const hash = crypto.createHash('sha256')\r\n        .update((assinatura_base64 || '') + colaborador_id + treinamento_id + now)\r\n        .digest('hex');\r\n\r\n      // Buscar nome do colaborador E nome/tipo do treinamento em paralelo\r\n      db.get(`SELECT nome_completo FROM colaboradores WHERE id = ?`, [colaborador_id], (errC, colab) => {\r\n        const colabNome = colab ? colab.nome_completo : 'Desconhecido';\r\n\r\n        db.get(`SELECT nome, IFNULL(tipo, 'treinamento') AS tipo FROM treinamentos WHERE id = ?`, [treinamento_id], (errT, trein) => {\r\n          // Monta label do documento: \"Palestra: Junho - Gestão de Estresse\"\r\n          let docLabel = 'Lista de Presença';\r\n          if (trein) {\r\n            const tipoCapitalized = trein.tipo\r\n              ? trein.tipo.charAt(0).toUpperCase() + trein.tipo.slice(1)\r\n              : 'Treinamento';\r\n            docLabel = `${tipoCapitalized}: ${trein.nome}`;\r\n          }\r\n\r\n          // Registrar na assinaturas_auditoria\r\n          db.run(\r\n            `INSERT INTO assinaturas_auditoria\r\n               (documento_id, document_type, colaborador_id, colaborador_nome,\r\n                gps_lat, gps_lon, dispositivo, ip_address, hash_assinatura)\r\n             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,\r\n            [presencaId, docLabel, colaborador_id, colabNome,\r\n             gps_lat || null, gps_lon || null, dispositivo || null, ip, hash],\r\n            (errA) => {\r\n              if (errA) console.error('[PRESENÇA-AUDITORIA] Erro ao registrar auditoria:', errA.message);\r\n              else console.log(`[PRESENÇA-AUDITORIA] Auditoria registrada: \"${docLabel}\" para ${colabNome}`);\r\n            }\r\n          );\r\n        });\r\n      });\r\n    } catch (e) {\r\n      console.error('[PRESENÇA-AUDITORIA] Erro inesperado:', e.message);\r\n    }\r\n  };";

const cntFn = serverCode.split(oldFn).length - 1;
console.log('registrarAuditoria occurrences:', cntFn);

if (cntFn === 1) {
  const newFn = `  const registrarAuditoria = (presencaId) => {
    try {
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256')
        .update((assinatura_base64 || '') + colaborador_id + treinamento_id + now)
        .digest('hex');
      const surveyToken = crypto.randomBytes(16).toString('hex');

      // Buscar nome, email do colaborador + nome/tipo do treinamento
      db.get(\`SELECT nome_completo, email FROM colaboradores WHERE id = ?\`, [colaborador_id], (errC, colab) => {
        const colabNome = colab ? colab.nome_completo : 'Desconhecido';

        db.get(\`SELECT nome, IFNULL(tipo, 'treinamento') AS tipo FROM treinamentos WHERE id = ?\`, [treinamento_id], (errT, trein) => {
          let docLabel = 'Lista de Presença';
          if (trein) {
            const tipoCapitalized = trein.tipo
              ? trein.tipo.charAt(0).toUpperCase() + trein.tipo.slice(1)
              : 'Treinamento';
            docLabel = \`\${tipoCapitalized}: \${trein.nome}\`;
          }
          const treinNome = trein ? trein.nome : docLabel;

          // Registrar na assinaturas_auditoria (com token da pesquisa)
          db.run(
            \`INSERT INTO assinaturas_auditoria
               (documento_id, document_type, colaborador_id, colaborador_nome,
                gps_lat, gps_lon, dispositivo, ip_address, hash_assinatura, pesquisa_token)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
            [presencaId, docLabel, colaborador_id, colabNome,
             gps_lat || null, gps_lon || null, dispositivo || null, ip, hash, surveyToken],
            (errA) => {
              if (errA) {
                console.error('[PRESENÇA-AUDITORIA] Erro ao registrar auditoria:', errA.message);
              } else {
                console.log(\`[PRESENÇA-AUDITORIA] Auditoria registrada: "\${docLabel}" para \${colabNome}\`);

                // Verificar se já existe token de pesquisa para este par
                db.get(\`SELECT id, token, respondido_em FROM treinamento_pesquisa_respostas WHERE treinamento_id = ? AND colaborador_id = ? LIMIT 1\`,
                  [treinamento_id, colaborador_id],
                  (errP, existing) => {
                    const finalToken = existing ? existing.token : surveyToken;

                    const sendSurveyEmail = () => {
                      if (!colab || !colab.email || !colab.email.includes('@')) return;
                      const baseUrl = process.env.BASE_URL || 'https://sistema-america.onrender.com';
                      const link = \`\${baseUrl}/pesquisa-treinamento.html?token=\${finalToken}\`;
                      const nomeFirst = colabNome.split(' ')[0];
                      const logoPath = require('path').join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');
                      sendMailHelper({
                        to: colab.email.trim(),
                        subject: \`Pesquisa de Satisfação — \${treinNome}\`,
                        html: \`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;"><div style="background:#fff;padding:0;"><img src="cid:empresa-logo" alt="América Rental" style="width:100%;display:block;max-height:120px;object-fit:cover;"></div><div style="padding:1.5rem 2rem;"><h2 style="color:#0e7490;margin-top:0;">Pesquisa de Satisfação</h2><p>Olá <strong>\${nomeFirst}</strong>,</p><p>Agradecemos sua participação em <strong>\${treinNome}</strong>!</p><p>Reserve 1 minuto para responder nossa pesquisa de satisfação — sua opinião é muito importante para nós!</p><div style="text-align:center;margin:30px 0;"><a href="\${link}" style="background-color:#0e7490;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;font-size:16px;">Responder Pesquisa</a></div><p style="color:#666;font-size:12px;">Se o botão não funcionar, cole este link:<br><a href="\${link}" style="color:#0e7490;">\${link}</a></p><hr style="border:none;border-top:1px solid #eee;margin:25px 0;"><p style="color:#999;font-size:11px;">Este é um e-mail automático, por favor não responda.</p></div></div>\`,
                        attachments: [{ filename: 'logo-header.png', path: logoPath, cid: 'empresa-logo' }]
                      }).then(() => console.log(\`[PRESENÇA-EMAIL] Pesquisa enviada para \${colab.email}\`))
                        .catch(e => console.error(\`[PRESENÇA-EMAIL] Erro ao enviar:\`, e.message));
                    };

                    if (!existing) {
                      db.run(\`INSERT INTO treinamento_pesquisa_respostas (treinamento_id, colaborador_id, token) VALUES (?, ?, ?)\`,
                        [treinamento_id, colaborador_id, surveyToken],
                        (errIns) => {
                          if (errIns) console.error('[PRESENÇA-PESQUISA] Erro ao criar token:', errIns.message);
                          else sendSurveyEmail();
                        }
                      );
                    } else if (!existing.respondido_em) {
                      sendSurveyEmail();
                    }
                  }
                );
              }
            }
          );
        });
      });
    } catch (e) {
      console.error('[PRESENÇA-AUDITORIA] Erro inesperado:', e.message);
    }
  };`;

  serverCode = serverCode.replace(oldFn, newFn);
  fs.writeFileSync('backend/server.js', serverCode);
  console.log('✅ registrarAuditoria updated with email logic');
} else {
  console.error('❌ registrarAuditoria NOT updated. Count:', cntFn);
}

// ─────────────────────────────────────────────────────────────────────────────
// Fix 4: Update POST /api/public/pesquisa-treinamento/:token to update audit trail
// ─────────────────────────────────────────────────────────────────────────────
serverCode = fs.readFileSync('backend/server.js', 'utf8');
const oldResJson = "      res.json({ ok: true, message: 'Pesquisa salva com sucesso!' });";
const newResJson = `      // Atualizar trilha de auditoria com data de resposta\r\n      db.run(\r\n        \`UPDATE assinaturas_auditoria SET pesquisa_respondida_em = CURRENT_TIMESTAMP\r\n          WHERE pesquisa_token = ? AND pesquisa_respondida_em IS NULL\`,\r\n        [token],\r\n        (errUpd) => { if (errUpd) console.error('[PESQUISA] Erro ao atualizar trilha:', errUpd.message); }\r\n      );\r\n\r\n      res.json({ ok: true, message: 'Pesquisa salva com sucesso!' });`;

const cntRes = serverCode.split(oldResJson).length - 1;
console.log('res.json pesquisa occurrences:', cntRes);
if (cntRes === 1) {
  serverCode = serverCode.replace(oldResJson, newResJson);
  fs.writeFileSync('backend/server.js', serverCode);
  console.log('✅ Pesquisa POST updated to update audit trail on response');
} else {
  console.error('❌ res.json anchor not unique. Count:', cntRes);
}

console.log('\n✅ All fixes applied!');
