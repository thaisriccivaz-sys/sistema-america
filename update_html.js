const fs = require('fs');

let path = 'frontend/index.html';
let content = fs.readFileSync(path, 'utf8');

// 1. Comercial search field
const comSearch = `<div style="position:relative;">
                                    <i class="ph ph-magnifying-glass" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8;"></i>
                                    <input type="text" id="filtro-pesquisa-com-cred" class="form-control" placeholder="Buscar OS, cliente ou e-mail..." onkeyup="window.filtrarHistoricoComCred()" style="width: 300px; padding: 6px 12px 6px 30px;">
                                </div>`;

const newComSearch = `<div style="display:flex; gap:10px;">
                                <div style="position:relative;">
                                    <i class="ph ph-hash" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8;"></i>
                                    <input type="text" id="filtro-pesquisa-os-com-cred" class="form-control" placeholder="Nº da OS" onkeyup="window.filtrarHistoricoComCred()" style="width: 120px; padding: 6px 12px 6px 30px;">
                                </div>
                                <div style="position:relative;">
                                    <i class="ph ph-magnifying-glass" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8;"></i>
                                    <input type="text" id="filtro-pesquisa-com-cred" class="form-control" placeholder="Buscar cliente ou e-mail..." onkeyup="window.filtrarHistoricoComCred()" style="width: 250px; padding: 6px 12px 6px 30px;">
                                </div>
                              </div>`;

content = content.replace(comSearch, newComSearch);

// 2. Logistica search field
const logSearch = `<div style="position:relative;">
                                    <i class="ph ph-magnifying-glass" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8;"></i>
                                    <input type="text" id="filtro-pesquisa-cred" class="form-control" placeholder="Buscar OS, cliente, e-mail..." onkeyup="window.filtrarHistoricoCred()" style="width: 300px; padding: 6px 12px 6px 30px;">
                                </div>`;

const newLogSearch = `<div style="display:flex; gap:10px;">
                                <div style="position:relative;">
                                    <i class="ph ph-hash" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8;"></i>
                                    <input type="text" id="filtro-pesquisa-os-cred" class="form-control" placeholder="Nº da OS" onkeyup="window.filtrarHistoricoCred()" style="width: 120px; padding: 6px 12px 6px 30px;">
                                </div>
                                <div style="position:relative;">
                                    <i class="ph ph-magnifying-glass" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8;"></i>
                                    <input type="text" id="filtro-pesquisa-cred" class="form-control" placeholder="Buscar cliente ou e-mail..." onkeyup="window.filtrarHistoricoCred()" style="width: 250px; padding: 6px 12px 6px 30px;">
                                </div>
                              </div>`;

content = content.replace(logSearch, newLogSearch);

fs.writeFileSync(path, content, 'utf8');
console.log("Updated index.html with OS specific search fields");