# IceWarp → Microsoft 365 Exporter (Node.js)

This project migrates contacts (VCF) and calendar events (ICS) from IceWarp via WebDAV into Microsoft 365 mailboxes via Microsoft Graph API.

**Features implemented**:
- Backend token exchange (Client Credentials) — secrets stay on server.
- WebDAV download of VCF and ICS files (using `webdav`).
- Robust parsing of ICS with timezone (`node-ical`) and VCF using `vcf` package.
- Batching, concurrency limits, and exponential retry with backoff for Graph requests (`p-limit` and custom retry).
- CSV reporting (success/failure) saved under `reports/` with downloadable link.
- Winston logging (file + console).

## Quickstart

1. Install dependencies:

```bash
npm install
