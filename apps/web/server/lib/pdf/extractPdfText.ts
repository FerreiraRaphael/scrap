import pdf from 'pdf-parse';

export const extractPdfText = (dataBuffer: Buffer, password?: string) => {
  const options = { data: dataBuffer, password: undefined as (string | undefined) };
  if (password) {
    options.password = password;
  }
  // @ts-ignore
  return pdf(options).then((data) => {
    return data.text.split('\n');
  });
}
