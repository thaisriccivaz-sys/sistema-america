const axios = require('axios');
const cheerio = require('cheerio');

async function testCa() {
  try {
    const url = 'https://caepi.mte.gov.br/internet/ConsultaCAInternet.aspx';
    const initRes = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(initRes.data);
    const viewst = $('#__VIEWSTATE').val();
    const viewstgen = $('#__VIEWSTATEGENERATOR').val();
    const evval = $('#__EVENTVALIDATION').val();

    const params = new URLSearchParams();
    params.append('__EVENTTARGET', '');
    params.append('__EVENTARGUMENT', '');
    params.append('__VIEWSTATE', viewst);
    params.append('__VIEWSTATEGENERATOR', viewstgen);
    params.append('__EVENTVALIDATION', evval);
    params.append('ctl00$PlaceHolderMain$txtNumeroCA', '16311');
    params.append('ctl00$PlaceHolderMain$btnConsultar', 'Consultar');

    const postRes = await axios.post(url, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Cookie': initRes.headers['set-cookie'] ? initRes.headers['set-cookie'].join(';') : ''
      }
    });

    const $post = cheerio.load(postRes.data);
    let equipamento = $post('#PlaceHolderMain_lblEquipamentoVal').text();
    if (!equipamento) {
        equipamento = $post('.linhaDetalhe').find('span').filter((i, el) => $(el).text().includes('Equipamento')).next('span').text() || 'None';
    }
    console.log("Success! Found:");
    $post('span').each((i, el) => {
        if($(el).attr('id') && $(el).attr('id').includes('Equipamento')) console.log($(el).attr('id'), $(el).text());
        if($(el).text().includes('ÓCULOS')) console.log('OCULOS FOUND', $(el).parent().html());
    });
  } catch (e) {
    console.error(e.message);
  }
}
testCa();
