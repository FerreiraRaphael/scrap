const puppeteer = require('puppeteer');
const path = require('path');
// const downloadPath = path.resolve('./download');
(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    // args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
    page.on('request', request => {
      console.log('GOT NEW REQUEST', request.url());
      const headers = Object.assign({}, request.headers(), {
        // foo: 'bar'
      });
      request.continue({ headers });
  });

  page.on('response', response => {
      console.log('GOT NEW RESPONSE', response.status(), response.headers());
  });
  await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36");
  await page.goto('https://agenciaweb.celesc.com.br/AgenciaWeb/autenticar/loginCliente.do');

  await page.type(':nth-child(3) > input', '43999010');
  await page.type(':nth-child(11) > :nth-child(1)', '01385722088');
  await Promise.all([page.click('.divBotoes > :nth-child(1)'), page.waitForNavigation()]);
  await page.type(':nth-child(6) > .colDir40 > input', 'nati02');
  await Promise.all([page.click(':nth-child(6) > .divBotoes > .botao'), page.waitForNavigation()]);

  // await Promise.race([
  //   page.waitForNavigation({waitUntil: 'domcontentloaded'}),
  //   page.waitForNavigation({waitUntil: 'load'})
  // ]);
  await page.click('.textoOpcoesTabela > a');
  await page.waitFor(5000);
  // await page._client.send('Page.setDownloadBehavior', {
  //   behavior: 'allow',
  //   downloadPath: downloadPath
  // });
  await page.screenshot({ path: 'example.png' });
  // page.url();
  // window
  // await page.pdf({ path: 'hn.pdf', format: 'a4' });
  await browser.close();
})();


// const puppeteer = require('puppeteer');
//     const path = require('path');
//     const downloadPath = path.resolve('./download');
//     async function simplefileDownload() {
//         const browser = await puppeteer.launch({
//             headless: false
//         });

//         const page = await browser.newPage();
//         await page.goto(
//             'https://unsplash.com/photos/tn57JI3CewI',
//             { waitUntil: 'networkidle2' }
//         );

//         await page._client.send('Page.setDownloadBehavior', {
//           behavior: 'allow',
//           downloadPath: downloadPath
//         });
//         await page.click('#app > div > div:nth-child(3) > div > div:nth-child(1) > div.KeJv5.voTTC > header > div.EdCFo > div.IDBf5.ckD_t.i8_xY > div > a ')
//     }
//     simplefileDownload();


// async function downloadPDF(pdfURL, outputFilename) {
//     let pdfBuffer = await request.get({uri: pdfURL, encoding: null});
//     console.log("Writing downloaded PDF file to " + outputFilename + "...");
//     fs.writeFileSync(outputFilename, pdfBuffer);
// }

// const path = require('path')
// var filePath = path.join(__dirname, 'SegundaViaFatura.pdf')
// var extract = require('pdf-text-extract')
// console.log('que saco')
// extract(filePath, function (err, text) {
//   console.log('triste', err)
//   if (err) {
//     console.log(err)
//     return
//   }
//   console.log(text)
// })
