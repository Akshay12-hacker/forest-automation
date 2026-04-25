# Online License and Permit Tracking

This app can now use an online license server and report confirmed permit counts.

## Environment Variables

Set these on the client machine before launching the desktop app:

```powershell
$env:FOREST_LICENSE_SERVER_URL="https://your-server.example.com"
$env:FOREST_TELEMETRY_URL="https://your-server.example.com/telemetry/permit"
$env:FOREST_TELEMETRY_API_KEY="replace-with-telemetry-key"
$env:FOREST_APP_VERSION="1.0.0"
```

If `FOREST_LICENSE_SERVER_URL` is not set, the app keeps using the local machine-bound license file.

## Local Test Server

For testing only:

```powershell
$env:FOREST_ADMIN_API_KEY="admin-secret"
$env:FOREST_TELEMETRY_API_KEY="telemetry-secret"
python tools/online_license_server.py --host 127.0.0.1 --port 8765
```

Create an online license:

```powershell
$body = @{
  machine_id = "PASTE_MACHINE_ID"
  days = 15
  customer = "Customer Name"
  plan = "trial"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8765/admin/licenses" `
  -Headers @{ Authorization = "Bearer admin-secret" } `
  -ContentType "application/json" `
  -Body $body
```

Use the returned `license_key` in the app Settings panel.

Track permit counts:

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://127.0.0.1:8765/admin/stats" `
  -Headers @{ Authorization = "Bearer admin-secret" }
```

## Production Notes

- Use HTTPS only.
- Change all API keys before deployment.
- Put the server behind a firewall or reverse proxy.
- Back up `license_server.db`.
- For serious production licensing, replace this simple server with a hosted API using asymmetric response signatures.
