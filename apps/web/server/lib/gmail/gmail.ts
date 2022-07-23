import fs from 'fs';
import { gmail_v1, google } from 'googleapis';
import { download } from '../pdf/download';
import { extractPdfText } from '../pdf/extractPdfText';
import { extractImgFromPdf } from '../pdf/extractImgFromPdf';
import { extractTextFromImg } from '../pdf/extractTextFromImg';
import { OAuth2Client } from 'google-auth-library';

/**
 * Look for net fatura email.
 * @param {*} auth
 */
export async function listFaturaNet(auth: OAuth2Client) {
  const gmail = google.gmail({ version: 'v1', auth });
  const messages = await getEmails(gmail, 'from:faturadigital@minhaclaro.com.br subject:Sua fatura Claro Net por e-mail newer_than:1m');
  // dia 29 a 28 talvez rodar primeiro dia do mês.
  if (messages.length !== 0) {
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
export async function listAluguel(auth: OAuth2Client) {
  const gmail = google.gmail({ version: 'v1', auth });
  const { data: { messages } } = await gmail.users.messages.list({
    userId: 'me',
    q: 'from:financeiro2@santailha.com.br subject:Seu Boleto de Aluguel newer_than:1m',
  });

  if (messages?.length) {
    console.log('Messages', messages);
    // res.data.messages.forEach((message) => {
    await Promise.all(messages.map(async message => {
      try {
        const { data } = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
        });
        const { payload } = data;
        const contentData = payload?.parts?.at(1)?.body?.data;
        if (!contentData) {
          return;
        }
        const content = Buffer.from(contentData, 'base64').toString('utf-8');
        const contentWithoutBreaks = content.replace(/(\r\n|\n|\r)/gm, "");
        const urls = contentWithoutBreaks.match(/(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/g);
        const pdfUrl = (urls || []).find((url) => url.includes('https://adm000260.superlogica.net/clients/areadocliente/publico/cobranca/'));
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
export async function listCond(auth: OAuth2Client) {
  const gmail = google.gmail({ version: 'v1', auth });
  const messages = await getEmails(gmail, 'from:operacional39@grupodsc.com.br subject:BOLETO DE CONDOMÍNIO - RECANTO DO RIBEIRÃO newer_than:6m');
  if (messages.length !== 0) {
    console.warn('listCond no messages')
    return;
  }
  await Promise.all(messages.map(async message => {
    try {
      const pdfBuffer = await getEmailPdf(gmail, message);
      const pdfText = await extractPdfText(pdfBuffer!, '003');
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
export async function listNubank(auth: OAuth2Client) {
  const gmail = google.gmail({ version: 'v1', auth });
  const messages = await getEmails(gmail, 'from:todomundo@nubank.com.br subject:A fatura do seu cartão Nubank está fechada newer_than:6m');
  if (messages.length !== 0) {
    console.warn('listNubank no messages')
    return;
  }
  const currentMessage = (getNewestMessage(messages))!;
  const pdfData = await getEmailPdf(gmail, currentMessage);
  const images = await extractImgFromPdf(pdfData!);
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
export async function listEnergia(auth: OAuth2Client) {
  const gmail = google.gmail({ version: 'v1', auth });
  const messages = await getEmails(gmail, 'from:celesc-fatura@celesc.com.br subject:Chegou a sua Fatura de Energia Eletrica newer_than:6m');
  if (messages.length !== 0) {
    console.warn('listEnergia no messages')
    return;
  }
  await Promise.all(messages.map(async (message) => {
    const pdfBuffer = await getEmailPdf(gmail, message);
    const pdfText = await extractPdfText(pdfBuffer!);
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

export async function listC6(auth: OAuth2Client) {
  const gmail = google.gmail({ version: 'v1', auth });
  const messages = await getEmails(gmail, 'from:no-reply@c6.com.br subject:Sua fatura do C6 Bank chegou newer_than:6m ');
  if (messages.length !== 0) {
    console.warn('listC6 no messages')
    return;
  }
  await Promise.all(messages.map(async (message) => {
    const pdfBuffer = await getEmailPdf(gmail, message);
    const pdfText = await extractPdfText(pdfBuffer!, '012108');
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

interface IParsers {
  parser: string | ((t: string) => boolean);
  replaces?: [string, string][];
  fieldName: string;
  indexIncrement?: number;
}

function parseInfoFromText(text: string[], parsers: IParsers[]) {
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

function isNotUndefined<T>(item: T | undefined): item is T {
  return Boolean(item);
}

async function getEmails(gmail: gmail_v1.Gmail, query: string) {
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
    return messageData.filter(isNotUndefined);
  } else {
    console.debug('No messages.');
    return [];
  }
}

async function getEmailPdf(gmail: gmail_v1.Gmail, message: gmail_v1.Schema$Message) {
  const attachment = findPdfAttachment(message);
  const pdfData = await gmail.users.messages.attachments.get({
    id: attachment?.body?.attachmentId,
    messageId: message.id,
    userId: 'me',
  });
  const data = pdfData?.data?.data;
  if (!data) {
    return;
  }
  const pdfBuffer = Buffer.from(data, 'base64');
  return pdfBuffer;
}

function attachmentToBuffer(attachment?: gmail_v1.Schema$MessagePartBody) {
  const data = attachment?.data;
  if (!data) {
    return;
  }
  return Buffer.from(data, 'base64');
}

function isPdfAttachment(attachment: gmail_v1.Schema$MessagePart) {
  return !!attachment?.filename?.includes('.pdf');
}

function findPdfAttachment(message: gmail_v1.Schema$Message) {
  return message?.payload?.parts?.find(isPdfAttachment);
}

function getNewestMessage(messages: gmail_v1.Schema$Message[]) {
  return messages.reduce((
    prev, current,
  ) => {
    if (!prev) {
      return current;
    }
    if ((prev?.internalDate || 0) > (current?.internalDate || 0)) {
      return prev;
    }
    return current;
  }, null as gmail_v1.Schema$Message | null);
}

function getHtmlContent(message: gmail_v1.Schema$Message) {
  const htmlAttachment = getHtmlAttachment(message);
  if (!htmlAttachment) {
    return [];
  }
  const data = htmlAttachment?.body?.data;
  if (!data) {
    return [];
  }
  const htmlText = Buffer.from(data, 'base64').toString('ascii');
  const htmlLines = htmlText.split(/(\r\n|\n|\r)/gm).map(t => t.trim()).filter(Boolean);
  return htmlLines;
}

function getHtmlAttachment(message: gmail_v1.Schema$Message) {
  return message?.payload?.parts?.find((p) => p.mimeType === 'text/html');
}
