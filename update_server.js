const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'backend', 'server.js');
let code = fs.readFileSync(file, 'utf8');

function doReplace(find, replace, name) {
    if (code.includes(find)) {
        code = code.replace(find, replace);
        console.log("Success replacing", name);
    } else {
        const altFind = find.replace(/\\n/g, '\\r\\n');
        if (code.includes(altFind)) {
            code = code.replace(altFind, replace);
            console.log("Success replacing (with \\r\\n)", name);
        } else {
            console.log("FAILED to find:", name);
        }
    }
}

doReplace(
    "contactEmail: r.contact_email, typeKey: r.type_key, nextSteps: r.next_steps,",
    "contactEmail: r.contact_email, typeKey: r.type_key, nextSteps: r.next_steps, isUrgent: r.is_urgent === 1,",
    "Fix 1: GET"
);

doReplace(
    "contact_name, contact_phone, contact_email, channel, type_key, occurrences,",
    "contact_name, contact_phone, contact_email, channel, type_key, is_urgent, occurrences,",
    "Fix 2a: INSERT columns"
);

doReplace(
    "    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,",
    "    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,",
    "Fix 2b: INSERT placeholders"
);

doReplace(
    "        t.contactName, t.contactPhone, t.contactEmail, t.channel, t.typeKey, JSON.stringify(t.occurrences||[]),",
    "        t.contactName, t.contactPhone, t.contactEmail, t.channel, t.typeKey, t.isUrgent ? 1 : 0, JSON.stringify(t.occurrences||[]),",
    "Fix 2c: INSERT values"
);

doReplace(
    "        checklist = ?, logistics_task = ?, commercial_task = ?, financial_task = ?, updated_at = CURRENT_TIMESTAMP",
    "        checklist = ?, logistics_task = ?, commercial_task = ?, financial_task = ?, is_urgent = ?, updated_at = CURRENT_TIMESTAMP",
    "Fix 3a: UPDATE columns"
);

doReplace(
    "        JSON.stringify(t.commercialTask||null), JSON.stringify(t.financialTask||null), req.params.id",
    "        JSON.stringify(t.commercialTask||null), JSON.stringify(t.financialTask||null), t.isUrgent ? 1 : 0, req.params.id",
    "Fix 3b: UPDATE values"
);

fs.writeFileSync(file, code);
console.log("Finished script!");