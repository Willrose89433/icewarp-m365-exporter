/**
 * lib/icewarp.js
 * Helpers to connect to IceWarp WebDAV and fetch user list, VCF and ICS files.
 */

const { createClient } = require('webdav');

async function createWebdavClient(CONFIG) {
  const url = `https://${CONFIG.ICEWARP_HOST}:${CONFIG.ICEWARP_PORT}`;
  return createClient(url, { username: CONFIG.ICEWARP_ADMIN_USER, password: CONFIG.ICEWARP_ADMIN_PASS });
}

/**
 * Discover users by listing /users/ directory on IceWarp.
 * Returns array of { username }.
 */
async function getIceWarpUsers(CONFIG) {
  const client = await createWebdavClient(CONFIG);
  const usersRoot = '/users/';
  const list = await client.getDirectoryContents(usersRoot);
  const dirs = list.filter(i => i.type === 'directory');
  if (dirs.length === 0) throw new Error('No users discovered; configure users manually.');
  return dirs.map(d => {
    const name = d.basename || d.filename.split('/').filter(Boolean).pop();
    // If your system uses mail-format usernames, you may need a mapping step here.
    return { username: name };
  });
}

/**
 * Fetch all .vcf files under a user's Contacts folder.
 * Returns array of { path, content }.
 */
async function fetchVCFFilesForUser(CONFIG, username) {
  const client = await createWebdavClient(CONFIG);
  const contactsPath = `/users/${username}/Contacts/`;
  try {
    const list = await client.getDirectoryContents(contactsPath);
    const files = list.filter(f => f.type === 'file' && f.basename && f.basename.toLowerCase().endsWith('.vcf'));
    const results = [];
    for (const f of files) {
      const content = await client.getFileContents(f.filename, { format: 'text' });
      results.push({ path: f.filename, content });
    }
    return results;
  } catch (err) {
    // If folder missing, return empty list
    return [];
  }
}

/**
 * Fetch all .ics files under a user's Calendar folder.
 * Returns array of { path, content }.
 */
async function fetchICSFilesForUser(CONFIG, username) {
  const client = await createWebdavClient(CONFIG);
  const calPath = `/users/${username}/Calendar/`;
  try {
    const list = await client.getDirectoryContents(calPath);
    const files = list.filter(f => f.type === 'file' && f.basename && f.basename.toLowerCase().endsWith('.ics'));
    const results = [];
    for (const f of files) {
      const content = await client.getFileContents(f.filename, { format: 'text' });
      results.push({ path: f.filename, content });
    }
    return results;
  } catch (err) {
    return [];
  }
}

module.exports = { getIceWarpUsers, fetchVCFFilesForUser, fetchICSFilesForUser };
