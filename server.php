
---

# `server.js`
```js
/**
 * server.js
 * Main server: provides endpoints to trigger migration and download reports.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { getIceWarpUsers, fetchVCFFilesForUser, fetchICSFilesForUser } = require('./lib/icewarp');
const { parseVCardBufferToContacts, parseICSBufferToEvents } = require('./lib/parsers');
const { getGraphToken, postContact, postEvent } = require('./lib/graph');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const pLimit = require('p-limit');
const winston = require('winston');

// ---- Configuration (env recommended) ----
const CONFIG = {
  ICEWARP_HOST: process.env.ICEWARP_HOST || 'your-icewarp-host.com',
  ICEWARP_PORT: process.env.ICEWARP_PORT || 8383,
  ICEWARP_ADMIN_USER: process.env.ICEWARP_ADMIN_USER || 'icewarp-admin',
  ICEWARP_ADMIN_PASS: process.env.ICEWARP_ADMIN_PASS || 'icewarp-pass',

  M365_TENANT_ID: process.env.M365_TENANT_ID || 'your-tenant-id',
  M365_CLIENT_ID: process.env.M365_CLIENT_ID || 'your-client-id',
  M365_CLIENT_SECRET: process.env.M365_CLIENT_SECRET || 'your-client-secret',

  CONCURRENCY: parseInt(process.env.CONCURRENCY || '10'),
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE || '20'),
  REPORTS_DIR: path.join(__dirname, 'reports')
};

if (!fs.existsSync(CONFIG.REPORTS_DIR)) fs.mkdirSync(CONFIG.REPORTS_DIR, { recursive: true });

// ---- Logger ----
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.simple()),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(CONFIG.REPORTS_DIR, 'export.log') })
  ]
});

const app = express();
app.use(express.json());

// Health route
app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// Export route - starts a single run (synchronous to client, but can be adapted to async job queue)
app.post('/export', async (req, res) => {
  const usersOverride = req.body && req.body.users; // optional array of usernames
  logger.info('Export requested');

  try {
    const users = usersOverride && usersOverride.length ? usersOverride.map(u => ({ username: u })) : await getIceWarpUsers(CONFIG);
    if (!users || users.length === 0) return res.status(400).json({ error: 'No users discovered or provided' });

    const reportRows = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(CONFIG.REPORTS_DIR, `export-report-${timestamp}.csv`);

    // CSV writer
    const csvWriter = createCsvWriter({
      path: reportPath,
      header: [
        {id:'username', title:'username'},
        {id:'type', title:'type'},
        {id:'sourceFile', title:'sourceFile'},
        {id:'objectId', title:'objectId'},
        {id:'status', title:'status'},
        {id:'message', title:'message'}
      ]
    });

    const token = await getGraphToken(CONFIG);
    const limit = pLimit(CONFIG.CONCURRENCY);

    // iterate users sequentially to reduce load; inner operations are concurrent-limited
    for (const user of users) {
      logger.info(`Processing ${user.username}`);

      // Contacts
      try {
        const vcfFiles = await fetchVCFFilesForUser(CONFIG, user.username);
        for (const file of vcfFiles) {
          const buf = Buffer.from(file.content, 'utf8');
          const contacts = parseVCardBufferToContacts(buf);
          for (const contact of contacts) {
            await limit(async () => {
              try {
                const result = await postContact(token, user.username, contact, CONFIG);
                reportRows.push({ username: user.username, type: 'contact', sourceFile: file.path, objectId: result.id || '', status: 'ok', message: '' });
              } catch (err) {
                logger.error(`Contact import failed for ${user.username}: ${err.message}`);
                reportRows.push({ username: user.username, type: 'contact', sourceFile: file.path, objectId: '', status: 'failed', message: err.message });
              }
            });
          }
        }
      } catch (err) {
        logger.error(`Contacts pipeline error for ${user.username}: ${err.message}`);
      }

      // Calendar events
      try {
        const icsFiles = await fetchICSFilesForUser(CONFIG, user.username);
        for (const file of icsFiles) {
          const buf = Buffer.from(file.content, 'utf8');
          const events = parseICSBufferToEvents(buf, user.timeZone || 'UTC');
          for (const ev of events) {
            await limit(async () => {
              try {
                const result = await postEvent(token, user.username, ev, CONFIG);
                reportRows.push({ username: user.username, type: 'event', sourceFile: file.path, objectId: result.id || '', status: 'ok', message: '' });
              } catch (err) {
                logger.error(`Event import failed for ${user.username}: ${err.message}`);
                reportRows.push({ username: user.username, type: 'event', sourceFile: file.path, objectId: '', status: 'failed', message: err.message });
              }
            });
          }
        }
      } catch (err) {
        logger.error(`Calendar pipeline error for ${user.username}: ${err.message}`);
      }
    }

    // write CSV
    await csvWriter.writeRecords(reportRows);
    logger.info(`Report written to ${reportPath}`);

    res.json({ ok: true, report: `/reports/${path.basename(reportPath)}` });
  } catch (err) {
    logger.error('Export failed: ' + err.message);
    res.status(500).json({ error: err.message });
  }
});

// Serve reports static
app.use('/reports', express.static(path.join(__dirname, 'reports')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`Server started on ${PORT}`));
