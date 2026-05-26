const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const regex = /\/\/\s*Status do sistema \(Férias, Afastado no campo status\)[\s\S]*?\/\/\s*Férias programadas por período\s*if\s*\(c\.ferias_programadas_inicio\s*&&\s*c\.ferias_programadas_fim\)\s*\{\s*if\s*\(data\s*>=\s*c\.ferias_programadas_inicio\s*&&\s*data\s*<=\s*c\.ferias_programadas_fim\)\s*\{\s*status\s*=\s*'ferias';\s*motivo\s*=\s*'Férias programadas';\s*\}\s*\}/;

const replace = `// Status do sistema (Férias, Afastado no campo status)
                    const statusSistema = (c.status || '').toLowerCase();
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

if (regex.test(code)) {
    code = code.replace(regex, replace);
    fs.writeFileSync('backend/server.js', code);
    console.log('REGEX OK!');
} else {
    console.log('REGEX FALHOU');
}
