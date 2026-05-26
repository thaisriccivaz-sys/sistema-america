const fs = require('fs');
const content = fs.readFileSync('backend/server.js', 'utf8');

const marker = '};\r\n\r\nconst db = require(';
const idx = content.indexOf(marker);
if (idx === -1) {
    // Try LF version
    const markerLF = '};\n\nconst db = require(';
    const idxLF = content.indexOf(markerLF);
    if (idxLF === -1) { console.log('NOT FOUND'); process.exit(1); }
    console.log('Found LF version at', idxLF);
    process.exit(0);
}

const helperLines = [
    '',
    '// \u2500\u2500 Transporter global + helper anti-spam \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
    '// Injeta headers que reduzem chance de cair em spam em todos os envios.',
    'const _globalTransporter = nodemailer.createTransport(SMTP_CONFIG);',
    'async function sendMailHelper(opts) {',
    '    return _globalTransporter.sendMail({',
    '        ...opts,',
    '        from: opts.from || \'"America Rental" <americasistema48@gmail.com>\',',
    '        replyTo: opts.replyTo || \'americasistema48@gmail.com\',',
    '        headers: {',
    "            'X-Mailer': 'America-Rental-ERP/1.0',",
    "            'X-Priority': '3',",
    "            'Precedence': 'bulk',",
    "            'List-Unsubscribe': '<mailto:americasistema48@gmail.com?subject=Cancelar>',",
    '            ...(opts.headers || {})',
    '        }',
    '    });',
    '}',
    ''
].join('\r\n');

// Insert after "};\r\n" (closing brace of SMTP_CONFIG)
const insertPoint = idx + '};\r\n'.length;
const newContent = content.slice(0, insertPoint) + helperLines + content.slice(insertPoint);
fs.writeFileSync('backend/server.js', newContent, 'utf8');
console.log('OK - inserted', helperLines.length, 'chars at position', insertPoint);
