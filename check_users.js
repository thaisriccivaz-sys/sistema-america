const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const target = "app.delete('/api/usuarios/:id'";
const idx = js.indexOf(target);
if (idx !== -1) {
    console.log(js.substring(Math.max(0, idx - 800), idx + 200));
}
