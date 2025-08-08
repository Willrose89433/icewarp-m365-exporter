/**
 * lib/graph.js
 * Microsoft Graph authentication (client credentials) and small helpers for posting contacts/events.
 * Implements simple retry/backoff for transient failures.
 */

const axios = require('axios');

async function getGraphToken(CONFIG) {
  const url = `https://login.microsoftonline.com/${CONFIG.M365_TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('grant_type','client_credentials');
  params.append('client_id', CONFIG.M365_CLIENT_ID);
  params.append('client_secret', CONFIG.M365_CLIENT_SECRET);
  params.append('scope','https://graph.microsoft.com/.default');

  const r = await axios.post(url, params.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  return r.data.access_token;
}

async function retry(fn, attempts=3, baseMs=500) {
  let i = 0;
  while (i < attempts) {
    try { return await fn(); } catch (err) {
      i++;
      if (i >= attempts) throw err;
      const wait = baseMs * Math.pow(2, i-1) + Math.floor(Math.random()*100);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

async function postContact(token, username, contact, CONFIG) {
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(username)}/contacts`;
  const res = await retry(async () => {
    return axios.post(url, contact, { headers: { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' } });
  });
  return res.data;
}

async function postEvent(token, username, eventObj, CONFIG) {
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(username)}/calendar/events`;
  const res = await retry(async () => {
    return axios.post(url, eventObj, { headers: { Authorization: `Bearer ${token}`, 'Content-Type':'application/json', Authorization: `Bearer ${token}` } });
  });
  return res.data;
}

module.exports = { getGraphToken, postContact, postEvent };
