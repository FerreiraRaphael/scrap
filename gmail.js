const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { google } = require('googleapis');
const { getCodigoCliente, getCodigoBarras, getVencimento, getValorTotal } = require('./reademail');
const { download } = require('./download');
const { extractPdfText } = require('./extractPdfText');
const { extractImgFromPdf } = require('./extractImgFromPdf');
const { extractTextFromImg } = require('./extractTextFromImg');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

const withDir = (file) => path.resolve(__dirname, file);

// Load client secrets from a local file.
fs.readFile(withDir('credentials.json'), (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Gmail API.
  authorize(JSON.parse(content), listFaturaNet);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  console.log({ credentials })
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, async (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    try {
      await oAuth2Client.getAccessToken();
    } catch (e) {
      fs.rm(TOKEN_PATH, () => {
        getNewToken(oAuth2Client, callback)
      });
    }
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  console.log('here');
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) { return console.error('Error here?', err) };
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}


/**
 * Look for net fatura email.
 * @param {*} auth
 */
async function listFaturaNet(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  const { data: { messages } } = await gmail.users.messages.list({
    userId: 'me',
    q: 'from:faturadigital@minhaclaro.com.br subject:Sua fatura Claro Net por e-mail newer_than:1m',
  });
  // dia 29 a 28 talvez rodar primeiro dia do mês.

  if (messages.length) {
    await Promise.all(messages.map(async (message) => {
      const { data } = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
      });
      const { payload } = data;

      const content = Buffer.from(payload.parts[0].body.data, 'base64').toString('ascii');
      const contentWithoutBreaks = content.replace(/(\r\n|\n|\r)/gm, "");
      try {
        // const myCode = '088/624216460';
        // const codigoCliente = getCodigoCliente(contentWithoutBreaks);
        // if (codigoCliente !== myCode) return;
        console.log(
          getCodigoCliente(contentWithoutBreaks),
          getCodigoBarras(contentWithoutBreaks),
          getVencimento(contentWithoutBreaks),
          getValorTotal(contentWithoutBreaks),
          new Date(Number(data.internalDate)),
        );
      } catch (e) {
        console.log(e)
      }
    }));
  } else {
    console.log('No messages.');
  }
}

//financeiro2@santailha.com.br
// começa dia 1-3 e vai até dia 7-9... complexo, tal
async function listAluguel(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  const { data: { messages } } = await gmail.users.messages.list({
    userId: 'me',
    q: 'from:financeiro2@santailha.com.br subject:Seu Boleto de Aluguel newer_than:1m',
  });

  if (messages.length) {
    console.log('Messages', messages);
    // res.data.messages.forEach((message) => {
    await Promise.all(messages.map(async message => {
      try {
        const { data } = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
        });
        const { payload } = data;
        // debugger;
        const content = Buffer.from(payload.parts[1].body.data, 'base64').toString('utf-8');
        const contentWithoutBreaks = content.replace(/(\r\n|\n|\r)/gm, "");
        const urls = contentWithoutBreaks.match(/(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/g);
        const pdfUrl = urls.find((url) => url.includes('https://adm000260.superlogica.net/clients/areadocliente/publico/cobranca/'));
        if (!pdfUrl) return;
        const buffer = await download(pdfUrl);
        const pdfText = await extractPdfText(buffer);
        const codeIndex = pdfText.indexOf('748-X');
        const codigoDeBarras = pdfText[codeIndex + 1];
        const vencimento = pdfText[codeIndex + 6];
        const valor = pdfText[codeIndex - 4];
        console.log(
          codigoDeBarras,
          vencimento,
          valor,
        );
      } catch (e) {
        console.log('fail in', message.snippet);
      }
    }))
  } else {
    console.log('No messages.');
  }
}

// from:operacional39@grupodsc.com.br subject:BOLETO DE CONDOMÍNIO - RECANTO DO RIBEIRÃO
async function listCond(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  const { data: { messages } } = await gmail.users.messages.list({
    userId: 'me',
    q: 'from:operacional39@grupodsc.com.br subject:BOLETO DE CONDOMÍNIO - RECANTO DO RIBEIRÃO newer_than:6m',
  });

  if (messages.length) {
    console.log('Messages', messages);
    // res.data.messages.forEach((message) => {
    await Promise.all(messages.map(async message => {
      try {
        const { data } = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
        });
        const { payload } = data;
        const attachment = payload.parts.find((part) => part.filename.includes('.pdf'));
        const pdfData = await gmail.users.messages.attachments.get({
          id: attachment.body.attachmentId,
          messageId: message.id,
          userId: 'me',
        });
        const pdfBuffer = Buffer.from(pdfData.data.data, 'base64');
        const pdfText = await extractPdfText(pdfBuffer, '003');
        const codeIndex = pdfText.indexOf('033- 7');
        const codigoDeBarras = pdfText[codeIndex - 9];
        const vencimento = pdfText[codeIndex - 8];
        const valor = pdfText[codeIndex + 4];
        console.log(
          codigoDeBarras,
          vencimento,
          valor,
        );
      } catch (e) {
        console.log('fail in', e);
      }
    }))
  } else {
    console.log('No messages.');
  }
}

// from:todomundo@nubank.com.br subject:A fatura do seu cartão Nubank está fechada
async function listNubank(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  const { data: { messages } } = await gmail.users.messages.list({
    userId: 'me',
    q: 'from:todomundo@nubank.com.br subject:A fatura do seu cartão Nubank está fechada newer_than:6m',

  });



  if (messages.length) {
    console.log('Messages', messages);
    const messageData = await Promise.all(messages.map((message) => gmail.users.messages.get({
      userId: 'me',
      id: message.id,
    })));
    const currentEmail = messageData.reduce((
      prev, current,
    ) => {
      if (!prev) {
        return current;
      }
      if (prev.data.internalDate > current.data.internalDate) {
        return prev;
      }
      return current;
    }, null);
    if (!currentEmail) {
      return;
    }
    const attachment = currentEmail.data.payload.parts.find((part) => part.filename.includes('.pdf'));
    const pdfData = await gmail.users.messages.attachments.get({
      id: attachment.body.attachmentId,
      messageId: currentEmail.data.id,
      userId: 'me',
    });
    const pdfBuffer = Buffer.from(pdfData.data.data, 'base64');
    const images = await extractImgFromPdf(pdfBuffer);
    const lastImage = images[images.length - 1];
    const pdfText = await extractTextFromImg(lastImage);
    const textLines = pdfText.split('\n');
    const codeMatch = 'NV 260-7 ';
    const codeIndex = textLines.findIndex((t) => t.includes(codeMatch));
    const codigoDeBarras = textLines[codeIndex].replace(codeMatch, '');
    const vencimentoMatch = 'Em qualquer banco até o vencimento ';
    const vencimentoIndex = textLines.findIndex((t) => t.includes(vencimentoMatch));
    const vencimento = textLines[vencimentoIndex].replace(vencimentoMatch, '');
    const valorMatch = '00 R$ ';
    const valorIndex = textLines.findIndex((t) => t.includes(valorMatch));
    const valor = textLines[valorIndex].replace(valorMatch, '');

    console.log(
      codigoDeBarras,
      vencimento,
      valor,
    );
  } else {
    console.log('No messages.');
  }
}

