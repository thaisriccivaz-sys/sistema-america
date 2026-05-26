const sqlite3 = require('sqlite3');
const puppeteer = require('puppeteer');

const db = new sqlite3.Database('./backend/data/hr_system_v2.sqlite');
db.all("SELECT chave, valor FROM config_sistema WHERE chave IN ('sigor_prod_cpf', 'sigor_prod_senha')", async (err, rows) => {
    if (err) return console.error(err);
    const cfg = {};
    rows.forEach(r => cfg[r.chave] = r.valor);
    
    if(!cfg.sigor_prod_cpf || !cfg.sigor_prod_senha) {
        console.log('Credenciais ausentes no banco.');
        return;
    }
    
    console.log('Iniciando Puppeteer...');
    try {
        const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']});
        const page = await browser.newPage();
        await page.goto('https://mtr.cetesb.sp.gov.br/', {waitUntil: 'networkidle2'});
        
        // Select 'Empreendimento' radio button (assuming it's the second one or by ID)
        await page.evaluate(() => {
            const radios = document.querySelectorAll('input[type="radio"]');
            if(radios.length > 1) radios[1].click();
        });
        
        await page.waitForTimeout(500);
        
        // Type credentials
        await page.type('input[formcontrolname="login"]', cfg.sigor_prod_cpf);
        await page.type('input[formcontrolname="senha"]', cfg.sigor_prod_senha);
        
        // Click Enter
        await page.click('button[color="primary"]');
        
        // Wait for login to complete (wait for URL change or some element)
        await page.waitForNavigation({waitUntil: 'networkidle2'});
        
        const url = page.url();
        console.log('Logado com sucesso. URL:', url);
        
        // Take a screenshot to see what it looks like
        await page.screenshot({path: 'sigor_logged_in.png'});
        
        await browser.close();
    } catch(e) {
        console.log('Erro no puppeteer:', e.message);
    }
});
