const fs = require('fs');
let sv = fs.readFileSync('backend/server.js', 'utf8');

// Replace the simple licencas return with one that looks up file_name from DB
const oldLicencas = `                licencas: (() => { try { return JSON.parse(cred.licencas_ids || '[]'); } catch(e) { return []; } })()\r\n            });\r\n        });\r\n    });\r\n});`;

const newLicencas = `                licencas: [] // preenchido abaixo
            });
        }).then(async () => {}).catch(() => {});
        }).catch(() => {});
    });
});`; // placeholder — we'll do it differently

// Actually, let's use a cleaner approach: enrich licencas after parsing
// Find the licencas line and replace with a DB lookup
const oldReturn = `                licencas: (() => { try { return JSON.parse(cred.licencas_ids || '[]'); } catch(e) { return []; } })()\r\n            });\r\n        });\r\n    });\r\n});`;

if (!sv.includes(oldReturn)) {
    // try LF
    const oldReturnLF = oldReturn.replace(/\r\n/g, '\n');
    if (!sv.includes(oldReturnLF)) {
        console.log('Pattern not found, checking exact content...');
        const idx = sv.indexOf('licencas: (() =>');
        console.log('licencas line at char:', idx, JSON.stringify(sv.substring(idx, idx+150)));
        process.exit(1);
    }
}
console.log('[OK] Found licencas return line');

// Better approach: patch the Promise.all callback to also enrich licencas
const oldPromiseAll = `        Promise.all([colabDocsPromise, veicDocsPromise]).then(([docs, frotas]) => {`;
const newPromiseAll = `        // Also fetch licencas file info from DB
        let licencasRaw = [];
        try { licencasRaw = JSON.parse(cred.licencas_ids || '[]'); } catch(e) {}
        const licencaIds = licencasRaw.map(l => l.id).filter(Boolean);
        const licencasDbPromise = new Promise((resolve) => {
            if (licencaIds.length === 0) return resolve([]);
            const ph = licencaIds.map(() => '?').join(',');
            db.all(\`SELECT id, file_name FROM licencas WHERE id IN (\${ph})\`, licencaIds, (err, rows) => resolve(rows || []));
        });

        Promise.all([colabDocsPromise, veicDocsPromise, licencasDbPromise]).then(([docs, frotas, licencasDb]) => {`;

if (!sv.includes(oldPromiseAll)) {
    console.log('ERROR: Promise.all line not found'); process.exit(1);
}
sv = sv.replace(oldPromiseAll, newPromiseAll);
console.log('[OK] Patched Promise.all to include licencasDb');

// Now fix the licencas return to use enriched data
const oldLicRet = `                licencas: (() => { try { return JSON.parse(cred.licencas_ids || '[]'); } catch(e) { return []; } })()`;
const newLicRet = `                licencas: licencasRaw.map(l => {
                    const dbRow = licencasDb.find(r => String(r.id) === String(l.id));
                    return { ...l, file_name: dbRow ? dbRow.file_name : null };
                })`;

sv = sv.replace(oldLicRet, newLicRet);
console.log('[OK] Patched licencas return with file_name');

fs.writeFileSync('backend/server.js', sv, 'utf8');
console.log('Done');
