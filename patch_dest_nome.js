const fs = require('fs');
let serverJs = fs.readFileSync('backend/server.js', 'utf8');

const regexInsert = /JSON\.stringify\(data\), complementarDeId \|\| null\],/g;
if(serverJs.match(regexInsert)) {
    serverJs = serverJs.replace(regexInsert, "JSON.stringify({ ...data, _destinadorNome: req.body.destinadorNome || 'BRK AMBIENTAL - MAUÁ S.A.' }), complementarDeId || null],");
    fs.writeFileSync('backend/server.js', serverJs);
    console.log('SERVER INJECTED DESTINADOR');
} else {
    console.log('REGEX DID NOT MATCH SERVER');
}

let mtrJs = fs.readFileSync('frontend/mtr.js', 'utf8');
const oldTrHtml = `    let dStr = destNome;
    if(dStr.length > 15) dStr = dStr.substring(0, 15) + '...';`;

const newTrHtml = `    let dStr = p._destinadorNome || destNome;
    if(!dStr || dStr === '-') dStr = 'BRK AMBIENTAL - MAUÁ S.A.';
    if(dStr.length > 15) dStr = dStr.substring(0, 15) + '...';`;

if(mtrJs.includes(oldTrHtml)) {
    mtrJs = mtrJs.replace(oldTrHtml, newTrHtml);
    fs.writeFileSync('frontend/mtr.js', mtrJs);
    console.log('MTR JS INJECTED DESTINADOR');
} else {
    console.log('MTR JS OLD TR NOT FOUND');
}
