# Firebase Hosting Configuration Guide

This document explains the Firebase Hosting configuration for the DCMCO Next.js static site.

## Configuration Files

### `firebase.json` - Main Configuration

#### 1. Basic Settings

```json
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "cleanUrls": true,
    "trailingSlash": false
  }
}
```

**Explanation:**
- `public: "out"` - Points to Next.js static export directory
- `ignore` - Files to exclude from deployment
- `cleanUrls: true` - Removes `.html` from URLs (`/about.html` → `/about`)
- `trailingSlash: false` - Matches your `next.config.mjs` setting

#### 2. Cache Headers Strategy

Our caching strategy optimizes for:
- **Performance**: Long cache times for immutable assets
- **Freshness**: No cache for HTML to get latest content
- **CDN efficiency**: Uses `s-maxage` for CDN caching

##### Images (30 days)
```json
{
  "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|ico|avif)",
  "headers": [{
    "key": "Cache-Control",
    "value": "public, max-age=2592000, s-maxage=2592000"
  }]
}
```
- **Why 30 days?** Good balance between caching and content updates
- **`s-maxage`**: Allows CDN to cache separately from browser

##### Fonts (1 year, immutable)
```json
{
  "source": "**/*.@(woff|woff2|ttf|otf|eot)",
  "headers": [{
    "key": "Cache-Control",
    "value": "public, max-age=31536000, immutable"
  }]
}
```
- **Why immutable?** Fonts rarely change
- **1 year**: Maximum practical cache time
- **immutable**: Tells browser file will never change

##### Next.js Hashed Assets (1 year, immutable)
```json
{
  "source": "_next/static/**",
  "headers": [{
    "key": "Cache-Control",
    "value": "public, max-age=31536000, immutable"
  }]
}
```
- **Critical for performance**: These files have content hashes in names
- **Safe to cache forever**: If content changes, filename changes
- **Example**: `main-ff834b5b50cc26ae.js` - hash is part of filename

##### Non-hashed JS/CSS (1 hour)
```json
{
  "source": "**/*.@(js|css)",
  "headers": [{
    "key": "Cache-Control",
    "value": "public, max-age=3600, s-maxage=3600"
  }]
}
```
- **Why 1 hour?** Short enough to get updates quickly
- **Covers**: Any non-hashed assets not in `_next/static/`

##### HTML Files (No cache)
```json
{
  "source": "**/*.html",
  "headers": [{
    "key": "Cache-Control",
    "value": "public, max-age=0, must-revalidate"
  }]
}
```
- **Critical**: HTML must always be fresh
- **Why?** HTML references versioned assets, so it's the entry point
- **`must-revalidate`**: Forces revalidation even with back button

#### 3. Security Headers

Applied to ALL files:

```json
{
  "source": "**",
  "headers": [
    {
      "key": "X-Content-Type-Options",
      "value": "nosniff"
    },
    {
      "key": "X-Frame-Options",
      "value": "SAMEORIGIN"
    },
    {
      "key": "X-XSS-Protection",
      "value": "1; mode=block"
    },
    {
      "key": "Referrer-Policy",
      "value": "strict-origin-when-cross-origin"
    }
  ]
}
```

**Security benefits:**
- **X-Content-Type-Options: nosniff** - Prevents MIME-type sniffing attacks
- **X-Frame-Options: SAMEORIGIN** - Prevents clickjacking (only allow same-origin framing)
- **X-XSS-Protection** - Enables browser's XSS filter
- **Referrer-Policy** - Controls referer information sent with requests

#### 4. Redirects

```json
{
  "redirects": [
    {
      "source": "/index.html",
      "destination": "/",
      "type": 301
    }
  ]
}
```

**Why?**
- Ensures canonical URL is always `/` not `/index.html`
- 301 = Permanent redirect (good for SEO)
- Prevents duplicate content

---

## Why No Rewrites?

You might notice there's NO `rewrites` section. This is **intentional** for Next.js static exports:

**With Static Export:**
- Next.js pre-renders all pages as HTML files
- `/about` → exists as `about.html` (with `cleanUrls: true`)
- `/blog/post` → exists as `blog/post.html`
- No server-side routing needed!

**If you used rewrites (WRONG for static export):**
```json
// DON'T DO THIS for static exports!
"rewrites": [{
  "source": "**",
  "destination": "/index.html"
}]
```
This would break all routes because it sends everything to index.html (SPA pattern), but Next.js static export creates separate HTML files for each route.

---

## `.firebaserc` - Project Configuration

```json
{
  "projects": {
    "default": "dcmco-prod-2026"
  }
}
```

**Note:** This file is git-ignored to allow different developers to use different projects. You can add staging/production aliases:

```json
{
  "projects": {
    "default": "dcmco-prod-2026",
    "staging": "dcmco-staging-project",
    "production": "dcmco-prod-2026"
  }
}
```

