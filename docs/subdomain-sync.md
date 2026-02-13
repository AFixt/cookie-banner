# Subdomain Consent Synchronization

The Cookie Banner includes an enterprise feature for synchronizing consent across multiple subdomains of the same organization. This ensures users only need to provide consent once for all your properties.

## Overview

Subdomain sync allows consent given on one subdomain (e.g., `www.example.com`) to be automatically shared with other subdomains (e.g., `app.example.com`, `shop.example.com`).

## Setup

### 1. Enable Subdomain Sync

Initialize the cookie banner with subdomain sync configuration:

```javascript
window.initCookieBanner({
  // Standard configuration
  locale: 'en',
  theme: 'light',
  
  // Subdomain sync configuration
  subdomainSync: {
    enabled: true,
    primaryDomain: 'example.com',
    allowedSubdomains: ['www', 'app', 'shop', 'blog'],
    syncInterval: 5000 // Check for updates every 5 seconds
  }
});
```

### 2. Host the Sync Endpoint

Copy the `cookie-consent-sync.html` file to your primary domain's root directory:

```bash
# The file should be accessible at:
https://example.com/cookie-consent-sync.html
```

Update the configuration in the file to match your domain:

```javascript
const PRIMARY_DOMAIN = 'example.com'; // Your primary domain
const ALLOWED_SUBDOMAINS = ['app', 'www', 'shop', 'blog']; // Your subdomains
```

### 3. Configure CORS (if using API sync)

If using API-based synchronization instead of postMessage:

```javascript
window.initCookieBanner({
  subdomainSync: {
    enabled: true,
    primaryDomain: 'example.com',
    usePostMessage: false,
    syncEndpoint: 'https://api.example.com/consent/sync'
  }
});
```

Your API endpoint should handle CORS headers appropriately:

```text
Access-Control-Allow-Origin: https://*.example.com
Access-Control-Allow-Credentials: true
```

## How It Works

### PostMessage Sync (Default)

1. A hidden iframe is created pointing to the sync endpoint on the primary domain
2. Consent changes are communicated via postMessage between domains
3. The sync endpoint validates origins and manages consent storage
4. Updates are broadcast to all connected subdomains

### API Sync (Optional)

1. Consent changes are sent to a central API endpoint
2. Each subdomain periodically fetches the latest consent from the API
3. Timestamps ensure only the most recent consent is used

## Security Considerations

- **Origin Validation**: All messages are validated against the allowed domains list
- **HTTPS Only**: Sync only works over secure connections
- **Timestamp Verification**: Older consent data is never allowed to overwrite newer data
- **Sandboxed Iframes**: The sync iframe runs in a sandboxed environment

## API Reference

### Initialize Subdomain Sync

```javascript
window.CookieConsentSync.init({
  enabled: true,
  primaryDomain: 'example.com',
  allowedSubdomains: ['www', 'app', 'shop'],
  syncInterval: 5000,
  usePostMessage: true
});
```

### Check Sync Status

```javascript
const status = window.CookieConsentSync.getStatus();
console.log(status);
// {
//   enabled: true,
//   primaryDomain: 'example.com',
//   currentDomain: 'app.example.com',
//   isAllowed: true,
//   syncMethod: 'postMessage',
//   isActive: true
// }
```

### Stop Synchronization

```javascript
window.CookieConsentSync.stop();
```

## Troubleshooting

### Sync Not Working

1. **Check Console**: Look for error messages prefixed with `[Cookie Banner]` or `[Consent Sync]`
2. **Verify Domain Configuration**: Ensure all subdomains are listed in `allowedSubdomains`
3. **Check HTTPS**: Sync only works over secure connections
4. **Validate Sync Endpoint**: Visit `https://yourdomain.com/cookie-consent-sync.html` directly

### Common Issues

- **"Current domain not in allowed subdomains list"**: Add your subdomain to the configuration
- **"Rejected message from unauthorized origin"**: Check that origins match exactly (including protocol)
- **No sync occurring**: Ensure the sync endpoint is accessible and returns 200 OK

## Browser Support

Subdomain sync requires:

- postMessage API (IE8+)
- localStorage API (IE8+)
- Modern browsers recommended for best performance

## Privacy Compliance

This feature is designed to improve user experience while maintaining privacy compliance:

- Consent is only shared within your organization's domains
- No third-party services are involved
- Users maintain full control over their consent choices
- All GDPR/CCPA requirements are maintained
