1. Install dependencies:

bash
npm install


2. Fill in configuration in server.js or via environment variables (recommended):

ICEWARP_HOST, ICEWARP_PORT, ICEWARP_ADMIN_USER, ICEWARP_ADMIN_PASS

M365_TENANT_ID, M365_CLIENT_ID, M365_CLIENT_SECRET

3. Start server:

bash
npm start

4. Use the /export endpoint (POST) to start an export run. See server routes in server.js.

--Security--
A. Do not expose your client secrets in public. Use environment variables or a secure secrets store.
B.Run this on a secure internal server or admin machine.

--Files--
server.js - main express server and orchestration
lib/icewarp.js - WebDAV helpers to list and fetch files
lib/graph.js - Graph auth, request helpers, batching/retries
lib/parsers.js - VCF and ICS parsing utilities


--Create the directories and files--
Create the project folder:

mkdir icewarp-m365-exporter
cd icewarp-m365-exporter
mkdir lib reports

  -Create the files above in . and ./lib/

--Install and run--
npm install
# set env variables (example)
export ICEWARP_HOST=your-icewarp-host.com
export ICEWARP_PORT=8383
export ICEWARP_ADMIN_USER=icewarp-admin
export ICEWARP_ADMIN_PASS=secret
export M365_TENANT_ID=your-tenant-id
export M365_CLIENT_ID=your-client-id
export M365_CLIENT_SECRET=your-client-secret

npm start

--Trigger an export (example curl)--
  -To export all discovered users:

curl -X POST http://localhost:3000/export -H "Content-Type: application/json"

   -To export a specific list of users:
curl -X POST http://localhost:3000/export -H "Content-Type: application/json" -d '{"users":["user1@example.com","user2@example.com"]}'


--Notes, tips & troubleshooting--
-IceWarp folder layout: This code assumes IceWarp exposes user content under /users/<username>/Contacts/ and /users/<username>/Calendar/. If your IceWarp layout is different, update lib/icewarp.js.

-Secrets: Use environment variables or a secrets manager in production — do not commit M365_CLIENT_SECRET to source control.

-Throttling: The Graph helper does retries/backoff; consider catching 429 specifically and applying longer backoff.

-Large migrations: For many users or huge mailboxes, consider converting this to a queued job runner (BullMQ + Redis) and add resume points.

-Field mapping: The vcf mapping is minimal. If you need extra vCard fields (photos, multiple addresses, custom fields), I can extend lib/parsers.js.

-Testing: Test on a small subset of users first and inspect logs in reports/export.log and the CSV reports in reports/.
