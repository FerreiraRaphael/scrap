const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'email.txt');
const file = fs.readFileSync(filePath);
const content = file.toString('utf-8');
const contentWithoutBreaks = content.replace(/(\r\n|\n|\r)/gm, "");
fs.writeFileSync(filePath, contentWithoutBreaks);

function getCodigoCliente(content) {
  const matches = content.match(/(?<=CC3digo do cliente:<BR>)(.)*?<\/td>/g);
  if (matches.length) {
    return matches[0].replace('</td>', '').trim();
  }
  throw new Error('Could not find the codigo do cliente');
}

function getCodigoBarras(content) {
  const matches = content.match(/(?<=CC3digo de barras:<BR>)(.)*?<\/td>/g);
  if (matches.length) {
    return matches[0].replace('</td>', '').trim();
  }
  throw new Error('Could not find the codigo de barras');
}

function getVencimento(content) {
  const matches = content.match(/(?<=Vencimento:<BR>)(.)*?<\/td>/g);
  if (matches.length) {
    return matches[0].replace('</td>', '').trim();
  }
  throw new Error('Could not find the vencimento');
}

function getValorTotal(content) {
  const matches = content.match(/(?<=Total a pagar                                                                        <\/td>                                                                        <td bgcolor="#ee352a" height="49"                                                                            class="texto-box-valor" align="right"                                                                            style="font-family:'DINOT', Arial, Helvetica, sans-serif;color:#fff;font-size:18px;line-height:1.25">)(.)*?<\/td>/g);
  if (matches.length) {
    return matches[0].replace('</td>', '').trim();
  }
  throw new Error('Could not find the vencimento');
}

// console.log(
//   getCodigoCliente(contentWithoutBreaks),
//   getCodigoBarras(contentWithoutBreaks),
//   getVencimento(contentWithoutBreaks),
//   getValorTotal(contentWithoutBreaks),
// );

module.exports = {
  getCodigoBarras,
  getCodigoCliente,
  getValorTotal,
  getVencimento,
}
