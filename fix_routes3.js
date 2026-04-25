const fs = require('fs');
const js = require('child_process').execSync('git show 30cee0b:backend/server.js').toString();

const infoIdx = js.indexOf('// Rota para obter INFO de um documento');
const viewIdx = js.indexOf('app.get(\'/api/documentos/view/:id\'');

const endRouterIdx = js.indexOf('// ============================================\n// ROTAS DE APOIO');
const endRouterIdx2 = js.indexOf('// ============================================\r\n// ROTAS DE APOIO');

const endIdx = endRouterIdx > -1 ? endRouterIdx : (endRouterIdx2 > -1 ? endRouterIdx2 : -1);

if (infoIdx > -1 && endIdx > -1) {
    const chunk = js.substring(infoIdx, endIdx);
    
    let cur = fs.readFileSync('backend/server.js', 'utf8');
    const curEndIdx = cur.indexOf('// ============================================\n// ROTAS DE APOIO') > -1 ? cur.indexOf('// ============================================\n// ROTAS DE APOIO') : cur.indexOf('// ============================================\r\n// ROTAS DE APOIO');
    if(curEndIdx > -1) {
        fs.writeFileSync('backend/server.js', cur.substring(0, curEndIdx) + "\n\n" + chunk + "\n\n" + cur.substring(curEndIdx), 'utf8');
        console.log("Restored routes from 30cee0b");
    } else {
        console.log("Cannot find curEndIdx");
    }
} else {
    console.log("Cannot find chunk in git show:", infoIdx, endRouterIdx, endRouterIdx2);
}
