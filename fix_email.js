const fs = require('fs');
const file = 'backend/server.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /foi registrada pelo departamento <strong>Comercial<\/strong> e aguarda/g;
if (regex.test(content)) {
    content = content.replace(regex, "foi registrada por <strong>${req.user ? req.user.username : 'Comercial'}</strong> e aguarda");
    fs.writeFileSync(file, content, 'utf8');
    console.log("Replaced email template successfully!");
} else {
    console.log("Regex not found!");
}