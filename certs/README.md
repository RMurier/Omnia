# SSL Certificates

This directory should contain your SSL certificates for HTTPS.

## Structure

```
certs/
├── dev/
│   ├── fullchain.pem    # Full certificate chain
│   └── privkey.pem      # Private key
└── prod/
    ├── fullchain.pem    # Full certificate chain
    └── privkey.pem      # Private key
```

## Generating Certificates

### Option 1: Let's Encrypt (Recommended for production)

Use certbot to generate free SSL certificates:

```bash
certbot certonly --standalone -d your-domain.com
```

Certificates will be in `/etc/letsencrypt/live/your-domain.com/`

### Option 2: Self-signed (Development only)

```bash
# Generate self-signed certificate for development
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/dev/privkey.pem \
  -out certs/dev/fullchain.pem \
  -subj "/CN=localhost"
```

## Important

- **Never commit real certificates to git**
- The `.gitignore` should exclude `*.pem` files
- Store production certificates securely
