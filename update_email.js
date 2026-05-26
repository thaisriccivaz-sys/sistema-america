const fs = require('fs');
let serverPath = 'backend/server.js';
let serverJs = fs.readFileSync(serverPath, 'utf8');

const oldCode = `transportermultas.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error('Erro ao enviar e-mail de credenciamento:', error);
                        // don't block response
                    } else {
                        console.log('E-mail de credenciamento enviado:', info.response);
                    }
                });

                res.json({ message: 'E-mail de credenciamento enviado com sucesso.', link });`;

const newCode = `sendMailHelper(mailOptions).then(() => {
                    console.log('E-mail de credenciamento enviado com sucesso.');
                }).catch(error => {
                    console.error('Erro ao enviar e-mail de credenciamento:', error.message);
                });

                res.json({ message: 'E-mail de credenciamento enviado com sucesso.', link });`;

serverJs = serverJs.replace(oldCode, newCode);
fs.writeFileSync(serverPath, serverJs, 'utf8');
console.log("Updated server.js to use sendMailHelper instead of undefined transportermultas");