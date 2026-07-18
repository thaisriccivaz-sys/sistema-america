const rhid = require('./routes/controlid.js');
async function run() {
    try {
        const pts = await rhid.getApontamentos(null, "2026-05-01", "2026-05-31");
        const luis = pts.find(p => p.name.includes("Henrique") || (p.matricula && p.matricula.includes("138")));
        if (luis) {
            const dia = luis.apuracao.find(d => d.dateTimeStr.startsWith("20260502"));
            console.log(JSON.stringify(dia, null, 2));
        } else {
            console.log("Luis not found");
        }
    } catch(e) { console.error(e); }
}
run();
