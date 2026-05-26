const fs = require('fs');
let content = fs.readFileSync('frontend/pipeline.js', 'utf8');
content = content.replace(
    /let endFull = \[os\.endereco, os\.complemento, os\.cep \? `CEP: \$\{os\.cep\}` : ''\]\.filter\(Boolean\)\.join\(\', \'\);\r?\n\s*endFull = endFull\.replace\(\/S\[A\-Z+\]\\W\?O PAULO\/gi, \'SO PAULO\'\).*;/gi,
    "let endFull = [os.endereco, os.complemento, os.cep ? `CEP: ${os.cep}` : ''].filter(Boolean).join(', ');\n    endFull = endFull.replace(/S[A-Zцаюбд]\\W?O PAULO/gi, 'SцO PAULO').replace(/S[A-Zцаюбд]\\W?O BERNARDO/gi, 'SцO BERNARDO').replace(/S[A-Zцаюбд]\\W?O CAETANO/gi, 'SцO CAETANO').replace(/S[A-Zцаюбд]\\W?O LOUREN/gi, 'SцO LOUREN').replace(/Sц[^A-Z]?O\\b/gi, 'SцO');"
);
fs.writeFileSync('frontend/pipeline.js', content, 'utf8');
