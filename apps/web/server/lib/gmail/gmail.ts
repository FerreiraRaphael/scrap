import fs from 'fs';
import { gmail_v1, google } from 'googleapis';
import { download } from '../pdf/download';
import { extractPdfText } from '../pdf/extractPdfText';
import { extractImgFromPdf } from '../pdf/extractImgFromPdf';
import { extractTextFromImg } from '../pdf/extractTextFromImg';
import { OAuth2Client } from 'google-auth-library';
import { Boleto, Tipo } from '@prisma/client';
import { format, isDate } from 'date-fns';

type TBoletoFields = Omit<Boleto, 'id' | 'createdAt' | 'updatedAt'>;

type TBoletoInfo<
  T extends Boleto['tipo'],
  M extends (Object) = {}
  > = TBoletoFields & {
    tipo: T;
    meta: M;
  };
type TBoletoNet = TBoletoInfo<'NET', {
  codigoCliente: string
}>;

const valorReplaces: TParserReplace = [['.', ''], [',', '.']];
const codigoBarrasReplaces: TParserReplace = [[/\.|\s/g, '']];
const dateFilter = (date?: Date) => date ? `after:${format(date, 'mm/dd/yyyy')}` : 'newer_than:6m';

export async function getBoletoNet(gmail: gmail_v1.Gmail, lastDate?: Date): Promise<TBoletoNet[]> {
  let messages;
  try {
    messages = await getEmails(gmail, `from:faturadigital@minhaclaro.com.br subject:Sua fatura Claro Net por e-mail ${dateFilter(lastDate)}`);
  } catch (e) {
    console.log(e);
    throw e;
  }
  const boletos = await Promise.all(messages.map(async (message) => {
    const htmlLines = getHtmlContent(message);
    const info = parseInfoFromText(htmlLines, [{
      parser: 'CC3digo do cliente:<BR>',
      indexIncrement: 1,
      fieldName: 'codigoCliente',
    }, {
      parser: 'CC3digo de barras:<BR>',
      indexIncrement: 1,
      fieldName: 'codigoBarras',
      replaces: codigoBarrasReplaces,
    }, {
      parser: 'Vencimento:<BR>',
      indexIncrement: 1,
      fieldName: 'vencimento',
    }, {
      parser: 'Total a pagar',
      indexIncrement: 5,
      fieldName: 'valor',
      replaces: valorReplaces,
    }]);
    const vencimento = brStringDateToDate(info.vencimento);
    if (!vencimento) {
      return null;
    }
    debugger;
    return {
      codigoBarras: info.codigoBarras,
      vencimento,
      valor: Number(info.valor),
      meta: {
        codigoCliente: info.codigoCliente,
      },
      tipo: Tipo.NET,
      sendAt: new Date(Number(message.internalDate)),
    };
  }));

  return boletos.filter(isNotUndefined).filter(isValidBoleto);
}

