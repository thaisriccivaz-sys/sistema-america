const fs = require('fs');

// 1. FRONTEND USUARIOS.JS: Add to MENU_HIERARQUIA
let u = fs.readFileSync('frontend/usuarios.js', 'utf8');
if (u.includes("'logistica-frota', 'logistica-multas']")) {
    u = u.replace(
        "'logistica-frota', 'logistica-multas']",
        "'logistica-frota', 'logistica-multas', 'logistica-credenciamento']"
    );
}
if (u.includes("'financeiro-em-breve'] }]")) {
    // Wait, the Comercial menu
    if (u.includes("modulo: 'Comercial'")) {
        u = u.replace(
            "telas: ['comercial-em-breve']",
            "telas: ['comercial-credenciamento', 'comercial-em-breve']"
        );
    }
}
fs.writeFileSync('frontend/usuarios.js', u);


// 2. BACKEND SERVER.JS: Improve the logistics email fetch
let s = fs.readFileSync('backend/server.js', 'utf8');
const oldQuery = `db.all("SELECT u.email FROM usuarios u LEFT JOIN grupos_permissao gp ON u.grupo_permissao_id = gp.id WHERE u.ativo = 1 AND u.email IS NOT NULL AND u.email != '' AND (gp.departamento LIKE '%ogíst%' OR gp.departamento LIKE '%ogist%' OR u.departamento LIKE '%ogíst%' OR u.departamento LIKE '%ogist%')", [], (errU, users) => {`;

const newQueryBlock = `// Busca tanto em colaboradores quanto em usuários que tenham a tag logistica
                    db.all(\`
                        SELECT c.email_corporativo, c.email as c_email, u.email as u_email
                        FROM usuarios u
                        LEFT JOIN grupos_permissao gp ON u.grupo_permissao_id = gp.id
                        LEFT JOIN colaboradores c ON u.nome = c.nome_completo
                        WHERE u.ativo = 1 
                          AND (gp.departamento LIKE '%ogíst%' OR gp.departamento LIKE '%ogist%' 
                               OR u.departamento LIKE '%ogíst%' OR u.departamento LIKE '%ogist%'
                               OR u.role LIKE '%ogist%')
                        UNION
                        SELECT email_corporativo, email as c_email, null as u_email
                        FROM colaboradores 
                        WHERE status = 'Ativo' AND (departamento LIKE '%ogist%' OR departamento LIKE '%ogíst%' OR cargo LIKE '%ogist%')
                    \`, [], (errU, rows) => {
                        const emails = new Set();
                        (rows || []).forEach(r => {
                            if (r.email_corporativo && r.email_corporativo.includes('@')) emails.add(r.email_corporativo);
                            else if (r.c_email && r.c_email.includes('@')) emails.add(r.c_email);
                            else if (r.u_email && r.u_email.includes('@')) emails.add(r.u_email);
                        });
`;

const s_regex1 = /db\.all\("SELECT nome_completo, email_corporativo, email FROM colaboradores WHERE departamento LIKE '%ogist%' AND status = 'Ativo' AND \(email_corporativo != '' AND email_corporativo IS NOT NULL OR email != '' AND email IS NOT NULL\)",\s*\[\],\s*async \(errColabs, colabs\) => \{\s*\/\/[^\n]*\s*const emails = new Set\(\);\s*\(colabs \|\| \[\]\)\.forEach\(c => \{\s*if \(c\.email_corporativo && c\.email_corporativo\.includes\('@'\)\) emails\.add\(c\.email_corporativo\);\s*else if \(c\.email && c\.email\.includes\('@'\)\) emails\.add\(c\.email\);\s*\}\);\s*\/\/[^\n]*\s*if \(emails\.size === 0\) \{\s*db\.all\("SELECT u\.email FROM usuarios u LEFT JOIN grupos_permissao gp ON u\.grupo_permissao_id = gp\.id WHERE u\.ativo = 1 AND u\.email IS NOT NULL AND u\.email != '' AND \(gp\.departamento LIKE '%ogíst%' OR gp\.departamento LIKE '%ogist%' OR u\.departamento LIKE '%ogíst%' OR u\.departamento LIKE '%ogist%'\)", \[\], \(errU, users\) => \{\s*\(users \|\| \[\]\)\.forEach\(u => \{ if \(u\.email && u\.email\.includes\('@'\)\) emails\.add\(u\.email\); \}\);\s*if \(emails\.size > 0\) enviarEmailLogistica\(\[\.\.\.emails\]\);\s*\}\);\s*\} else \{\s*enviarEmailLogistica\(\[\.\.\.emails\]\);\s*\}/;

if (s_regex1.test(s)) {
    s = s.replace(s_regex1, newQueryBlock + `\n                        if (emails.size > 0) enviarEmailLogistica([...emails]);\n                    });`);
    fs.writeFileSync('backend/server.js', s);
    console.log("Server.js patched via Regex 1");
} else {
    console.log("Could not find regex in server.js");
}
