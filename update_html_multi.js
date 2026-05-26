const fs = require('fs');

let path = 'frontend/index.html';
let content = fs.readFileSync(path, 'utf8');

// COMERCIAL HTML REPLACEMENT
const regexComSearch = /<div style="display:flex; gap:10px;">\s*<div style="position:relative;">\s*<i class="ph ph-hash"[^>]*><\/i>\s*<input type="text" id="filtro-pesquisa-os-com-cred"[^>]*>\s*<\/div>\s*<div style="position:relative;">\s*<i class="ph ph-magnifying-glass"[^>]*><\/i>\s*<input type="text" id="filtro-pesquisa-com-cred"[^>]*>\s*<\/div>\s*<\/div>/;

const newComSearch = `<div style="display:flex; flex-wrap:wrap; gap:10px;">
                                <div style="position:relative;">
                                    <i class="ph ph-hash" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8;"></i>
                                    <input type="text" id="filtro-pesquisa-os-com-cred" class="form-control" placeholder="OS" oninput="window.filtrarHistoricoComCred()" style="width: 80px; padding: 6px 12px 6px 30px;">
                                </div>
                                <div style="position:relative;">
                                    <i class="ph ph-user" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8;"></i>
                                    <input type="text" id="filtro-pesquisa-cliente-com-cred" class="form-control" placeholder="Cliente" oninput="window.filtrarHistoricoComCred()" style="width: 150px; padding: 6px 12px 6px 30px;">
                                </div>
                                <div style="position:relative;">
                                    <i class="ph ph-map-pin" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8;"></i>
                                    <input type="text" id="filtro-pesquisa-endereco-com-cred" class="form-control" placeholder="Endereço" oninput="window.filtrarHistoricoComCred()" style="width: 150px; padding: 6px 12px 6px 30px;">
                                </div>
                                <div style="position:relative;">
                                    <i class="ph ph-envelope-simple" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8;"></i>
                                    <input type="text" id="filtro-pesquisa-email-com-cred" class="form-control" placeholder="E-mail" oninput="window.filtrarHistoricoComCred()" style="width: 150px; padding: 6px 12px 6px 30px;">
                                </div>
                              </div>`;

content = content.replace(regexComSearch, newComSearch);


// LOGISTICA HTML REPLACEMENT
const regexLogSearch = /<div style="display:flex; gap:10px;">\s*<div style="position:relative;">\s*<i class="ph ph-hash"[^>]*><\/i>\s*<input type="text" id="filtro-pesquisa-os-cred"[^>]*>\s*<\/div>\s*<div style="position:relative;">\s*<i class="ph ph-magnifying-glass"[^>]*><\/i>\s*<input type="text" id="filtro-pesquisa-cred"[^>]*>\s*<\/div>\s*<\/div>/;

const newLogSearch = `<div style="display:flex; flex-wrap:wrap; gap:10px;">
                                <div style="position:relative;">
                                    <i class="ph ph-hash" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8;"></i>
                                    <input type="text" id="filtro-pesquisa-os-cred" class="form-control" placeholder="OS" oninput="window.filtrarHistoricoCred()" style="width: 80px; padding: 6px 12px 6px 30px;">
                                </div>
                                <div style="position:relative;">
                                    <i class="ph ph-user" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8;"></i>
                                    <input type="text" id="filtro-pesquisa-cliente-cred" class="form-control" placeholder="Cliente" oninput="window.filtrarHistoricoCred()" style="width: 150px; padding: 6px 12px 6px 30px;">
                                </div>
                                <div style="position:relative;">
                                    <i class="ph ph-map-pin" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8;"></i>
                                    <input type="text" id="filtro-pesquisa-endereco-cred" class="form-control" placeholder="Endereço" oninput="window.filtrarHistoricoCred()" style="width: 150px; padding: 6px 12px 6px 30px;">
                                </div>
                                <div style="position:relative;">
                                    <i class="ph ph-envelope-simple" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8;"></i>
                                    <input type="text" id="filtro-pesquisa-email-cred" class="form-control" placeholder="E-mail" oninput="window.filtrarHistoricoCred()" style="width: 150px; padding: 6px 12px 6px 30px;">
                                </div>
                              </div>`;

content = content.replace(regexLogSearch, newLogSearch);

fs.writeFileSync(path, content, 'utf8');
console.log("Updated index.html with multiple fields");