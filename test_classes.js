const fetch = require('node-fetch');

async function run() {
    // Get all classes from homologation
    const r2 = await fetch('https://mtrr-hom.cetesb.sp.gov.br/apiws/rest/gettoken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpfCnpj: '38058722839', senha: 'gb5ti5', unidade: '19201' })
    });
    const d2 = await r2.json();
    const tokenHom = d2.objetoResposta;
    
    const r = await fetch('https://mtrr-hom.cetesb.sp.gov.br/apiws/rest/retornaListaClasse', {
        headers: { 'Authorization': tokenHom, 'Content-Type': 'application/json' }
    });
    const data = await r.json();
    const classes = data.objetoResposta || [];
    console.log('ALL CLASSES:');
    classes.forEach(c => console.log(`  ${c.claCodigo}: ${c.claDescricao}`));
    console.log('\nClasse II A code:', classes.find(c => c.claDescricao && c.claDescricao.includes('II A'))?.claCodigo);
}
run().catch(console.error);
