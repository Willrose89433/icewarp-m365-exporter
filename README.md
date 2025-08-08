# icewarp-m365-exporter
## Deployment Steps

### 1. Save files

   Save the Dockerfile in your project root (icewarp-m365-exporter/).
   Save the docker-compose.yml in the same directory.

### 2. Build the container

  ```
   docker-compose build
   ```
   
### 3. Start the service

  ```
   docker-compose up -d
   ```

### 4. Check logs

```
   docker-compose logs -f
  ```

### 5. Trigger export

```
   curl -X POST http://localhost:3000/export \
     -H "Content-Type: application/json" \
     -d '{"users":["user1@example.com","user2@example.com"]}'
```
    

### 6. Get the report

   Reports will be saved locally in ./reports.

## Security Notes

  Never hardcode passwords or secrets in the Dockerfile — they’re set as environment variables in docker-compose.yml.
  If deploying to production, use a secrets manager (e.g., AWS Secrets Manager, Vault, Azure Key Vault) instead of .env or plain docker-compose vars.
  The reports folder is mounted as a volume so that CSVs persist even if the container restarts.
