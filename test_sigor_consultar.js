const fetch = require('node-fetch');
const token = 'not-important';
const urls = [
  { p: '/retornaManifesto/260011827085', m: 'GET' },
  { p: '/consultarManifesto/260011827085', m: 'GET' },
  { p: '/manifesto/260011827085', m: 'GET' },
  { p: '/retornaManifestos', m: 'POST', b: { numeroManifesto: "260011827085" } },
  { p: '/consultarManifestoLote', m: 'POST', b: ["260011827085"] }
];

(async () => {
  for (const u of urls) {
    try {
        const r = await fetch('https://mtr.cetesb.sp.gov.br/apiws/manifesto' + u.p, {
            method: u.m, headers: {'Authorization': token, 'Content-Type': 'application/json'},
            body: u.b ? JSON.stringify(u.b) : undefined
        });
        console.log(u.m, u.p, r.status);
    } catch(e) {
        console.log(u.m, u.p, e.message);
    }
  }
})();
