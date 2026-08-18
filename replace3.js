const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// Also fix _sacBuscarOSLogistica manually
code = code.replace(
    /const _clienteLimpo = clienteNome\.replace\(\/\^\[\\\\s\\\\S\]\*\?\(\[A-Z\\u00C0-\\u024F\]\)\/u, '\\$1'\)\.trim\(\);/g,
    'const _clienteLimpo = window._stripEmojis(clienteNome);'
);

code = code.replace(
    /const _clienteLimpo = clienteNome\.replace\(\/\^\[\\s\\S\]\*\?\(\[A-Z\\u00C0-\\u024F\]\)\/u, '\\$1'\)\.trim\(\);/g,
    'const _clienteLimpo = window._stripEmojis(clienteNome);'
);

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('Done 3');
