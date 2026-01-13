# DCMCO Website

[![Deploy to Firebase Hosting](https://github.com/shanefitzgerald/DCMCO-WEBSITE/actions/workflows/deploy-firebase-staging.yml/badge.svg)](https://github.com/shanefitzgerald/DCMCO-WEBSITE/actions/workflows/deploy-firebase-staging.yml)

The official marketing website for DCM CO, a leading AI consultancy specializing in the construction industry.

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (Pages Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [@dcmco/design-system](https://github.com/dcmco/design-system) (Stitches-based)
- **Hosting**: Firebase Hosting (with automatic SSL and global CDN)
- **Infrastructure**: [Pulumi](https://www.pulumi.com/) (TypeScript-based IaC)
- **Backend**: Google Cloud Functions Gen 2 (Node.js 20)
- **Email**: SendGrid API
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
├── infrastructure/        # Pulumi infrastructure-as-code
│   ├── index.ts          # Main Pulumi program
│   ├── config.ts         # Configuration helpers
│   ├── resources/        # Modular resource definitions
│   └── Pulumi.*.yaml     # Stack configurations
├── functions/             # Cloud Functions
│   └── contact-form/     # Contact form handler
│       ├── src/          # TypeScript source code
│       └── package.json  # Function dependencies
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

This project is automatically deployed to Firebase Hosting via GitHub Actions.

### Quick Links

- 🌐 **Staging**: [https://staging.dcmco.com.au](https://staging.dcmco.com.au) (Firebase: https://dcmco-staging.web.app)
- 🌐 **Production**: [https://dcmco.com.au](https://dcmco.com.au) (Firebase: https://dcmco-prod-2026.web.app)
- 📊 [Deployment History](https://github.com/shanefitzgerald/DCMCO-WEBSITE/actions) - View recent deployments
- 📦 [Infrastructure Code](infrastructure/) - Pulumi IaC definitions

### Infrastructure Management

This project uses [Pulumi](https://www.pulumi.com/) for infrastructure-as-code. All GCP resources (Firebase Hosting, Cloud Functions, Secret Manager, IAM) are defined in TypeScript.

**Key Resources:**
- Firebase Hosting sites (staging and production)
- Contact form Cloud Function (Gen 2)
- SendGrid integration with Secret Manager
- Service accounts with minimal permissions

**Common Commands:**
```bash
cd infrastructure

# Preview infrastructure changes
pulumi preview

# Deploy infrastructure updates
pulumi up

# View current stack outputs
pulumi stack output

# Switch between stacks
pulumi stack select staging
pulumi stack select production
```

### Automated Deployments

**Staging Deployment:**
- Automatically deploys to Firebase Hosting when code is pushed to `main` branch
- Live at: https://staging.dcmco.com.au (Firebase: https://dcmco-staging.web.app)
- Includes automatic cache invalidation and CDN distribution

**Production Deployment:**
- Automatically deploys to Firebase Hosting when code is pushed to `production` branch
- Live at: https://dcmco.com.au (Firebase: https://dcmco-prod-2026.web.app)
- Includes automatic cache invalidation and CDN distribution

**Pull Request Previews:**
- Preview deployments are automatically created for each Pull Request
- Unique preview URL posted as PR comment
- Preview expires after 7 days
- No impact on production

### Manual Build Process

```bash
# Build the static site locally
pnpm build

# Test locally with Firebase emulator
firebase serve

# Deploy manually (requires Firebase authentication)
firebase deploy --only hosting
```

This generates static HTML files in the `/out` directory.

**Note**: Since this is a static export, API routes and server-side features are not available. All pages are pre-rendered at build time.

### Firebase Hosting Benefits

Firebase Hosting provides enterprise-grade hosting with built-in features:

- ✅ **Automatic SSL**: Free HTTPS certificates with auto-renewal
- ✅ **Global CDN**: Content delivered from edge locations worldwide
- ✅ **Fast deploys**: Optimized asset upload with smart caching
- ✅ **Preview channels**: Test changes before going live
- ✅ **Easy rollbacks**: One-command rollback to any previous version
- ✅ **Custom domains**: Support for custom domain configuration

### Cache Strategy

Cache headers are configured in `firebase.json`:

| File Type | Cache Strategy | Max Age | Rationale |
|-----------|---------------|---------|-----------|
| **HTML files** | `max-age=0, must-revalidate` | 0 seconds | Always fresh content |
| **Next.js hashed assets** (`_next/static/**`) | `max-age=31536000, immutable` | 1 year | Content-hashed filenames |
| **Images** | `max-age=2592000` | 30 days | Balance caching and updates |
| **Fonts** | `max-age=31536000, immutable` | 1 year | Fonts rarely change |
| **Other JS/CSS** | `max-age=3600` | 1 hour | Non-hashed assets |

For detailed configuration, see [docs/FIREBASE_HOSTING.md](docs/FIREBASE_HOSTING.md).

### Rollback Procedure

To rollback a deployment:

```bash
# View recent deployments
firebase hosting:releases:list

# Rollback to previous version
firebase hosting:rollback

# Or specify a specific version
firebase hosting:rollback <release-id>
```

### Deployment Summary

Every deployment generates a detailed summary including:

- ✅ Deployment status and metrics
- 📦 Environment details (project, channel)
- 🔗 Quick links (live site, Firebase console, commit)
- ⚡ Performance info (CDN, SSL, caching)

## Contact Form

The contact form is powered by a serverless Cloud Function (Gen 2) that handles form submissions and sends emails via SendGrid.

**Features:**
- ✅ CORS protection (only allowed origins)
- ✅ Input validation (required fields, email format, length limits)
- ✅ Honeypot anti-spam protection
- ✅ Secure secret management (SendGrid API key in Secret Manager)
- ✅ Structured error responses

**Function Details:**
- **Endpoint**: `https://australia-southeast1-dcmco-prod-2026.cloudfunctions.net/dcmco-staging-contact-form`
- **Runtime**: Node.js 20
- **Memory**: 256MB
- **Timeout**: 60 seconds

**Local Development:**
```bash
cd functions/contact-form

# Install dependencies
pnpm install

# Build TypeScript
pnpm run build

# Package for deployment
pnpm run package
```

The function automatically rebuilds and deploys when source code changes are detected by Pulumi.

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
- [Pulumi Documentation](https://www.pulumi.com/docs/)
- [DCMCO Design System](https://github.com/dcmco/design-system)
- [GCP Artifact Registry](https://cloud.google.com/artifact-registry/docs)
- [Cloud Functions Gen 2](https://cloud.google.com/functions/docs/2nd-gen/overview)
- [SendGrid API](https://docs.sendgrid.com/)

## License

MIT License - Copyright (c) 2026 DCM CO
