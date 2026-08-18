const fs = require('fs');
let c = fs.readFileSync('frontend/testes_candidatos.js', 'utf8');
c = c.replace("    });\r\n    }", "    }");
c = c.replace("    });\n    }", "    }");
fs.writeFileSync('frontend/testes_candidatos.js', c, 'utf8');
