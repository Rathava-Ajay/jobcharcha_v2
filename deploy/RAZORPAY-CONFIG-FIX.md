# Payment failing with "Authentication failed" (401) — fix

## What's wrong

`PaymentLogs` on the production DB shows every recent order-create attempt failing:

```
order.create_failed | Razorpay order creation failed (401): {"error":{"description":"Authentication failed"}}
```

The running API does not have valid Razorpay API credentials. In **Production**:

- user-secrets are **not** loaded (that's a dev-only source), and
- `appsettings.Production.json` ships `Razorpay:KeyId` / `KeySecret` / `WebhookSecret` as empty strings on purpose,

so the credentials have to come from **environment variables** on the host. They're missing or wrong.

Verified working live credentials (read-only `GET /v1/payments` probe returns HTTP 200):

| Field | Value |
|---|---|
| `Razorpay__KeyId` | `rzp_live_S3Q4YDApitfjh3` |
| `Razorpay__KeySecret` | `h3KFlVIJyYj5r1jm6X4TPp6G`  (note the `3` after `h` — the truncated `hKFlVIJyYj5r1jm6X4TPp6G` gives 401) |
| `Razorpay__WebhookSecret` | **separate value** from Razorpay Dashboard → Settings → Webhooks — still a placeholder; webhooks stay rejected until this is set (checkout itself does not depend on it) |

## Fix on the server (`srv1196352`)

```bash
sudo mkdir -p /etc/jobcharcha
sudo cp deploy/jobcharcha-api.env.example /etc/jobcharcha/jobcharcha-api.env
sudo nano /etc/jobcharcha/jobcharcha-api.env      # fill in real values (DB, Jwt__Key, Razorpay__*, Smtp__*)
sudo chmod 600 /etc/jobcharcha/jobcharcha-api.env
sudo chown root:root /etc/jobcharcha/jobcharcha-api.env

# if the service unit isn't installed yet:
sudo cp deploy/systemd/jobcharcha-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now jobcharcha-api

sudo systemctl restart jobcharcha-api
```

If the unit already exists with inline `Environment=` lines instead of an `EnvironmentFile=`, just add/correct the three `Razorpay__*` lines there and `daemon-reload` + `restart`.

## Verify without taking a real payment

1. `journalctl -u jobcharcha-api -n 50` — the `CONFIG: Razorpay:KeySecret is not set in Production` CRITICAL line must be gone on startup.
2. Log into the site as an admin → **Admin Dashboard → Payments** tab. The new **"Razorpay gateway"** banner at the top must read **Connected** (green). It runs a read-only auth probe — no money moves.
3. Only then do a real end-to-end payment (small amount, e.g. a ₹49 test) and confirm: checkout modal opens → pay → redirected back → access unlocked, and the `PaymentLogs` row is `order.created` then `payment.captured`, not `order.create_failed`.

## Also do (webhooks)

In the Razorpay Dashboard → Settings → Webhooks, confirm the endpoint `https://job.jobcharcha.com/api/payments/webhook` is registered for `payment.captured`, `payment.failed`, `order.paid`, `refund.*`, `payment.dispute.*`, copy its signing secret, and put it in `Razorpay__WebhookSecret`. Until then the app still works via the browser `/verify` callback, and the hourly reconciliation job is the safety net for dropped callbacks — but genuine webhook deliveries are logged as `webhook.signature_invalid`.
