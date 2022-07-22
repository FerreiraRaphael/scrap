const https = require('https');

const download = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const data = [];
      // Write data into local file
      res.on('data', x => data.push(x));
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

module.exports = { download };
