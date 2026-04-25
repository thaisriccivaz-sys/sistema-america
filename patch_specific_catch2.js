const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

js = js.replace(/\} catch\(e\) \{\}/g, (match, offset) => {
    // only replace if we are inside app.get('/api/documentos/view
    const prev = js.substring(Math.max(0, offset - 300), offset);
    if (prev.includes("signPdfPfx.assinarPDF(finalBuf")) {
        return `} catch(e) { console.error('PFX PROXY ERR:', e.message); try{ db.run("INSERT INTO system_logs (msg) VALUES (?)", ['PFX PROXY ERR ' + String(e.message)]); }catch(z){} }`;
    }
    return match;
});

fs.writeFileSync('backend/server.js', js, 'utf8');
