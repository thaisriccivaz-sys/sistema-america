const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'backend', 'database.js');
let code = fs.readFileSync(file, 'utf8');

const backtick = String.fromCharCode(96);

const search = [
    "                    cost_centers TEXT,",
    "                    attachments TEXT,",
    "                    checklist TEXT,",
    "                    logistics_task TEXT,",
    "                    commercial_task TEXT,",
    "                    financial_task TEXT,",
    "                    db.run(\"ALTER TABLE sac_tickets ADD COLUMN is_urgent INTEGER DEFAULT 0\", () => {});",
    "                }",
    "            });",
    "                    checklist TEXT,",
    "                    logistics_task TEXT,",
    "                    commercial_task TEXT,",
    "                    financial_task TEXT,",
    "                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,",
    "                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP",
    "                )",
    "            " + backtick + ", (err) => {",
    "                if (!err) console.log('[SAC] Tabela sac_tickets OK.');",
    "            });"
].join('\n');

const replacement = [
    "                    cost_centers TEXT,",
    "                    attachments TEXT,",
    "                    checklist TEXT,",
    "                    logistics_task TEXT,",
    "                    commercial_task TEXT,",
    "                    financial_task TEXT,",
    "                    open_date DATETIME DEFAULT CURRENT_TIMESTAMP,",
    "                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,",
    "                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP",
    "                )",
    "            " + backtick + ", (err) => {",
    "                if (!err) {",
    "                    console.log('[SAC] Tabela sac_tickets OK.');",
    "                    db.run(\"ALTER TABLE sac_tickets ADD COLUMN is_urgent INTEGER DEFAULT 0\", () => {});",
    "                }",
    "            });"
].join('\n');

code = code.replace(search, replacement);
// Also fix line ending variations just in case
code = code.replace(search.replace(/\\n/g, '\\r\\n'), replacement);

fs.writeFileSync(file, code);
console.log("Replaced successfully!");