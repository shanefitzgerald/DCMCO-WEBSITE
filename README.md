# DCMCO Website

[![Deploy to Staging](https://github.com/shanefitzgerald/DCMCO-WEBSITE/actions/workflows/deploy-staging.yml/badge.svg)](https://github.com/shanefitzgerald/DCMCO-WEBSITE/actions/workflows/deploy-staging.yml)
[![Deploy to Production](https://github.com/shanefitzgerald/DCMCO-WEBSITE/actions/workflows/deploy-production.yml/badge.svg)](https://github.com/shanefitzgerald/DCMCO-WEBSITE/actions/workflows/deploy-production.yml)

The official marketing website for DCM CO, a leading AI consultancy specializing in the construction industry.

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (Pages Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [@dcmco/design-system](https://github.com/dcmco/design-system) (Stitches-based)
- **Output**: Static Export (configured for GCS hosting)
- **Code Quality**: ESLint + Prettier
- **Package Manager**: pnpm

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.0.0 or higher
- **pnpm**: v8.0.0 or higher (or npm/yarn)
- **GCP CLI**: For authenticating with GCP Artifact Registry

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd dcmco-website
```

### 2. Authenticate with GCP Artifact Registry

This project uses the `@dcmco/design-system` package hosted on GCP Artifact Registry. You need to authenticate before installing dependencies.

```bash
# Copy the example npm configuration
cp .npmrc.example .npmrc

# Authenticate with GCP Artifact Registry
npx google-artifactregistry-auth --repo-config=.npmrc --credential-config=.npmrc
```

This will add your authentication token to the `.npmrc` file. **Note**: `.npmrc` is git-ignored to keep credentials secure.

### 3. Install dependencies

```bash
pnpm install
```

## Development

### Available Commands

```bash
# Start development server (http://localhost:3000)
pnpm dev

# Build for production (outputs to /out directory)
pnpm build

# Start production server (serves the /out directory)
pnpm start

# Run ESLint to check code quality
pnpm lint

# Format code with Prettier
pnpm format
```

### Development Workflow

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

3. Edit files in the `pages/` directory - changes will hot-reload automatically

4. Before committing, run linting and formatting:
   ```bash
   pnpm lint
   pnpm format
   ```

## Project Structure

```
dcmco-website/
├── pages/                  # Next.js pages (file-based routing)
│   ├── _app.tsx           # Custom App wrapper
│   ├── _document.tsx      # Custom Document (HTML structure)
│   ├── index.tsx          # Homepage
│   └── 404.tsx            # Custom 404 page
├── public/                # Static assets (images, fonts, etc.)
├── styles/                # Global styles
├── .npmrc.example         # NPM registry configuration template
├── .prettierrc            # Prettier configuration
├── .eslintrc.json         # ESLint configuration
├── next.config.mjs        # Next.js configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Project dependencies
```

## Adding New Pages

Next.js uses file-based routing. To add a new page:

1. Create a new file in the `pages/` directory:
   ```tsx
   // pages/about.tsx
   import Head from 'next/head';

   export default function About() {
     return (
       <>
         <Head>
           <title>About - DCMCO</title>
           <meta name="description" content="About DCMCO" />
         </Head>
         <main>
           <h1>About Us</h1>
         </main>
       </>
     );
   }
   ```

2. The page will be automatically available at `/about`

3. For nested routes, create folders:
   - `pages/blog/index.tsx` → `/blog`
   - `pages/blog/[slug].tsx` → `/blog/[slug]` (dynamic route)

## Deployment

This project is configured for static export to Google Cloud Storage (GCS) with automated deployments via GitHub Actions.

### Quick Links

- 📖 **[Full Deployment Guide](docs/DEPLOYMENT.md)** - Comprehensive procedures, rollback steps, and troubleshooting
- 🔄 [Staging Deployments](https://github.com/shanefitzgerald/DCMCO-WEBSITE/actions/workflows/deploy-staging.yml) - View staging deployment history
- 🚀 [Production Deployments](https://github.com/shanefitzgerald/DCMCO-WEBSITE/actions/workflows/deploy-production.yml) - View production deployment history

### Automated Deployments

Deployments are automatically triggered when code is pushed to the repository:

- **Staging**: Deploys automatically on push to `main` branch
- **Production**: Requires manual approval via GitHub Actions UI

**To deploy to production:**
1. Go to [Actions](https://github.com/shanefitzgerald/DCMCO-WEBSITE/actions/workflows/deploy-production.yml)
2. Click "Run workflow"
3. Enter `deploy` as confirmation
4. Click "Run workflow" button

### Manual Build Process

```bash
# Build the static site locally
pnpm build
```

This generates static HTML files in the `/out` directory, which can be deployed to:
- Google Cloud Storage (recommended)
- AWS S3
- GitHub Pages
- Any static hosting provider

### Deployment to GCS

The built files in `/out` can be uploaded to a GCS bucket configured for static website hosting.

**Note**: Since this is a static export, API routes and server-side features are not available. All pages are pre-rendered at build time.

### Cache Control Strategy

The deployment workflow automatically sets optimized cache-control headers for different file types:

| File Type | Cache Strategy | Max Age | Rationale |
|-----------|---------------|---------|-----------|
| **HTML files** (`*.html`) | `max-age=0, must-revalidate` | 0 seconds | Always check for updates to ensure users get the latest content |
| **Next.js hashed assets** (`_next/static/**`) | `max-age=31536000, immutable` | 1 year | Safe to cache forever - filename includes content hash |
| **Images** (`*.png, *.jpg, *.svg, etc.`) | `max-age=2592000` | 30 days | Good balance between caching and freshness |
| **Fonts** (`*.woff, *.woff2, etc.`) | `max-age=31536000, immutable` | 1 year | Fonts rarely change, safe to cache long-term |
| **CSS/JS** (non-hashed) | `max-age=3600` | 1 hour | Short cache for non-hashed assets |
| **JSON files** (`*.json`) | `max-age=3600` | 1 hour | Data files that may change |

**Benefits:**
- ✅ Faster page loads for returning visitors
- ✅ Reduced GCS egress costs
- ✅ Proper cache invalidation for content updates
- ✅ Optimized for Next.js build patterns

The cache headers are applied automatically during the GitHub Actions deployment workflow using `gsutil -m` for parallel operations.

### CDN Cache Invalidation

If you're using Google Cloud CDN, the deployment workflow can automatically invalidate the CDN cache after each deployment.

**To enable CDN cache invalidation:**

1. Go to your repository settings: `Settings → Secrets and variables → Actions → Variables`
2. Click "New repository variable"
3. Add the following variable:
   - **Name:** `CDN_URL_MAP`
   - **Value:** Your CDN URL map name (e.g., `dcmco-website-cdn`)

**How it works:**
- After deployment, the workflow checks if `CDN_URL_MAP` is configured
- If configured, it invalidates all paths (`/*`) in the CDN
- Runs asynchronously using `gcloud compute url-maps invalidate-cdn-cache`
- Does not block deployment if invalidation fails
- Shows clear status messages in the deployment logs

**Example:**
```bash
# Find your URL map name
gcloud compute url-maps list

# Set the variable in GitHub
# Settings → Actions → Variables → New variable
# Name: CDN_URL_MAP
# Value: your-url-map-name
```

**Note:** If CDN is not configured, the step is automatically skipped with no impact on deployment.

### Workflow Performance

The deployment workflows are optimized for speed using aggressive caching strategies:

- **Dependencies**: pnpm store cache + infrastructure node_modules cache
- **CDKTF**: CLI global cache + provider bindings cache
- **Build**: Next.js compilation cache
- **Uploads**: Incremental rsync (only changed files)

**Expected Performance:**
- Cold cache (first run): ~4-5 minutes
- Warm cache (typical): ~2-3 minutes
- Code changes only: ~3-4 minutes

For detailed performance optimization documentation, see [`.github/PERFORMANCE.md`](.github/PERFORMANCE.md).

### Deployment Notifications

The workflows include comprehensive notification features to keep you informed about deployment status.

#### GitHub Actions Status Badges

Status badges are displayed at the top of this README, showing the current deployment status for staging and production environments. Click on a badge to view the workflow runs.

#### Enhanced Deployment Summary

Every deployment generates a detailed summary in the GitHub Actions workflow run, including:

- **Status**: Success or failure indicator
- **Environment Details**: Project, bucket, region, workflow run number
- **Deployment Metrics**: Total files deployed, total size, deployment timestamp
- **Quick Links**: Direct links to website, GCS bucket, commit details, and workflow run
- **CDN Status**: Cache invalidation status (if configured)
- **Performance Info**: Deployment strategy and caching summary

#### Automatic Issue Creation on Failure

When a deployment fails, an issue is automatically created with:

- **Detailed failure report** including environment, commit info, and triggered by
- **Quick links** to workflow logs, commit details, and artifacts
- **Next steps** for troubleshooting
- **Automatic labels**: `deployment-failure`, `staging`/`production`, `automated`, `bug`
- **Commit comment** alerting about the failure

Production failures are marked as `critical` for immediate attention.

## Design System

This project uses the `@dcmco/design-system` component library. Import components as needed:

```tsx
import { Button, Logo } from '@dcmco/design-system';

export default function Example() {
  return (
    <div>
      <Logo size="md" />
      <Button variant="primary">Click Me</Button>
    </div>
  );
}
```

Refer to the [design system documentation](https://github.com/dcmco/design-system) for available components and their props.

## Code Quality

### ESLint

This project uses strict ESLint rules for code quality:
- TypeScript strict mode
- No unused variables
- Prefer const over let
- React best practices

### Prettier

Code formatting is enforced with Prettier:
- Single quotes
- 2 space indentation
- Trailing commas (ES5)
- Semi-colons enabled

Run `pnpm format` to auto-format all files.

## Contributing

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

3. Push your branch and create a pull request:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Ensure all checks pass:
   - ESLint: `pnpm lint`
   - TypeScript: `pnpm build`
   - Formatting: `pnpm format`

## Troubleshooting

### Authentication Issues

If you get 401 errors when installing dependencies:
```bash
# Re-authenticate with GCP
npx google-artifactregistry-auth --repo-config=.npmrc --credential-config=.npmrc

# Try installing again
pnpm install
```

### Build Errors

If you see "API Routes cannot be used with output: export":
- This is expected if there are API routes in the `pages/api` directory
- Remove unused API routes or change the `output` setting in `next.config.mjs`

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [DCMCO Design System](https://github.com/dcmco/design-system)
- [GCP Artifact Registry](https://cloud.google.com/artifact-registry/docs)

## License

MIT License - Copyright (c) 2026 DCM CO
