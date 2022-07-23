import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../env';

const googleOAuthGlobal = global as typeof global & {
  googleOAuth?: OAuth2Client;
};

export const googleOAuth: OAuth2Client =
  googleOAuthGlobal.googleOAuth ||
  new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

if (env.NODE_ENV !== 'production') {
  googleOAuthGlobal.googleOAuth = googleOAuth;
}
