const fs = require('fs');
let content = fs.readFileSync('backend/server.js', 'utf8');

const startStr = 'async function syncBase64ToR2() {';
const startIndex = content.indexOf(startStr);
if (startIndex !== -1) {
  const endIndex = content.indexOf('// 2. EPIs (Selfie)', startIndex);
  if (endIndex !== -1) {
    const newFunc = `async function syncBase64ToR2() {
    if (!r2 || !r2.isReady()) return;
    
    // 1. Treinamentos (Selfie e Assinatura)
    // LIMIT 5 por ciclo para não sobrecarregar a memória do Render (era 15)
    db.all(\`SELECT id, selfie_base64, assinatura_base64 FROM treinamento_presenca WHERE ((selfie_base64 LIKE 'data:image/%' AND selfie_url IS NULL) OR (assinatura_base64 LIKE 'data:image/%' AND assinatura_url IS NULL)) LIMIT 5\`, async (err, rows) => {
        if (err || !rows) return;
        for (const row of rows) {
            let updated = false;
            let newSelfieUrl = null;
            let newAssinUrl = null;
            
            try {
                if (row.selfie_base64 && row.selfie_base64.startsWith('data:image/')) {
                    const match = row.selfie_base64.match(/^data:(image\\/\\w+);base64,(.+)$/);
                    if (match) {
                        const mime = match[1];
                        const buffer = Buffer.from(match[2], 'base64');
                        const ext = mime.split('/')[1] || 'png';
                        const key = \`Treinamentos/Selfies/mig_\${row.id}_\${Date.now()}.\${ext}\`;
                        newSelfieUrl = await r2.uploadToR2(key, buffer, mime);
                        updated = true;
                    }
                }
                
                if (row.assinatura_base64 && row.assinatura_base64.startsWith('data:image/')) {
                    const match = row.assinatura_base64.match(/^data:(image\\/\\w+);base64,(.+)$/);
                    if (match) {
                        const mime = match[1];
                        const buffer = Buffer.from(match[2], 'base64');
                        const ext = mime.split('/')[1] || 'png';
                        const key = \`Treinamentos/Assinaturas/mig_\${row.id}_\${Date.now()}.\${ext}\`;
                        newAssinUrl = await r2.uploadToR2(key, buffer, mime);
                        updated = true;
                    }
                }
                
                if (updated) {
                    let updateQuery = \`UPDATE treinamento_presenca SET \`;
                    let params = [];
                    if (newSelfieUrl) { updateQuery += \`selfie_url = ?, \`; params.push(newSelfieUrl); }
                    if (newAssinUrl) { updateQuery += \`assinatura_url = ?, \`; params.push(newAssinUrl); }
                    updateQuery = updateQuery.slice(0, -2) + \` WHERE id = ?\`;
                    params.push(row.id);
                    
                    db.run(updateQuery, params, (uErr) => {
                        if (!uErr) console.log(\`[R2 Sync] Treinamento_presenca ID \${row.id} migrado para R2.\`);
                    });
                }
            } catch (e) {
                console.error(\`[R2 Sync Error] Falha ao migrar treinamento_presenca ID \${row.id}:\`, e.message);
            }
        }
    });

    `;
    content = content.substring(0, startIndex) + newFunc + content.substring(endIndex);
    fs.writeFileSync('backend/server.js', content, 'utf8');
    console.log('Successfully updated syncBase64ToR2 function (treinamentos)');
  } else {
    console.log('Could not find end index');
  }
} else {
  console.log('Could not find start index');
}
