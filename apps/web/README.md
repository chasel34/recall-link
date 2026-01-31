# Recall Link - Web Interface

Modern, type-safe React web interface for Recall Link.

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TanStack Router** - File-based routing with type-safe params
- **TanStack Query** - Server state management
- **Base UI** - Unstyled UI primitives
- **Tailwind CSS** - Styling via utility tokens

## Development

```bash
# Install dependencies
pnpm install

# Start dev server (port 3000)
pnpm dev

# Type check
pnpm typecheck

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Environment Variables

Create `.env` file:

```env
VITE_API_URL=http://localhost:8787
```

## Dev Tools

### Agentation

Agentation is wired into the root route and only renders in development (`import.meta.env.DEV`).

- Entry point: `src/routes/__root.tsx`
- Package: `agentation`

## Project Structure

```
src/
├── components/
│   ├── base/            # Base UI wrappers + Tailwind primitives
│   ├── layout/          # AppSidebar, AppLayout
│   └── items/           # Item-specific components
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and API client
├── routes/              # File-based routes (TanStack Router)
├── main.tsx             # App entry point
└── index.css            # Global styles
```

## Features

- 📋 Browse saved webpages in card grid view
- 🏷️ Filter by tags
- 🔍 Full-text search
- 📄 View detailed content with AI summary
- ➕ Save new webpages
- 🗑️ Delete items with confirmation
- 📱 Responsive design (mobile/tablet/desktop)

## Authentication

The web app uses cookie-based auth (HttpOnly session cookie) via the API.

Routes:

- `/login` - Login
- `/register` - Register

Make sure your API CORS allows credentials (see `apps/api/README.md`).

## Routes

- `/` - Redirects to /items
- `/items` - Items list page
- `/items/:id` - Item detail page
- `/items/tags/:tag` - Items filtered by tag

## Type Safety

- All routes are type-safe (params, search params)
- API client has full TypeScript definitions
- Zod validation for forms and schemas
