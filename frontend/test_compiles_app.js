const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');
try {
    new Function(content);
    console.log("No syntax errors");
} catch(e) {
    console.log("Syntax error:", e);
}
