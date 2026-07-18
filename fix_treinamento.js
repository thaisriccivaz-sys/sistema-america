const fs = require('fs');
let code = fs.readFileSync('frontend/treinamento_presenca.js', 'utf8');

// Add _filtroTipoDepto variable
code = code.replace(/let _filtroDepto = '';/, "let _filtroDepto = '';\n    let _filtroTipoDepto = '';");

// Add filtrarPresencaTipoDepto
code = code.replace(/window\.filtrarPresencaDepto = function \(val\) {/, "window.filtrarPresencaTipoDepto = function (val) {\n        _filtroTipoDepto = val;\n        renderizar();\n    };\n    window.filtrarPresencaDepto = function (val) {");

// Update renderizar filter
code = code.replace(/const depto = _filtroDepto;/, "const depto = _filtroDepto;\n        const tipoDepto = _filtroTipoDepto;");
code = code.replace(/if \(depto\) lista = lista\.filter\(c => c\.departamento === depto\);/, "if (depto) lista = lista.filter(c => c.departamento === depto);\n        if (tipoDepto) lista = lista.filter(c => c.departamento_tipo === tipoDepto);");

// Update title
code = code.replace(/if \(h1\) h1\.textContent = 'Terapia - Presença';/g, "if (h1) h1.textContent = 'Palestras listas';");

fs.writeFileSync('frontend/treinamento_presenca.js', code);
console.log('Fixed treinamento_presenca.js');
