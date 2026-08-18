const fs = require('fs');
const file = 'frontend/testes_candidatos.js';
let content = fs.readFileSync(file, 'utf8');

// 1. _tcUpDoc
content = content.replace('window._tcFecharModal(); await _load(); _render();\n        Swal.fire({icon:"success",title:"Documento enviado!"', 'await _load(); _render(); window._tcDetalhes(id);\n        Swal.fire({icon:"success",title:"Documento enviado!"');

// 2. _tcEnvCom 
content = content.replace(/tc-com-\$\{id\}/g, 'tc-novo-coment-${id}');
content = content.replace(/window\._tcAddComent\(/g, 'window._tcEnvCom(');
content = content.replace('window._tcFecharModal(); await _load(); _render(); window._tcDetalhes(id);\n    };', 'await _load(); _render(); window._tcDetalhes(id);\n    };');

// 3. Badges function
const newBadgeStr = '${c.tipo === "Ajudante" ? "🪣 Ajudante" : (c.tipo === "Motorista B" ? "🛻 Motorista B" : (c.tipo === "Motorista D" ? "🚚 Motorista D" : "🚚 Motorista"))}';
content = content.replace(/<span style="font-size:0\.68rem;font-weight:700;color:\$\{ct\};background:\$\{ct\}18;border-radius:99px;padding:1px 6px;">.*?<\/span>/g, '<span style="font-size:0.68rem;font-weight:700;color:${ct};background:${ct}18;border-radius:99px;padding:1px 6px;">' + newBadgeStr + '</span>');
content = content.replace(/<span style="background:#fff3;color:#fff;border-radius:99px;padding:3px 12px;font-size:0\.75rem;font-weight:700;">.*?<\/span>/g, '<span style="background:#fff3;color:#fff;border-radius:99px;padding:3px 12px;font-size:0.75rem;font-weight:700;">' + newBadgeStr + '</span>');

// 4. Columns
content = content.replace(/icone: "ph-number-one"/g, 'icone: "ph-file-text"');
content = content.replace(/icone: "ph-number-two"/g, 'icone: "ph-file-text"');

// 5. Documento
content = content.replace('Documento (\\)', 'Documento');
content = content.replace('Documento ()', 'Documento');

// 6. ct colors
content = content.replace(/const ct = c\.tipo==="Motorista"\?"#2563eb":"#d97706";/g, 'const ct = (c.tipo||"").includes("Motorista")?"#2563eb":"#d97706";');
content = content.replace(/const ct = c\.tipo === "Motorista" \? "#2563eb" : "#d97706";/g, 'const ct = (c.tipo||"").includes("Motorista") ? "#2563eb" : "#d97706";');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed all remaining issues');
