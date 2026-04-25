const fs = require('fs');
let js = fs.readFileSync('backend/novo_processo_assinafy.js', 'utf8');

const target = `        // Verificar se já há um arquivo assinado ou original pela URL do Assinafy
        if (doc.assinafy_signed_url || doc.assinafy_url) {
            const fallbackUrl = doc.assinafy_signed_url || doc.assinafy_url;
            console.log(\`[ASSINAFY] Tentando baixar da URL salva: \${fallbackUrl}\`);
            const fetchMod = fetch;
            const r = await fetchMod(fallbackUrl);
            if (r.ok) {
                fileBuffer = Buffer.from(await r.arrayBuffer());
                console.log(\`[ASSINAFY] PDF baixado da URL salva: \${fileBuffer.length} bytes\`);
            }
        }`;

const replace = `        // Não podemos usar assinafy_url para baixar porque ela é uma página HTML de assinatura,
        // gerando erro "Unsupported file content: text/html" na re-submissão.
        // E assinafy_signed_url também pode requerer autenticação. 
        if (doc.assinafy_signed_url) {
            console.log(\`[ASSINAFY] CUIDADO: O arquivo não está localmente, mas tem URL assinada.\`);
        }`;

js = js.replace(target, replace);
fs.writeFileSync('backend/novo_processo_assinafy.js', js, 'utf8');
