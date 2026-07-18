const fs = require('fs');

let serverCode = fs.readFileSync('backend/server.js', 'utf8');

if (!serverCode.includes("require('./rescue_estoque')")) {
    // Add to the end
    serverCode += "\n\ntry { require('../rescue_estoque.js'); } catch(e) { console.error('Rescue script error:', e); }\n";
    fs.writeFileSync('backend/server.js', serverCode, 'utf8');
    console.log("Added require to server.js");
}
