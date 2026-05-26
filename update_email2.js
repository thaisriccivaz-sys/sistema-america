const fs = require('fs');
let serverPath = 'backend/server.js';
let serverJs = fs.readFileSync(serverPath, 'utf8');

const oldCode = `transportermultas.sendMail`;
const replacement = `sendMailHelper`;

if (serverJs.includes(oldCode)) {
    serverJs = serverJs.replace(/transportermultas\.sendMail\(mailOptions, \(error, info\) => \{[\s\S]*?\}\);/g, `sendMailHelper(mailOptions).then(() => {
                    console.log('E-mail de credenciamento enviado com sucesso.');
                }).catch(error => {
                    console.error('Erro ao enviar e-mail de credenciamento:', error.message);
                });`);
    fs.writeFileSync(serverPath, serverJs, 'utf8');
    console.log("Updated transportermultas to sendMailHelper");
} else {
    console.log("Could not find transportermultas.sendMail");
}