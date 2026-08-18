const fs = require('fs');
let s = fs.readFileSync('backend/server.js', 'utf8');
s = s.replace("require('./routes_candidatos_teste')(app, db, authenticateToken, r2, multerMemoryCandidatos);", "require('./routes_candidatos_teste')(app, db, authenticateToken, r2, multerMemoryCandidatos, sendEmailParaNotificados);");
fs.writeFileSync('backend/server.js', s, 'utf8');

let c = fs.readFileSync('backend/routes_candidatos_teste.js', 'utf8');
c = c.replace("module.exports = function registerCandidatosTesteRoutes(app, db, authenticateToken, r2Module, multerMemory) {", "module.exports = function registerCandidatosTesteRoutes(app, db, authenticateToken, r2Module, multerMemory, sendEmailParaNotificados) {");
fs.writeFileSync('backend/routes_candidatos_teste.js', c, 'utf8');
console.log('Modified requires to pass email function');