export async function listAluguel(auth: OAuth2Client) {
  const gmail = google.gmail({ version: 'v1', auth });
  const { data: { messages } } = await gmail.users.messages.list({
    userId: 'me',
    q: 'from:financeiro2@santailha.com.br subject:Seu Boleto de Aluguel newer_than:1m',
  });

  if (messages?.length) {
    console.log('Messages', messages);
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

type TBoletoCond = TBoletoInfo<'COND'>;
export async function getBoletoCond(gmail: gmail_v1.Gmail, lastDate?: Date): Promise<TBoletoCond[]> {
  const messages = await getEmails(gmail, `from:operacional39@grupodsc.com.br subject:BOLETO DE CONDOMÍNIO - RECANTO DO RIBEIRÃO ${dateFilter(lastDate)}`);
  const boletos = await Promise.all(messages.map(async message => {
    try {
      const pdfBuffer = await getEmailPdf(gmail, message);
      const pdfText = await extractPdfText(pdfBuffer!, '003');
      const parser = '033- 7';
      const info = parseInfoFromText(pdfText, [{
        parser,
        indexIncrement: -9,
        fieldName: 'codigoBarras',
        replaces: codigoBarrasReplaces,
      }, {
        parser,
        indexIncrement: -8,
        fieldName: 'vencimento',
      }, {
        parser,
        indexIncrement: 4,
        fieldName: 'valor',
        replaces: valorReplaces,
      }]);
      const vencimento = brStringDateToDate(info.vencimento);
      if (!vencimento) {
        return null;
      }
      return {
        codigoBarras: info.codigoBarras,
        vencimento,
        valor: Number(info.valor),
        tipo: Tipo.COND,
        sendAt: new Date(Number(message.internalDate)),
        meta: {},
      };
    }
    catch {
      return null
    }
  }));
  return boletos.filter(isNotUndefined).filter(isValidBoleto)
}

type TBoletoC6 = TBoletoInfo<'C6'>;
export async function getBoletosC6(gmail: gmail_v1.Gmail, lastDate?: Date): Promise<TBoletoC6[]> {
  const messages = await getEmails(gmail, `from:no-reply@c6.com.br subject:Sua fatura do C6 Bank chegou ${dateFilter(lastDate)}`);
  const boletos = await Promise.all(messages.map(async (message) => {
    try {
      const pdfBuffer = await getEmailPdf(gmail, message);
      const pdfText = await extractPdfText(pdfBuffer!, '012108');
      debugger
      const info = parseInfoFromText(pdfText, [{
        parser: 'VENCIMENTO',
        fieldName: 'vencimento',
        indexIncrement: 3,
      }, {
        parser: 'VALOR TOTAL',
        fieldName: 'valor',
        indexIncrement: 1,
        replaces: valorReplaces,
      }, {
        parser: '(=) VALOR PAGO',
        fieldName: 'codigoBarras',
        indexIncrement: 1,
        replaces: codigoBarrasReplaces,
      }]);
      const vencimento = brStringDateToDate(info.vencimento);
      if (!vencimento) {
        return null;
      }
      return {
        codigoBarras: info.codigoBarras,
        vencimento,
        valor: Number(info.valor),
        tipo: Tipo.C6,
        sendAt: new Date(Number(message.internalDate)),
        meta: {},
      };
    } catch(e) {
      return null;
    }
  }));
  return boletos.filter(isNotUndefined).filter(isValidBoleto);
}

type TBoletoNubank = TBoletoInfo<'NUBANK'>;
export async function getBoletoNubank(gmail: gmail_v1.Gmail, lastDate?: Date): Promise<TBoletoNubank[]> {
  const messages = await getEmails(gmail, `from:todomundo@nubank.com.br subject:A fatura do seu cartão Nubank está fechada ${dateFilter(lastDate)}`);
  const boletos = await Promise.all(messages.map(async (message) => {
    try {
      const pdfData = await getEmailPdf(gmail, message);
      const images = await extractImgFromPdf(pdfData!);
      const lastImage = images[images.length - 1];
      const pdfText = await extractTextFromImg(lastImage);
      const textLines = pdfText.replace(/[\r]/g, '').split('\n');
      const codeMatch = '260-7';
      const vencimentoMatch = 'Data de Vencimento';
      const valorMatch = 'Valor Cobrado';
      const info = parseInfoFromText(textLines, [{
        parser: codeMatch,
        replaces: codigoBarrasReplaces,
        fieldName: 'codigoBarras',
        indexIncrement: 1,
      }, {
        parser: vencimentoMatch,
        fieldName: 'vencimento',
        indexIncrement: 1,
      }, {
        parser: valorMatch,
        replaces: valorReplaces,
        fieldName: 'valor',
        indexIncrement: 1,
      }]);
      const vencimento = brStringDateToDate(info.vencimento);
      if (!vencimento) {
        return null;
      }
      return {
        codigoBarras: info.codigoBarras,
        vencimento,
        valor: Number(info.valor),
        tipo: Tipo.NUBANK,
        sendAt: new Date(Number(message.internalDate)),
        meta: {},
      };
    } catch (e) {
      return null;
    }
  }))
  return boletos.filter(isNotUndefined).filter(isValidBoleto);
}

type TBoletoEnergia = TBoletoInfo<'ENERGIA'>;
export async function listEnergia(gmail: gmail_v1.Gmail, lastDate?: Date): Promise<TBoletoEnergia[]> {
  const messages = await getEmails(gmail, 'from:celesc-fatura@celesc.com.br subject:Chegou a sua Fatura de Energia Eletrica newer_than:6m');
  const boletos = await Promise.all(messages.map(async (message) => {
    try {
      const pdfBuffer = await getEmailPdf(gmail, message);
      const pdfText = await extractPdfText(pdfBuffer!);
      const info = parseInfoFromText(pdfText, [{
        parser: 'VENCIMENTO',
        fieldName: 'vencimento',
        indexIncrement: 1,
      }, {
        parser: 'VALOR ATÉ O VENCIMENTO',
        fieldName: 'valor',
        replaces: [['R$ ', ''], ...valorReplaces],
        indexIncrement: 1,
      }, {
        parser: 'GBCELESC1 (V1.05)',
        fieldName: 'codigoBarras',
        indexIncrement: -1,
        replaces: codigoBarrasReplaces
      }]);
      const vencimento = brStringDateToDate(info.vencimento);
      if (!vencimento) {
        return null;
      }
      return {
        codigoBarras: info.codigoBarras,
        vencimento,
        valor: Number(info.valor),
        tipo: Tipo.ENERGIA,
        sendAt: new Date(Number(message.internalDate)),
        meta: {},
      };
    } catch (e) {
      return null;
    }
  }));
  return boletos.filter(isNotUndefined).filter(isValidBoleto);
}

type TParserReplace = [string | RegExp, string][];
interface IParsers {
  parser: string | ((t: string) => boolean);
  replaces?: TParserReplace;
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

function isNotUndefined<T>(item: T | undefined | null): item is T {
  return Boolean(item);
}

function isValidBoleto<T extends TBoletoFields>({ codigoBarras, vencimento, valor }: T) {
  const isCodigoLength = codigoBarras?.length === 48 || codigoBarras?.length === 47;
  const isCodigoOnlyNumber = /^[0-9]+$/.test(codigoBarras || '');
  const isValidCodigo = isCodigoLength && isCodigoOnlyNumber;
  if (!isValidCodigo) {
    return false;
  }
  if (!isDate(vencimento)) {
    return false;
  }
  if (isNaN(valor)) {
    return false;
  }
  return true;
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

function brStringDateToDate(dateString: string): Date | undefined {
  const [day, month, year] = dateString.split("/");
  const dayN = +day;
  const monthN = +month;
  const yearN = +year;
  if (isNaN(+day) || isNaN(+month) || isNaN(+year)) {
    return;
  }
  const dateObject = new Date(yearN, monthN - 1, dayN);
  return dateObject;
}
