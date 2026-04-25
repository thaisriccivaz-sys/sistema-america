const fs = require('fs');
let content = fs.readFileSync('backend/server.js', 'utf8');

const old = `        db.run("DELETE FROM geradores WHERE id = ?", [req.params.id], function(err) {\r\n            if (err) return res.status(500).json({ error: err.message });\r\n            res.json({ message: 'Gerador removido' });\r\n        });`;

const replacement = `        db.run("DELETE FROM geradores WHERE id = ?", [req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            // Registra na lista de excluidos para que o seed nao recrie ao reiniciar
            db.run("CREATE TABLE IF NOT EXISTS geradores_excluidos (nome TEXT PRIMARY KEY)", () => {
                db.run("INSERT OR IGNORE INTO geradores_excluidos (nome) VALUES (?)", [originalName]);
            });
            res.json({ message: 'Gerador removido' });
        });`;

if (content.includes(old)) {
    content = content.replace(old, replacement);
    fs.writeFileSync('backend/server.js', content, 'utf8');
    console.log('OK: delete endpoint atualizado');
} else {
    // Tenta versão com \n
    const old2 = '        db.run("DELETE FROM geradores WHERE id = ?", [req.params.id], function(err) {\n            if (err) return res.status(500).json({ error: err.message });\n            res.json({ message: \'Gerador removido\' });\n        });';
    if (content.includes(old2)) {
        content = content.replace(old2, replacement);
        fs.writeFileSync('backend/server.js', content, 'utf8');
        console.log('OK (LF): delete endpoint atualizado');
    } else {
        // Usa regex
        const updated = content.replace(
            /db\.run\("DELETE FROM geradores WHERE id = \?", \[req\.params\.id\], function\(err\) \{\s*if \(err\) return res\.status\(500\)\.json\(\{ error: err\.message \}\);\s*res\.json\(\{ message: 'Gerador removido' \}\);\s*\}\);/,
            replacement
        );
        if (updated !== content) {
            fs.writeFileSync('backend/server.js', updated, 'utf8');
            console.log('OK (regex): delete endpoint atualizado');
        } else {
            console.error('FAIL: não encontrou o padrão para substituir');
        }
    }
}
