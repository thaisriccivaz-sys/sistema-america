const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const oldQuery = `        WHERE LOWER(TRIM(u.username)) = LOWER(TRIM(?)) AND u.ativo = 1\r\n        LIMIT 1\r\n    \`, [assignedUsername], async (err, user) => {`;
const newQuery = `        WHERE (LOWER(TRIM(u.username)) = LOWER(TRIM(?)) OR LOWER(TRIM(u.nome)) = LOWER(TRIM(?)) OR LOWER(TRIM(REPLACE(u.nome, ' ', '.'))) = LOWER(TRIM(?))) AND u.ativo = 1\r\n        LIMIT 1\r\n    \`, [assignedUsername, assignedUserNome || assignedUsername, assignedUsername], async (err, user) => {`;

const oldQueryLF = `        WHERE LOWER(TRIM(u.username)) = LOWER(TRIM(?)) AND u.ativo = 1\n        LIMIT 1\n    \`, [assignedUsername], async (err, user) => {`;
const newQueryLF = `        WHERE (LOWER(TRIM(u.username)) = LOWER(TRIM(?)) OR LOWER(TRIM(u.nome)) = LOWER(TRIM(?)) OR LOWER(TRIM(REPLACE(u.nome, ' ', '.'))) = LOWER(TRIM(?))) AND u.ativo = 1\n        LIMIT 1\n    \`, [assignedUsername, assignedUserNome || assignedUsername, assignedUsername], async (err, user) => {`;

if (code.includes(oldQuery)) {
    code = code.replace(oldQuery, newQuery);
    fs.writeFileSync('backend/server.js', code);
    console.log('Fixed query successfully (CRLF)');
} else if (code.includes(oldQueryLF)) {
    code = code.replace(oldQueryLF, newQueryLF);
    fs.writeFileSync('backend/server.js', code);
    console.log('Fixed query successfully (LF)');
} else {
    console.log('Could not find the target code');
}
