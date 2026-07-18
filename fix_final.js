const fs = require('fs');

let appCode = fs.readFileSync('frontend/app.js', 'utf8');

// 1. Revert the previous cell modification back to normal
appCode = appCode.replace(/<td style="padding:12px 16px;font-weight:500;display:flex;align-items:center;gap:8px;">\s*<div>\s*\$\{aud\.tipo_documento\}<br><small style="color:#64748b;">\$\{aud\.detalhes \|\| ''\}<\/small>\s*<\/div>[\s\S]*?<\/td>/,
    `<td style="padding:12px 16px;font-weight:500;">\${aud.tipo_documento}<br><small style="color:#64748b;">\${aud.detalhes || ''}</small></td>`);

// 2. Add a new <th> column at the end in the header
appCode = appCode.replace(/<th style="padding:12px 16px;text-align:left;color:#475569;font-weight:600;width:250px;">Hash \(SHA-256\)<\/th>/,
    '<th style="padding:12px 16px;text-align:left;color:#475569;font-weight:600;width:250px;">Hash (SHA-256)</th><th style="padding:12px 16px;text-align:center;color:#475569;font-weight:600;width:60px;">Ações</th>');

// 3. Add the action button <td> at the end of the row
appCode = appCode.replace(/<td style="padding:12px 16px;font-family:monospace;font-size:0\.8em;word-break:break-all;max-width:250px;">\$\{aud\.hash_pdf \|\| '-'\}<\/td>/,
    `<td style="padding:12px 16px;font-family:monospace;font-size:0.8em;word-break:break-all;max-width:250px;">\${aud.hash_pdf || '-'}</td>
    <td style="padding:12px 16px;text-align:center;">
        \${(aud.tipo_documento && aud.tipo_documento.startsWith('Entrega de EPI') && aud.documento_id) 
            ? \`<button onclick="window.verComprovanteEntrega(\${aud.documento_id})" title="Ver Comprovante" style="background:#e0f2fe;border:none;color:#0369a1;cursor:pointer;font-size:1.2rem;display:inline-flex;align-items:center;justify-content:center;padding:6px;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,0.05);"><i class="ph ph-eye"></i></button>\` 
            : (aud.tipo_documento && !aud.tipo_documento.startsWith('Entrega de EPI') && aud.documento_id) 
            ? \`<button onclick="window.open('\${API_URL}/documentos/download/\${aud.documento_id}?token=\${currentToken}', '_blank')" title="Ver Documento" style="background:#e0f2fe;border:none;color:#0369a1;cursor:pointer;font-size:1.2rem;display:inline-flex;align-items:center;justify-content:center;padding:6px;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,0.05);"><i class="ph ph-eye"></i></button>\` 
            : ''}
    </td>`);

fs.writeFileSync('frontend/app.js', appCode);
console.log('Fixed audit table actions in app.js');

// Fix server.js to inject CREATE TABLE epi_selfies inside db.serialize
let serverCode = fs.readFileSync('backend/server.js', 'utf8');
if (!serverCode.includes('CREATE TABLE IF NOT EXISTS epi_selfies')) {
    const tableSql = `
db.run(\`CREATE TABLE IF NOT EXISTS epi_selfies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    colaborador_id INTEGER NOT NULL,
    selfie_base64 TEXT NOT NULL,
    registrado_por TEXT,
    timestamp TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
)\`);`;
    serverCode = serverCode.replace(/(db\.run\("CREATE TABLE IF NOT EXISTS geradores_excluidos.*?\)\];)/, '$1' + tableSql);
    // Let's just insert it right after `db.serialize(() => {`
    serverCode = serverCode.replace(/db\.serialize\(\(\) => \{/, 'db.serialize(() => {' + tableSql);
    fs.writeFileSync('backend/server.js', serverCode);
    console.log('Injected epi_selfies into server.js');
}
