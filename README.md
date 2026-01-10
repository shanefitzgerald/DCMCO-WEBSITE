# DCMCO Website

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

This project is configured for static export to Google Cloud Storage (GCS).

### Build Process

```bash
# Build the static site
pnpm build
```

This generates static HTML files in the `/out` directory, which can be deployed to:
- Google Cloud Storage
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
