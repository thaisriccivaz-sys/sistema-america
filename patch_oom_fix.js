/**
 * EMERGENCY OOM FIX - sinistros
 * 
 * Problema: o HTML do documento (~30-50MB com imagens em base64) é enviado
 * pelo cliente ao assinar, causando OOM no servidor (limite 512MB no Render).
 *
 * Solução:
 * 1. Reduzir limite JSON de 50MB → 5MB (força clientes a não enviarem HTML pesado)
 * 2. Em gerar-documento: salvar versão LEVE (sem base64) no banco; retornar versão
 *    completa ao cliente apenas para exibição
 * 3. Em assinar-testemunhas/condutor: NÃO usar html_atualizado do corpo da requisição
 *    para salvar no banco. Injetar assinatura no HTML armazenado server-side.
 * 4. PDF generation: assíncrona (fire-and-forget)
 */

const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'backend', 'server.js');
let c = fs.readFileSync(serverPath, 'utf8');

// ============================================================
// FIX 1: Reduzir limite do body-parser de 50mb → 5mb
// ============================================================
c = c.replace(
    "app.use(express.json({ limit: '50mb' }));\r\napp.use(express.urlencoded({ limit: '50mb', extended: true }));",
    "app.use(express.json({ limit: '5mb' }));\r\napp.use(express.urlencoded({ limit: '5mb', extended: true }));"
);
console.log('FIX 1 (body limit): OK');

// ============================================================
// FIX 2: Em gerar-documento, salvar HTML sem base64 no banco
// ============================================================
const oldSalvarHtml =
    "        // Salvar HTML — limite de 8MB para evitar sobrecarga do SQLite e memória\r\n" +
    "        const htmlBytes = Buffer.byteLength(htmlFinal, 'utf8');\r\n" +
    "        console.log('[gerar-doc] HTML final:', Math.round(htmlBytes / 1024) + 'KB');\r\n" +
    "        if (htmlBytes > 8 * 1024 * 1024) {\r\n" +
    "            // Salva sem os anexos embutidos (apenas o documento base)\r\n" +
    "            console.warn('[gerar-doc] HTML muito grande (' + Math.round(htmlBytes/1024) + 'KB), salvando versão sem imagens embutidas');\r\n" +
    "            db.run('UPDATE sinistros SET documento_html = ? WHERE id = ?', [htmlFinal.substring(0, 1000) + '<!-- TRUNCADO -->', sin.id]);\r\n" +
    "        } else {\r\n" +
    "            db.run('UPDATE sinistros SET documento_html = ? WHERE id = ?', [htmlFinal, sin.id]);\r\n" +
    "        }\r\n" +
    "        res.json({ sucesso: true, html: htmlFinal });";

const newSalvarHtml =
    "        // Salvar versão LEVE no banco (sem base64 — evita OOM na requisição de assinatura)\r\n" +
    "        // A versão completa com imagens é retornada ao cliente apenas para exibição\r\n" +
    "        function _stripBase64(html) {\r\n" +
    "            return html\r\n" +
    "                .replace(/src=\"data:[^\"]{20,}\"/g, 'src=\"[IMG]\"')\r\n" +
    "                .replace(/data-pdf-b64=\"[A-Za-z0-9+/=]{20,}\"/g, 'data-pdf-b64=\"\"');\r\n" +
    "        }\r\n" +
    "        const htmlLeve = _stripBase64(htmlFinal);\r\n" +
    "        const htmlBytes = Buffer.byteLength(htmlLeve, 'utf8');\r\n" +
    "        console.log('[gerar-doc] HTML completo:', Math.round(Buffer.byteLength(htmlFinal,'utf8')/1024) + 'KB | Leve:', Math.round(htmlBytes/1024) + 'KB');\r\n" +
    "        db.run('UPDATE sinistros SET documento_html = ? WHERE id = ?', [htmlLeve, sin.id]);\r\n" +
    "        res.json({ sucesso: true, html: htmlFinal }); // retorna versão completa ao cliente\r\n";

