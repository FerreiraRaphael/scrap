const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { google } = require('googleapis');
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
  authorize(JSON.parse(content), listC6);
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
  const messages = await getEmails(gmail, 'from:faturadigital@minhaclaro.com.br subject:Sua fatura Claro Net por e-mail newer_than:1m');
  // dia 29 a 28 talvez rodar primeiro dia do mês.
  if (!messages.length === 0) {
    console.warn('listFaturaNet no messages')
    return;
  }

  await Promise.all(messages.map(async (message) => {
    const htmlLines = getHtmlContent(message);
    const info = parseInfoFromText(htmlLines, [{
      parser: 'CC3digo do cliente:<BR>',
      indexIncrement: 1,
      fieldName: 'codigoCliente',
    }, {
      parser: 'CC3digo de barras:<BR>',
      indexIncrement: 1,
      fieldName: 'codigoBarras',
    }, {
      parser: 'Vencimento:<BR>',
      indexIncrement: 1,
      fieldName: 'vencimento',
    }, {
      parser: 'Total a pagar',
      indexIncrement: 5,
      fieldName: 'valor',
    }]);
    console.log(info);
  }));
}
/**
 * @TODO: testar com boletos validos no email... e passar para padrao dos parsers
 */
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
  const messages = await getEmails(gmail, 'from:operacional39@grupodsc.com.br subject:BOLETO DE CONDOMÍNIO - RECANTO DO RIBEIRÃO newer_than:6m');
  if (!messages.length === 0) {
    console.warn('listCond no messages')
    return;
  }
  await Promise.all(messages.map(async message => {
    try {
      const pdfBuffer = await getEmailPdf(gmail, message);
      const pdfText = await extractPdfText(pdfBuffer, '003');
      const parser = '033- 7';
      const info = parseInfoFromText(pdfText, [{
        parser,
        indexIncrement: -9,
        fieldName: 'codigoDeBarras',
      }, {
        parser,
        indexIncrement: -8,
        fieldName: 'vencimento',
      }, {
        parser,
        indexIncrement: 4,
        fieldName: 'valor',
      }]);
      console.log(info);
    } catch (e) {
      console.log('fail in', e);
    }
  }))
}

// from:todomundo@nubank.com.br subject:A fatura do seu cartão Nubank está fechada
async function listNubank(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  const messages = await getEmails(gmail, 'from:todomundo@nubank.com.br subject:A fatura do seu cartão Nubank está fechada newer_than:6m');
  if (!messages.length === 0) {
    console.warn('listNubank no messages')
    return;
  }
  const currentMessage = getNewestMessage(messages);
  const pdfData = await getEmailPdf(gmail, currentMessage);
  const images = await extractImgFromPdf(pdfData);
  const lastImage = images[images.length - 1];
  const pdfText = await extractTextFromImg(lastImage);
  const textLines = pdfText.split('\n');
  const codeMatch = 'NV 260-7 ';
  const vencimentoMatch = 'Em qualquer banco até o vencimento ';
  const valorMatch = '00 R$ ';
  const info = parseInfoFromText(textLines, [{
    parser: (t) => t.includes(codeMatch),
    replaces: [[codeMatch, '']],
    fieldName: 'code',
  }, {
    parser: (t) => t.includes(vencimentoMatch),
    replaces: [[vencimentoMatch, '']],
    fieldName: 'vencimento',
  }, {
    parser: (t) => t.includes(valorMatch),
    replaces: [[valorMatch, '']],
    fieldName: 'valor',
  }]);
  console.log(info);
}

/**
 *
 * @param {import('googleapis').oauth2_v1.Oauth2} auth
 */
async function listEnergia(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  const messages = await getEmails(gmail, 'from:celesc-fatura@celesc.com.br subject:Chegou a sua Fatura de Energia Eletrica newer_than:6m');
  if (!messages.length === 0) {
    console.warn('listEnergia no messages')
    return;
  }
  await Promise.all(messages.map(async (message) => {
    const pdfBuffer = await getEmailPdf(gmail, message);
    const pdfText = await extractPdfText(pdfBuffer);
    const info = parseInfoFromText(pdfText, [{
      parser: 'VENCIMENTO',
      fieldName: 'vencimento',
      indexIncrement: 1,
    }, {
      parser: 'VALOR ATÉ O VENCIMENTO',
      fieldName: 'valor',
      replaces: [['R$ ', '']],
      indexIncrement: 1,
    }, {
      parser: 'GBCELESC1 (V1.05)',
      fieldName: 'codigo',
      indexIncrement: -1,
    }]);
    console.log(info);
  }));
}

