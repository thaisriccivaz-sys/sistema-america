const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const t2 = `            await new Promise((resolve, reject) => {
                db.run(\`UPDATE documentos SET assinafy_status = ?, signed_file_path = ?, assinafy_signed_at = COALESCE(assinafy_signed_at, CURRENT_TIMESTAMP) WHERE id = ?\`, 
                    [newStatus, finalPath, docId], err => err ? reject(err) : resolve());
            });`;

const r2 = `            try {
                const fs = require('fs');
                let localBuf = fs.readFileSync(finalPath);
                const signPdfPfx = require('./sign_pdf_pfx');
                if (signPdfPfx.verificarDisponibilidade().disponivel) {
                    localBuf = await signPdfPfx.assinarPDF(localBuf, { motivo: 'Assinado eletronicamente pela empresa', nome: 'America Rental Equipamentos Ltda' });
                    fs.writeFileSync(finalPath, localBuf);
                }
            } catch(pfxErr) { console.warn("[SYNC-STATUS] Erro ao aplicar PFX:", pfxErr.message); }

            await new Promise((resolve, reject) => {
                db.run(\`UPDATE documentos SET assinafy_status = ?, signed_file_path = ?, assinafy_signed_at = COALESCE(assinafy_signed_at, CURRENT_TIMESTAMP) WHERE id = ?\`, 
                    [newStatus, finalPath, docId], err => err ? reject(err) : resolve());
            });`;

js = js.replace(t2, r2);
fs.writeFileSync('backend/server.js', js, 'utf8');
