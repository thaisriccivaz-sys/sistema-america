const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

// Fix 1: Add academia desconto field after data-inicio input
const ai = html.indexOf('colab-academia-data-inicio');
if (ai === -1) { console.error('NOT FOUND: academia'); process.exit(1); }
const afterInput = html.indexOf('</div>', ai);
const afterInputGrp = html.indexOf('</div>', afterInput + 1);
const descField = '\r\n                                                <div class="input-group" style="margin-top:.5rem;">\r\n                                                    <label>Desconto Mensal (R$)</label>\r\n                                                    <input type="number" id="colab-academia-desconto-valor" step="0.01" value="60" min="0" placeholder="60,00">\r\n                                                </div>';
html = html.slice(0, afterInputGrp + 6) + descField + html.slice(afterInputGrp + 6);
console.log('Academia desconto added:', html.includes('colab-academia-desconto-valor'));

// Fix 2: Add Fechamento nav item before Recibos
const ri = html.indexOf('data-target="recibos"');
if (ri === -1) { console.error('NOT FOUND: recibos nav'); process.exit(1); }
const aStart = html.lastIndexOf('<a ', ri);
const navItem = '<a href="#" class="nav-item nav-item-sub" data-target="fechamento" onclick="navigateTo(\'fechamento\'); return false;"><i class="ph ph-calculator"></i>\r\n                                Fechamento</a>\r\n                            ';
html = html.slice(0, aStart) + navItem + html.slice(aStart);
console.log('Fechamento nav added:', html.includes('data-target="fechamento"'));

fs.writeFileSync('frontend/index.html', html, 'utf8');
console.log('Done! Size:', html.length);
