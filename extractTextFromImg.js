const { createWorker } = require('tesseract.js');

async function extractTextFromImg(images = []) {
  const worker = createWorker({
    // logger: m => console.log(m)
  });
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  const texts = await Promise.all(images.map(async (image) => {
    const text = await worker.recognize(image).data.text
    fs.writeFileSync('./gogo$'+1+'.txt', text);
    return text;
  }));
  return texts;
}
module.exports = { extractTextFromImg };
