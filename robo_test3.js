const puppeteer = require('puppeteer');
(async () => {
    const cfg = { sigor_prod_cpf: '38058722839', sigor_prod_senha: 'gb5ti5' };
    try {
        const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']});
        const page = await browser.newPage();
        await page.goto('https://mtr.cetesb.sp.gov.br/', {waitUntil: 'networkidle2'});
        
        await page.evaluate(() => {
            const radios = document.querySelectorAll('input[type="radio"]');
            if(radios.length > 1) radios[1].click();
        });
        
        await page.waitForTimeout(500);
        
        await page.type('input[formcontrolname="login"]', cfg.sigor_prod_cpf);
        await page.type('input[formcontrolname="senha"]', cfg.sigor_prod_senha);
        
        await page.click('button[color="primary"]');
        
        await page.waitForTimeout(5000);
        
        const url = page.url();
        console.log('URL pos clique:', url);
        await page.screenshot({path: 'sigor_teste.png'});
        
        await browser.close();
    } catch(e) {
        console.log('Erro:', e.message);
    }
})();
