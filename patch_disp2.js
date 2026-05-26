const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const search = `                    const statusSistema = (c.status || '').toLowerCase();
                    if (statusSistema === 'férias' || statusSistema === 'ferias') {
                        status = 'ferias';
                        motivo = 'Em Férias (status cadastro)';
                    } else if (statusSistema === 'afastado') {
                        status = 'afastado';
                        motivo = 'Afastado (status cadastro)';
                    }

                    // Férias programadas por período
                    if (c.ferias_programadas_inicio && c.ferias_programadas_fim) {
                        if (data >= c.ferias_programadas_inicio && data <= c.ferias_programadas_fim) {
                            status = 'ferias';
                            motivo = 'Férias programadas';
                        }
                    }`;

const replace = `                    const statusSistema = (c.status || '').toLowerCase();
                    const hojeDate = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
                    const hojeStr = hojeDate.getFullYear() + '-' + String(hojeDate.getMonth() + 1).padStart(2, '0') + '-' + String(hojeDate.getDate()).padStart(2, '0');

                    if (statusSistema === 'férias' || statusSistema === 'ferias') {
                        if (c.ferias_programadas_fim && data > c.ferias_programadas_fim) {
                            // Data da rota é DEPOIS das férias, então está disponível
                        } else {
                            status = 'ferias';
                            motivo = 'Em Férias (status cadastro)';
                        }
                    } else if (statusSistema === 'afastado') {
                        if (data <= hojeStr) {
                            status = 'afastado';
                            motivo = 'Afastado (status cadastro)';
                        }
                    }

                    // Férias programadas por período
                    if (c.ferias_programadas_inicio && c.ferias_programadas_fim) {
                        if (data >= c.ferias_programadas_inicio && data <= c.ferias_programadas_fim) {
                            status = 'ferias';
                            motivo = 'Férias programadas';
                        }
                    }`;

code = code.replace(search, replace);
fs.writeFileSync('backend/server.js', code);
console.log('Feito');
