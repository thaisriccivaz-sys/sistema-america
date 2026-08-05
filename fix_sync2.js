const fs = require('fs');
let content = fs.readFileSync('backend/server.js', 'utf8');

const startStr = '// 2. EPIs (Selfie)';
const startIndex = content.indexOf(startStr);
if (startIndex !== -1) {
  const endIndex = content.indexOf('}', startIndex);
  if (endIndex !== -1) {
    const newFunc = `// 2. EPIs (Selfie)
    // LIMIT 5 por ciclo para não sobrecarregar a memória do Render (era 15)
    db.all(\`SELECT id, selfie_base64 FROM epi_selfies WHERE selfie_base64 LIKE 'data:image/%' AND selfie_url IS NULL LIMIT 5\`, async (err, rows) => {
        if (err || !rows) return;
        for (const row of rows) {
            try {
                const match = row.selfie_base64.match(/^data:(image\\/\\w+);base64,(.+)$/);
                if (match) {
                    const mime = match[1];
                    const buffer = Buffer.from(match[2], 'base64');
                    const ext = mime.split('/')[1] || 'png';
                    const key = \`epi_selfies/mig_\${row.id}_\${Date.now()}.\${ext}\`;
                    const url = await r2.uploadToR2(key, buffer, mime);
                    
                    db.run(\`UPDATE epi_selfies SET selfie_url = ? WHERE id = ?\`, [url, row.id], (uErr) => {
                        if (!uErr) console.log(\`[R2 Sync] epi_selfies ID \${row.id} migrado para R2.\`);
                    });
                }
            } catch (e) {
                console.error(\`[R2 Sync] Erro ao migrar epi_selfies ID \${row.id}:\`, e.message);
            }
        }
    });`;
    
    // Actually the ending brace '}' is for the syncBase64ToR2 function. We want to find the brace that closes the db.all callback, or just use regex / string manipulation. Let's just find the exact string.
    
    const exactTarget = `// 2. EPIs (Selfie)
    // LIMIT 5 por ciclo para não sobrecarregar a memória do Render (era 15)
    db.all(\`SELECT id, selfie_base64 FROM epi_selfies WHERE selfie_base64 LIKE 'data:image/%' LIMIT 5\`, async (err, rows) => {
        if (err || !rows) return;
        for (const row of rows) {
            try {
                const match = row.selfie_base64.match(/^data:(image\\/\\w+);base64,(.+)$/);
                if (match) {
                    const mime = match[1];
                    const buffer = Buffer.from(match[2], 'base64');
                    const ext = mime.split('/')[1] || 'png';
                    const key = \`epi_selfies/\${row.id}/selfie_\${Date.now()}.\${ext}\`;
                    const url = await r2.uploadToR2(key, buffer, mime);
                    
                    db.run(\`UPDATE epi_selfies SET selfie_base64 = ? WHERE id = ?\`, [url, row.id], (uErr) => {
                        if (!uErr) console.log(\`[R2 Sync] epi_selfies ID \${row.id} migrado para R2.\`);
                    });
                }
            } catch (e) {
                console.error(\`[R2 Sync] Erro ao migrar epi_selfies ID \${row.id}:\`, e.message);
            }
        }
    });`;

    content = content.replace(exactTarget, newFunc);
    fs.writeFileSync('backend/server.js', content, 'utf8');
    console.log('Successfully updated syncBase64ToR2 function (epi_selfies)');
  }
}
