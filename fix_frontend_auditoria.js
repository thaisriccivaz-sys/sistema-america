const fs = require('fs');

// ─────────────────────────────────────────────────────────────────────────────
// Fix index.html: update colspan from 7 to 8 in audit loading row
// ─────────────────────────────────────────────────────────────────────────────
let html = fs.readFileSync('frontend/index.html', 'utf8');
const oldColspan = `<td colspan="7" style="text-align:center;padding:20px;color:#94a3b8;">\r\n                                        <i class="ph ph-spinner" style="font-size:1.5rem;animation:spin 1s linear infinite;display:block;margin-bottom:8px;"></i>\r\n                                        Carregando registros...\r\n                                    </td>`;
const newColspan = `<td colspan="9" style="text-align:center;padding:20px;color:#94a3b8;">\r\n                                        <i class="ph ph-spinner" style="font-size:1.5rem;animation:spin 1s linear infinite;display:block;margin-bottom:8px;"></i>\r\n                                        Carregando registros...\r\n                                    </td>`;
const cntHtml = html.split(oldColspan).length - 1;
console.log('HTML colspan occurrences:', cntHtml);
if (cntHtml === 1) {
  html = html.replace(oldColspan, newColspan);
  fs.writeFileSync('frontend/index.html', html);
  console.log('✅ index.html colspan updated to 9');
} else {
  console.error('❌ Could not find colspan in index.html');
}

// ─────────────────────────────────────────────────────────────────────────────
// Fix app.js: update audit table row rendering to add pesquisa_respondida_em
// ─────────────────────────────────────────────────────────────────────────────
let appJs = fs.readFileSync('frontend/app.js', 'utf8');

// Update colspan references in auditoria code
appJs = appJs.replace(
  `tbody.innerHTML = \`<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8;"><i class="ph ph-spinner" style="font-size:1.5rem;animation:spin 1s linear infinite;display:block;margin-bottom:8px;"></i> Carregando registros...</td></tr>\`;`,
  `tbody.innerHTML = \`<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8;"><i class="ph ph-spinner" style="font-size:1.5rem;animation:spin 1s linear infinite;display:block;margin-bottom:8px;"></i> Carregando registros...</td></tr>\`;`
);

appJs = appJs.replace(
  `tbody.innerHTML = \`<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8;">Nenhum registro de auditoria encontrado.</td></tr>\`;`,
  `tbody.innerHTML = \`<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8;">Nenhum registro de auditoria encontrado.</td></tr>\`;`
);

appJs = appJs.replace(
  `tbody.innerHTML = \`<tr><td colspan="7" style="text-align:center;padding:20px;color:#dc2626;"><i class="ph ph-warning-circle"></i> Erro ao carregar auditoria: \${e.message}</td></tr>\`;`,
  `tbody.innerHTML = \`<tr><td colspan="9" style="text-align:center;padding:20px;color:#dc2626;"><i class="ph ph-warning-circle"></i> Erro ao carregar auditoria: \${e.message}</td></tr>\`;`
);

// Add the pesquisa_respondida_em column in the row render
const oldHashTd = '                <td style="padding:12px 16px;font-family:monospace;font-size:0.8em;word-break:break-all;max-width:250px;">${aud.hash_pdf || \'-\'}</td>';
const newHashTd = `                <td style="padding:12px 16px;font-family:monospace;font-size:0.8em;word-break:break-all;max-width:250px;">\${aud.hash_pdf || '-'}</td>
                <td style="padding:12px 16px;text-align:center;">
                  \${aud.pesquisa_respondida_em
                    ? \`<span style="display:inline-flex;align-items:center;gap:5px;background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:999px;font-size:0.76rem;font-weight:700;white-space:nowrap;"><i class="ph ph-check-circle"></i>\${new Date(aud.pesquisa_respondida_em.replace(' ','T')+(aud.pesquisa_respondida_em.includes('Z')?'':'Z')).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</span>\`
                    : (aud.tipo_documento && (aud.tipo_documento.startsWith('Treinamento') || aud.tipo_documento.startsWith('Terapia') || aud.tipo_documento.startsWith('Palestra') || aud.tipo_documento.startsWith('Lista de Presença'))
                        ? \`<span style="color:#94a3b8;font-size:0.76rem;">Aguardando</span>\`
                        : \`<span style="color:#e2e8f0;font-size:0.76rem;">—</span>\`)}
                </td>`;

const cntHash = appJs.split(oldHashTd).length - 1;
console.log('hash td occurrences in app.js:', cntHash);
if (cntHash === 1) {
  appJs = appJs.replace(oldHashTd, newHashTd);
  fs.writeFileSync('frontend/app.js', appJs);
  console.log('✅ app.js updated with pesquisa_respondida_em column');
} else {
  console.error('❌ Could not find hash td in app.js. Count:', cntHash);
}

console.log('\n✅ Frontend updates done!');