/**
 *
 * @param {import('googleapis').oauth2_v1.Oauth2} auth
 */
 async function listC6(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  const messages = await getEmails(gmail, 'from:no-reply@c6.com.br subject:Sua fatura do C6 Bank chegou newer_than:6m ');
  if (!messages.length === 0) {
    console.warn('listC6 no messages')
    return;
  }
  await Promise.all(messages.map(async (message) => {
    const pdfBuffer = await getEmailPdf(gmail, message);
    const pdfText = await extractPdfText(pdfBuffer, '012108');
    fs.writeFileSync(new Date().toISOString(), pdfText.join('\n'));
    const info = parseInfoFromText(pdfText, [{
      parser: 'VENCIMENTO',
      fieldName: 'vencimento',
      indexIncrement: 3,
    }, {
      parser: 'VALOR TOTAL',
      fieldName: 'valor',
      indexIncrement: 1,
    }, {
      parser: '(=) VALOR PAGO',
      fieldName: 'codigo',
      indexIncrement: 1,
    }]);
    console.log(info);
  }));
}

function parseInfoFromText(text, parsers) {
  return parsers.map(({
    parser,
    replaces = [],
    fieldName,
    indexIncrement = 0,
  }) => {
    let index = -1;
    if (typeof parser === 'string') {
      index = text.indexOf(parser);
    } else {
      index = text.findIndex(parser);
    }
    const value = text[index + indexIncrement];
    if (!value) {
      return { [fieldName]: value };
    }
    const newValue = replaces.reduce((prev, current) => prev.replace(...current), value);
    return { [fieldName]: newValue };
  }).reduce((prev, current) => ({ ...prev, ...current }), {});
}
/**
 * @param {import('googleapis').gmail_v1.Gmail} gmail
 * @param {string} query
 * @return {Promise<import('googleapis').gmail_v1.Schema$Message[]>}
 */
async function getEmails(gmail, query) {
  const { data: { messages } } = await gmail.users.messages.list({
    userId: 'me',
    q: query,
  });
  if (messages && messages.length) {
    console.debug('Messages', messages);
    const messageData = await Promise.all(messages.map(async message => {
      try {
        const messageData = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
        });
        return messageData.data
      } catch (e) {
        console.error('fail getEmails', e);
      }
    }));
    return messageData.filter(Boolean);
  } else {
    console.debug('No messages.');
    return [];
  }
}

/**
 * @param {import('googleapis').gmail_v1.Gmail} gmail
 * @param {import('googleapis').gmail_v1.Schema$Message} message
 */
async function getEmailPdf(gmail, message) {
  const attachment = findPdfAttachment(message);
  const pdfData = await gmail.users.messages.attachments.get({
    id: attachment.body.attachmentId,
    messageId: message.id,
    userId: 'me',
  });
  const pdfBuffer = Buffer.from(pdfData.data.data, 'base64');
  return pdfBuffer;
}

/**
 * @param {import('googleapis').gmail_v1.Schema$MessagePart} attachment
 */
function attachmentToBuffer(attachment) {
  return Buffer.from(attachment.body.data, 'base64');
}

/**
 * @param {import('googleapis').gmail_v1.Schema$MessagePart} attachment
 */
function isPdfAttachment(attachment) {
  return attachment.filename.includes('.pdf');
}

/**
 * @param {import('googleapis').gmail_v1.Schema$Message} message
 */
function findPdfAttachment(message) {
  return message.payload.parts.find(isPdfAttachment);
}

/**
 * @param {import('googleapis').gmail_v1.Schema$Message[]} messages
 */
function getNewestMessage(messages) {
  return messages.reduce((
    prev, current,
  ) => {
    if (!prev) {
      return current;
    }
    if (prev.internalDate > current.internalDate) {
      return prev;
    }
    return current;
  }, null);
}

/**
 * @param {import('googleapis').gmail_v1.Schema$Message} message
 */
function getHtmlContent(message) {
  const htmlAttachment = getHtmlAttachment(message);
  if (!htmlAttachment) {
    return [];
  }
  const htmlText = Buffer.from(htmlAttachment.body.data, 'base64').toString('ascii');
  const htmlLines = htmlText.split(/(\r\n|\n|\r)/gm).map(t => t.trim()).filter(Boolean);
  return htmlLines;
}

/**
 * @param {import('googleapis').gmail_v1.Schema$Message} message
 */
function getHtmlAttachment(message) {
  return message.payload.parts.find((p) => p.mimeType === 'text/html');
}
