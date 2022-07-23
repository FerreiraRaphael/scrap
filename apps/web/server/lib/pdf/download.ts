import https from 'https';

export const download = (url: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const data: Uint8Array[] = [];
      // Write data into local file
      res.on('data', (x: Uint8Array) => data.push(x));
      // Close the file
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        return resolve(buffer);
      });
    }).on("error", (err) => {
      return reject(err);
    });
  });
}
