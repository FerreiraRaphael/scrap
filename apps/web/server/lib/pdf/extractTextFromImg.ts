import { ocrSpace } from 'ocr-space-api-wrapper';
interface IOrcSpaceResponse {
  ParsedResults: {
    ParsedText: string
  }[]
}

export async function extractTextFromImg(image: Buffer) {
  const input = `data:image/jpeg;${image.toString('base64')}`
  const res: IOrcSpaceResponse | undefined = await ocrSpace(input, { apiKey: process.env.ORC_SPACE_API_KEY, language: 'ita' });
  if (!res) {
    return '';
  }
  const text = res.ParsedResults.reduce((prev, current) => `${prev}${current.ParsedText}`, '');
  return text;
}
