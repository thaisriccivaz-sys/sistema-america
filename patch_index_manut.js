const fs = require('fs');
let c = fs.readFileSync('frontend/index.html', 'utf8');
const ts = Date.now();
if (!c.includes('frota_manutencao.js')) {
    c = c.replace('</body>', `<script src="/frota_manutencao.js?v=${ts}"></script>\n</body>`);
}
c = c.replace(/frota\.js\?v=\d+/g, `frota.js?v=${ts}`);
fs.writeFileSync('frontend/index.html', c);
console.log('Done - updated index.html');
