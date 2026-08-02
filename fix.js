const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

code = code.replace(
  'const validas = osList.filter(o => !_sacIsOSTipoExcluido(o.tipo_servico));\n      if (!validas.length) { _wiz._osLinked = false; _wiz._protocolLocked = false; renderWizard(); return; }',
  'if (!osList.length) { _wiz._osLinked = false; _wiz._protocolLocked = false; renderWizard(); return; }'
);
code = code.replace(
  'const validas = osList.filter(o => !_sacIsOSTipoExcluido(o.tipo_servico));\r\n      if (!validas.length) { _wiz._osLinked = false; _wiz._protocolLocked = false; renderWizard(); return; }',
  'if (!osList.length) { _wiz._osLinked = false; _wiz._protocolLocked = false; renderWizard(); return; }'
);

code = code.replace('const clienteNome = validas[0].cliente || \'\';', 'const clienteNome = osList[0].cliente || \'\';');
code = code.replace('const todosEnderecos = validas.map(o =>', 'const todosEnderecos = osList.map(o =>');

code = code.replace(
  'const os = validas.find(o => [o.endereco, o.complemento].filter(Boolean).join(\', \') === enderecoFinal) || validas[0];',
  'const osDoEndereco = osList.filter(o => [o.endereco, o.complemento].filter(Boolean).join(\', \') === enderecoFinal);\n      const os = osDoEndereco[0] || osList[0];'
);

code = code.replace('const todosProds = validas.flatMap(o =>', 'const todosProds = osDoEndereco.flatMap(o =>');

code = code.replace('_wiz.address    = enderCalc;', '_wiz.address    = enderecoFinal;');

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('Done!');
