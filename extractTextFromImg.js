const { createWorker } = require('tesseract.js');
async function extractTextFromImg(image) {
  const worker = createWorker();
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  let text = '';
  try {
    const tesseractData = await worker.recognize(image);
    text = tesseractData.data.text;
  } finally {
    worker.terminate();
  }
  return text;
}
module.exports = { extractTextFromImg };
