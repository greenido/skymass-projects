/*
Fetch data from Google Search Console API

This sample shows how to fetch data from Google Search Console API.

@author greenido
@date 2023-feb-16
@version 0.1
@license MIT
@see: 
* https://developers.google.com/webmaster-tools/search-console-api-original/v3/how-tos/authorizing

* https://github.com/googleapis/google-api-nodejs-client#installation
* https://github.com/googleapis/google-api-nodejs-client/blob/main/samples/webmasters/query.js

* https://googleapis.dev/nodejs/googleapis/latest/oauth2/classes/Oauth2.html
* https://googleapis.dev/nodejs/googleapis/latest/oauth2/classes/Oauth2Client.html

* https://search.google.com/u/2/search-console?resource_id=sc-domain%3Aelischwartz.co
* https://search.google.com/u/2/search-console?resource_id=sc-domain%3Agreenido.wordpress.com

@check:
https://developers.google.com/webmaster-tools/v1/searchanalytics/query
*/
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const opn = require('open');
const destroyer = require('server-destroy');
const {google} = require('googleapis');

const webmasters = google.webmasters('v3');

/**
 * To use OAuth2 authentication, we need access to a CLIENT_ID, CLIENT_SECRET, AND REDIRECT_URI.  To get these credentials for your application, visit https://console.cloud.google.com/apis/credentials.
 */
const keyPath = path.join(__dirname, 'oauth2.keys.json');
let keys = {redirect_uris: ['']};
if (fs.existsSync(keyPath)) {
  keys = require(keyPath).web;
}

/**
 * Create a new OAuth2 client with the configured keys.
 */
const oauth2Client = new google.auth.OAuth2(
  keys.client_id,
  keys.client_secret,
  keys.redirect_uris[0]
);

/**
 * This is one of the many ways you can configure googleapis to use authentication credentials.  In this method, we're setting a global reference for all APIs.  Any other API you use here, like google.drive('v3'), will now use this auth client. You can also override the auth client at the service and method call levels.
 */
google.options({auth: oauth2Client});

/**
 * Open an http server to accept the oauth callback. In this simple example, the only request to our webserver is to /callback?code=<code>
 */
async function authenticate(scopes) {
  return new Promise((resolve, reject) => {
    // grab the url that will be used for authorization
    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes.join(' '),
    });
    const server = http.createServer(async (req, res) => {
        try {
          if (req.url.indexOf('/oauth2callback') > -1) {
            const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
            res.end('Authentication successful! Please return to the console.');
            server.destroy();
            const {tokens} = await oauth2Client.getToken(qs.get('code'));
            oauth2Client.credentials = tokens; // eslint-disable-line require-atomic-updates
            resolve(oauth2Client);
          }
        } catch (err) {
          reject(err);
        }
      }).listen(3000, () => {
        // open the browser to the authorize url to start the workflow
        opn(authorizeUrl, {wait: false}).then(cp => cp.unref());
      });
    destroyer(server);
  });
}

//
async function runSample() {
 console.log("=== auth Passed - let's call the service ===");
  const res = await webmasters.searchanalytics.query({
    siteUrl: 'http://greenido.wordpress.com', //'elischwartz.co', 
    requestBody: {
      startDate: '2022-01-01',
      endDate: '2022-12-30',
    },
  });
  console.log(res.data);
  return res.data;
}

const scopes = [
    'https://www.googleapis.com/auth/webmasters',
    'https://www.googleapis.com/auth/webmasters.readonly',
];
authenticate(scopes)
  .then(client => runSample(client))
  .catch(console.error);