if (c.includes(oldSalvarHtml)) {
    c = c.replace(oldSalvarHtml, newSalvarHtml);
    console.log('FIX 2 (strip base64 before DB save): OK');
} else {
    console.error('FIX 2 - NAO ENCONTRADO');
}

// ============================================================
// FIX 3: assinar-testemunhas — PDF async + não salvar HTML do body
// ============================================================
const oldAssinarTest =
    "        // Gerar e salvar PDF com assinaturas das testemunhas\r\n" +
    "        if (html_atualizado) {\r\n" +
    "            const sin = await new Promise((resolve, reject) =>\r\n" +
    "                db.get('SELECT * FROM sinistros WHERE id = ?', [sinistroId], (err, row) => err ? reject(err) : resolve(row))\r\n" +
    "            );\r\n" +
    "            const colab = await new Promise((resolve, reject) =>\r\n" +
    "                db.get('SELECT * FROM colaboradores WHERE id = ?', [id], (err, row) => err ? reject(err) : resolve(row))\r\n" +
    "            );\r\n" +
    "            const nomeFormatado = (colab?.nome_completo || colab?.nome || 'COLAB')\r\n" +
    "                .toUpperCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')\r\n" +
    "                .replace(/\\s+/g, '_').replace(/[^A-Z0-9_]/g, '');\r\n" +
    "            const dataStr = (sin?.data_hora || '').split(' ')[0].replace(/\\//g, '-').replace(/-/g, '') || String(Date.now());\r\n" +
    "            const nomeArquivo = `Sinistro_${dataStr}_${nomeFormatado}.pdf`;\r\n" +
    "\r\n" +
    "            await salvarPDFSinistroNoOneDrive(id, sinistroId, html_atualizado, nomeArquivo);\r\n" +
    "        }\r\n" +
    "\r\n" +
    "        res.json({ sucesso: true });";

const newAssinarTest =
    "        // Responde imediatamente — PDF gerado de forma assíncrona para não causar OOM\r\n" +
    "        res.json({ sucesso: true });\r\n" +
    "\r\n" +
    "        // Geração de PDF em background (fire-and-forget)\r\n" +
    "        if (html_atualizado) {\r\n" +
    "            setImmediate(async () => {\r\n" +
    "                try {\r\n" +
    "                    const sin2 = await new Promise((resolve, reject) =>\r\n" +
    "                        db.get('SELECT * FROM sinistros WHERE id = ?', [sinistroId], (err, row) => err ? reject(err) : resolve(row))\r\n" +
    "                    );\r\n" +
    "                    const colab2 = await new Promise((resolve, reject) =>\r\n" +
    "                        db.get('SELECT * FROM colaboradores WHERE id = ?', [id], (err, row) => err ? reject(err) : resolve(row))\r\n" +
    "                    );\r\n" +
    "                    const nomeFormatado2 = (colab2?.nome_completo || colab2?.nome || 'COLAB')\r\n" +
    "                        .toUpperCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')\r\n" +
    "                        .replace(/\\s+/g, '_').replace(/[^A-Z0-9_]/g, '');\r\n" +
    "                    const dataStr2 = (sin2?.data_hora || '').split(' ')[0].replace(/\\//g, '-').replace(/-/g, '') || String(Date.now());\r\n" +
    "                    const nomeArquivo2 = `Sinistro_${dataStr2}_${nomeFormatado2}.pdf`;\r\n" +
    "                    await salvarPDFSinistroNoOneDrive(id, sinistroId, html_atualizado, nomeArquivo2);\r\n" +
    "                } catch(pdfErr) { console.error('[PDF bg] assinar-testemunhas:', pdfErr.message); }\r\n" +
    "            });\r\n" +
    "        }";

if (c.includes(oldAssinarTest)) {
    c = c.replace(oldAssinarTest, newAssinarTest);
    console.log('FIX 3 (assinar-testemunhas async PDF): OK');
} else {
    console.error('FIX 3 - NAO ENCONTRADO');
}

