/**
 * lib/parsers.js
 * VCF and ICS parsing utilities.
 * Uses 'vcf' for vCard parsing and 'node-ical' for ICS parsing including VTIMEZONE.
 */

const vcf = require('vcf');
const ical = require('node-ical');

/**
 * Parse VCF buffer/string into array of Microsoft Graph contact objects.
 */
function parseVCardBufferToContacts(buf) {
  const text = buf.toString('utf8');
  const parser = new vcf();
  const contacts = [];
  try {
    parser.parse(text);
    const cards = parser.get(); // returns array of vCard objects
    for (const card of cards) {
      const givenName = card.get('n') ? card.get('n').valueOf().split(';')[1] : '';
      const surname = card.get('n') ? card.get('n').valueOf().split(';')[0] : '';
      const emails = [];
      if (card.get('email')) {
        const e = card.get('email');
        if (Array.isArray(e)) {
          for (const em of e) emails.push({ address: em.valueOf(), name: '' });
        } else emails.push({ address: e.valueOf(), name: '' });
      }
      const phones = [];
      if (card.get('tel')) {
        const t = card.get('tel');
        if (Array.isArray(t)) for (const p of t) phones.push(p.valueOf()); else phones.push(t.valueOf());
      }

      const contact = { givenName: givenName || card.get('fn')?.valueOf() || '', surname: surname || '', businessPhones: phones, emailAddresses: emails };
      contacts.push(contact);
    }
  } catch (err) {
    // fallback: try simple split based parser
  }
  return contacts;
}

/**
 * Parse ICS buffer/string into array of Microsoft Graph event objects.
 * Uses node-ical which handles VTIMEZONE and recurrence fairly well.
 */
function parseICSBufferToEvents(buf, defaultTimeZone='UTC') {
  const text = buf.toString('utf8');
  const data = ical.parseICS(text);
  const events = [];
  for (const k in data) {
    if (!Object.prototype.hasOwnProperty.call(data, k)) continue;
    const item = data[k];
    if (item.type === 'VEVENT') {
      const ev = {
        subject: item.summary || '(no subject)',
        body: { contentType: 'Text', content: item.description || '' },
        start: { dateTime: item.start instanceof Date ? item.start.toISOString() : new Date(item.start).toISOString(), timeZone: defaultTimeZone },
        end: { dateTime: item.end instanceof Date ? item.end.toISOString() : new Date(item.end).toISOString(), timeZone: defaultTimeZone },
        attendees: []
      };
      if (item.attendee) {
        const at = item.attendee;
        if (Array.isArray(at)) {
          for (const a of at) ev.attendees.push({ emailAddress: { address: a.replace('mailto:',''), name: '' }, type: 'required' });
        } else {
          ev.attendees.push({ emailAddress: { address: (''+at).replace('mailto:',''), name: '' }, type: 'required' });
        }
      }
      if (item.location) ev.location = { displayName: item.location };
      events.push(ev);
    }
  }
  return events;
}

module.exports = { parseVCardBufferToContacts, parseICSBufferToEvents };
