import fs from 'fs';
import readline from 'readline';
// import path from 'path';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { redis } from '~/server/globals/redis';
import { googleOAuth } from '~/server/globals/googleOAuth';
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

export async function authorize(token: string) {
  // if (!token) {
  //   return getNewToken();
  // }
  // Check if we have previously stored a token.
  // fs.readFile(TOKEN_PATH, async (err, token) => {
  // if (err) return getNewToken(oAuth2Client, callback);
  googleOAuth.setCredentials(JSON.parse(token.toString()));
  try {
    await googleOAuth.getAccessToken();
  } catch (e) {
    await redis.del('token');
    throw new Error('invalid token');
  }
  // });
}

export function getAuthUrl() {
  const authUrl = googleOAuth.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  return authUrl;
}

export async function setTokenUsingCode(code: string) {
  const res = await googleOAuth.getToken(code);
  googleOAuth.setCredentials(res.tokens);
  await redis.set('token', JSON.stringify(res.tokens));
}
