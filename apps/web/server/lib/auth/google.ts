import fs from 'fs';
import readline from 'readline';
// import path from 'path';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// const withDir = (file: string) => path.resolve(__dirname, file);

// Load client secrets from a local file.
// fs.readFile(withDir('credentials.json'), (err, content) => {
//   if (err) return console.log('Error loading client secret file:', err);
//   // Authorize a client with credentials, then call the Gmail API.
//   // authorize(JSON.parse(content.toString()), );
// });

type GoogleOAuthCallback = (auth: OAuth2Client) => void;
function authorize(callback: GoogleOAuthCallback) {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, async (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token.toString()));
    try {
      await oAuth2Client.getAccessToken();
    } catch (e) {
      fs.rm(TOKEN_PATH, () => {
        getNewToken(oAuth2Client, callback)
      });
    }
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client: OAuth2Client, callback: GoogleOAuthCallback) {
  console.log('here');
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err || !token) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) { return console.error('Error here?', err) };
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}