Then deploy to specific environments:
```bash
firebase deploy --only hosting --project staging
firebase deploy --only hosting --project production
```

---

## Best Practices

### ✅ DO:

1. **Keep HTML uncached** - It's the entry point that references versioned assets
2. **Use immutable for hashed assets** - Next.js includes content hashes in `_next/static/`
3. **Set security headers** - Protection against common attacks
4. **Use cleanUrls** - Better UX and SEO
5. **Match trailingSlash** - Keep consistent with `next.config.mjs`

### ❌ DON'T:

1. **Don't add SPA rewrites** - Not needed for Next.js static export
2. **Don't cache HTML** - You'll serve stale versions
3. **Don't use short cache for hashed assets** - Defeats the purpose
4. **Don't commit `.firebaserc`** - Keep it local or use environment-specific configs
5. **Don't skip security headers** - Easy wins for security

---

## Common Issues & Solutions

### Issue: "Page not found" errors

**Cause:** `cleanUrls: true` expects files without `.html` extension
**Solution:** Next.js automatically creates the right structure with `output: 'export'`

### Issue: Old content showing after deploy

**Cause:** Browser cached HTML files
**Solution:**
- Check `Cache-Control` headers for HTML are `max-age=0`
- Clear browser cache
- Check Firebase Hosting cache isn't too aggressive

### Issue: Assets returning 404

**Cause:** Wrong `public` directory or build not complete
**Solution:**
- Verify `pnpm build` completed successfully
- Check `out/` directory contains all files
- Verify `public: "out"` in `firebase.json`

---

## Deployment Commands

### Local Development
```bash
# Build Next.js site
pnpm build

# Test locally
firebase serve --only hosting
# Visit: http://localhost:5000

# Preview before deploying
firebase hosting:channel:deploy preview
```

### Production Deployment
```bash
# Deploy to default project
firebase deploy --only hosting

# Deploy to specific project
firebase deploy --only hosting --project dcmco-prod-2026

# Deploy with message
firebase deploy --only hosting -m "Deploy v1.2.3"
```

### Rollback
```bash
# List recent deployments
firebase hosting:releases:list

# Rollback to previous version
firebase hosting:rollback
```

---

## Performance Checklist

After deployment, verify:

- [ ] HTML files have `Cache-Control: public, max-age=0, must-revalidate`
- [ ] `_next/static/*` files have `Cache-Control: public, max-age=31536000, immutable`
- [ ] Images have 30-day cache
- [ ] Fonts have 1-year immutable cache
- [ ] Security headers are present on all responses
- [ ] `cleanUrls` working (no `.html` in URLs)
- [ ] 404 page displays correctly

**Verification:**
```bash
# Check cache headers
curl -I https://dcmco-prod-2026.web.app/

# Check security headers
curl -I https://dcmco-prod-2026.web.app/ | grep -E "X-.*|Referrer"

# Check specific asset
curl -I https://dcmco-prod-2026.web.app/_next/static/chunks/main.js
```

---

## Firebase Hosting Limits (Free Tier)

- **Storage:** 10 GB
- **Bandwidth:** 360 MB/day
- **Custom domains:** Unlimited
- **SSL:** Automatic and free
- **CDN:** Global, included

**When you exceed free tier:**
- Blaze (pay-as-you-go) plan automatically activates
- Pricing: $0.026/GB storage, $0.15/GB bandwidth
- Still very affordable for most sites

---

## Migration from GCS

### Key Differences

| Feature | GCS | Firebase Hosting |
|---------|-----|------------------|
| **URL** | `storage.googleapis.com/bucket/index.html` | `project.web.app` |
| **SSL** | Manual setup with Load Balancer | Automatic |
| **CDN** | Requires Load Balancer | Built-in |
| **Cache Control** | Set via gsutil | Set via firebase.json |
| **Deploys** | rsync with gsutil | `firebase deploy` |
| **Rollbacks** | Manual | Built-in CLI command |
| **Preview URLs** | No | Yes (channel previews) |

### Advantages of Firebase Hosting

1. ✅ **Simpler deployment** - One command vs multiple gsutil commands
2. ✅ **Better URLs** - Clean, professional domains
3. ✅ **Free SSL** - No Load Balancer needed
4. ✅ **Built-in CDN** - Global edge caching
5. ✅ **Easy rollbacks** - One command to revert
6. ✅ **Preview channels** - Test before going live

---

## Next Steps

1. **Test locally:** `firebase serve`
2. **Deploy to staging:** Create a preview channel
3. **Verify performance:** Check cache headers
4. **Update CI/CD:** Migrate GitHub Actions from GCS to Firebase
5. **Add custom domain:** (optional) Use your own domain

Need help with any of these? Check the main README or deployment docs!
