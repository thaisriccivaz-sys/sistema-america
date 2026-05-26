const fs = require('fs');

// 1. Fix index.html - replace readonly input with select for classe
let html = fs.readFileSync('frontend/index.html', 'utf8');

// Replace the Classe static input with a proper select
const oldClasse = `<label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Classe *</label>
                                            <input type="text" value="CLASSE II A" readonly style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;background:#f8fafc;box-sizing:border-box;">
                                            <input type="hidden" id="mtr-classe-codigo" value="2">`;

const newClasse = `<label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Classe *</label>
                                            <select id="mtr-classe" required style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;background:#fff;box-sizing:border-box;">
                                                <option value="43">CLASSE II A</option>
                                                <option value="42">CLASSE II B</option>
                                                <option value="1">CLASSE I</option>
                                                <option value="11">CLASSE A (RCC)</option>
                                                <option value="12">CLASSE B (RCC)</option>
                                                <option value="13">CLASSE C (RCC)</option>
                                                <option value="14">CLASSE D (RCC)</option>
                                                <option value="21">GRUPO A1 (RSS)</option>
                                                <option value="22">GRUPO A2 (RSS)</option>
                                                <option value="25">GRUPO A5 (RSS)</option>
                                            </select>`;

if (html.includes(oldClasse)) {
    html = html.replace(oldClasse, newClasse);
    fs.writeFileSync('frontend/index.html', html);
    console.log('HTML CLASSE OK');
} else {
    // Try different quote style
    console.log('OLD CLASSE NOT FOUND - trying partial match');
    const idx = html.indexOf('mtr-classe-codigo');
    if(idx > -1) {
        console.log('Found mtr-classe-codigo at:', idx);
        console.log('Context:', html.substring(idx-200, idx+100));
    }
}

// 2. Fix server.js - update default claCodigo from 2 to 43
let serverJs = fs.readFileSync('backend/server.js', 'utf8');
if(serverJs.includes('parseInt(req.body.claCodigo) : 2')) {
    serverJs = serverJs.replace('parseInt(req.body.claCodigo) : 2', 'parseInt(req.body.claCodigo) : 43');
    fs.writeFileSync('backend/server.js', serverJs);
    console.log('SERVER claCodigo default -> 43 OK');
} else {
    console.log('SERVER OLD TEXT NOT FOUND');
}
