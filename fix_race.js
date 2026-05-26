const fs = require('fs');
const path = 'backend/server.js';
let content = fs.readFileSync(path, 'utf8');

const target = /db\.serialize\(\(\) => \{\s*const columns = \[\s*"ALTER TABLE credenciamentos ADD COLUMN licencas_ids TEXT;",/m;

const replacement = `setTimeout(() => {
db.serialize(() => {
    const columns = [
        "ALTER TABLE credenciamentos ADD COLUMN os TEXT DEFAULT '';",
        "ALTER TABLE credenciamentos ADD COLUMN observacoes TEXT DEFAULT '';",
        "ALTER TABLE credenciamentos ADD COLUMN licencas_ids TEXT;",`;

if (content.match(target)) {
    content = content.replace(target, replacement);
    // Add the closing braces for setTimeout at the end of the block
    const targetEnd = /columns\.forEach\(query => \{\s*db\.run\(query, \(err\) => \{\s*if \(err\) \{\s*\/\/ Ignore duplicate column errors\s*\}\s*\}\);\s*\}\);\s*\}\);/m;
    const replacementEnd = `columns.forEach(query => {
        db.run(query, (err) => {
            if (err) {
                // Ignore duplicate column errors
            }
        });
    });
});
}, 3000);`;
    content = content.replace(targetEnd, replacementEnd);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Fixed server.js ALTER TABLE race condition");
} else {
    console.log("Regex not matched in server.js!");
}