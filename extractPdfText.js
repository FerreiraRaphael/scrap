const pdf = require('pdf-parse');

const extractPdfText = (dataBuffer, password) => {
  const options = { data: dataBuffer };
  if (password) {
    options.password = password;
  }
  return pdf(options).then((data) => {
    return data.text.split('\n');
  });
}
module.exports = { extractPdfText };
