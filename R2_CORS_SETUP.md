You need to configure CORS on your R2 bucket. Here's how:

### Option 1: Using Cloudflare Dashboard (Easiest)

1. Go to https://dash.cloudflare.com
2. Click on **R2** in the left sidebar
3. Click on your bucket name
4. Click **Settings** tab
5. Scroll to **CORS Policy**
6. Click **Add CORS Policy** or **Edit**
7. Paste this:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

8. Click **Save**

### Option 2: Using Wrangler CLI

If you have Wrangler installed:

```bash
wrangler r2 bucket cors put YOUR_BUCKET_NAME --rules '[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]'
```

Replace `YOUR_BUCKET_NAME` with your actual bucket name.

### For Production (More Secure)

Instead of `"*"`, use your actual domain:

```json
{
  "AllowedOrigins": ["https://yourdomain.com", "http://localhost:4321"],
  "AllowedMethods": ["GET", "HEAD"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3600
}
```

## That's It!

After configuring CORS:
1. Clear your browser cache (or open incognito)
2. Try editing an SVG again
3. It should work now!

## Why This is Safe

- We're only allowing `GET` and `HEAD` requests (read-only)
- No write access to your bucket
- Standard practice for public file storage