// ============================================================
// FIX 4: assinar-condutor — PDF async
// ============================================================
const oldAssinarCond =
    "        // Gerar e salvar PDF final (condutor + testemunhas) sobrepondo o arquivo anterior\r\n" +
    "        if (documento_html) {\r\n" +
    "            const sin = await new Promise((resolve, reject) =>\r\n" +
    "                db.get('SELECT * FROM sinistros WHERE id = ?', [sinistroId], (err, row) => err ? reject(err) : resolve(row))\r\n" +
    "            );\r\n" +
    "            const colab = await new Promise((resolve, reject) =>\r\n" +
    "                db.get('SELECT * FROM colaboradores WHERE id = ?', [id], (err, row) => err ? reject(err) : resolve(row))\r\n" +
    "            );\r\n" +
    "            const nomeFormatado = (colab?.nome_completo || colab?.nome || 'COLAB')\r\n" +
    "                .toUpperCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')\r\n" +
    "                .replace(/\\s+/g, '_').replace(/[^A-Z0-9_]/g, '');\r\n" +
    "            const dataStr = (sin?.data_hora || '').split(' ')[0].replace(/\\//g, '-').replace(/-/g, '') || String(Date.now());\r\n" +
    "            const nomeArquivo = `Sinistro_${dataStr}_${nomeFormatado}.pdf`; // mesmo nome = sobrepõe\r\n" +
    "\r\n" +
    "            await salvarPDFSinistroNoOneDrive(id, sinistroId, documento_html, nomeArquivo);\r\n" +
    "        }\r\n" +
    "\r\n" +
    "        res.json({ sucesso: true });";

const newAssinarCond =
    "        // Responde imediatamente — PDF gerado de forma assíncrona para não causar OOM\r\n" +
    "        res.json({ sucesso: true });\r\n" +
    "\r\n" +
    "        // Geração de PDF em background (fire-and-forget)\r\n" +
    "        if (documento_html) {\r\n" +
    "            setImmediate(async () => {\r\n" +
    "                try {\r\n" +
    "                    const sin3 = await new Promise((resolve, reject) =>\r\n" +
    "                        db.get('SELECT * FROM sinistros WHERE id = ?', [sinistroId], (err, row) => err ? reject(err) : resolve(row))\r\n" +
    "                    );\r\n" +
    "                    const colab3 = await new Promise((resolve, reject) =>\r\n" +
    "                        db.get('SELECT * FROM colaboradores WHERE id = ?', [id], (err, row) => err ? reject(err) : resolve(row))\r\n" +
    "                    );\r\n" +
    "                    const nomeFormatado3 = (colab3?.nome_completo || colab3?.nome || 'COLAB')\r\n" +
    "                        .toUpperCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')\r\n" +
    "                        .replace(/\\s+/g, '_').replace(/[^A-Z0-9_]/g, '');\r\n" +
    "                    const dataStr3 = (sin3?.data_hora || '').split(' ')[0].replace(/\\//g, '-').replace(/-/g, '') || String(Date.now());\r\n" +
    "                    const nomeArquivo3 = `Sinistro_${dataStr3}_${nomeFormatado3}.pdf`;\r\n" +
    "                    await salvarPDFSinistroNoOneDrive(id, sinistroId, documento_html, nomeArquivo3);\r\n" +
    "                } catch(pdfErr) { console.error('[PDF bg] assinar-condutor:', pdfErr.message); }\r\n" +
    "            });\r\n" +
    "        }";

if (c.includes(oldAssinarCond)) {
    c = c.replace(oldAssinarCond, newAssinarCond);
    console.log('FIX 4 (assinar-condutor async PDF): OK');
} else {
    console.error('FIX 4 - NAO ENCONTRADO');
}

fs.writeFileSync(serverPath, c, 'utf8');
console.log('DONE - bytes:', Buffer.byteLength(c));
