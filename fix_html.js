const fs = require('fs');
let code = fs.readFileSync('frontend/index.html', 'utf8');

const deprtHeader = '                                        <th onclick="window.sortTable(this)" style="cursor:pointer;white-space:nowrap;" title="Ordenar">Deprt. <i class="ph ph-arrows-down-up" style="font-size:0.8em;color:#94a3b8;margin-left:2px;"></i></th>\n';
code = code.replace(deprtHeader, '');

const motivoHeader = '                                        <th onclick="window.sortTable(this)" style="cursor:pointer;" title="Ordenar">Motivo <i class="ph ph-arrows-down-up" style="font-size:0.85em; color:#94a3b8; margin-left:4px;"></i></th>\n';
code = code.replace(motivoHeader, '');

// Also fix colspan from 7 to 6 in table-estoque
code = code.replace('<tbody id="table-estoque">\n                                    <tr><td colspan="7" style="text-align:center;color:#64748b;">Carregando...</td></tr>', '<tbody id="table-estoque">\n                                    <tr><td colspan="6" style="text-align:center;color:#64748b;">Carregando...</td></tr>');

// Also fix colspan in table-estoque-historico
code = code.replace('<tbody id="table-estoque-historico">\n                                    <tr><td colspan="7" style="text-align:center;color:#64748b;">Selecione um item</td></tr>', '<tbody id="table-estoque-historico">\n                                    <tr><td colspan="6" style="text-align:center;color:#64748b;">Selecione um item</td></tr>');

fs.writeFileSync('frontend/index.html', code, 'utf8');
console.log('Fixed headers in index.html');
