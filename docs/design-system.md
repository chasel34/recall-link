# Design System

Recall Link uses a warm-neutral, calm aesthetic designed for focus and clarity. It balances functional utility with a refined, tactile feel.

## Visual Direction

- **Atmosphere**: Warm-neutral, calm, and spacious. (Light-only for now)
- **Surface**: Subtle elevation with soft shadows, generous whitespace.
- **Edges**: Highly rounded corners (`0.625rem` base radius) for cards and inputs.
- **Borders**: Soft, low-contrast borders.
- **Elements**: Pill-shaped chips and buttons where appropriate.

## Typography

We use a high-contrast pairing of a characterful serif for headings and a highly legible sans-serif for functional UI and body text.

| Role | Font Family | Usage |
|------|-------------|-------|
| **Headings** | **Serif** (CJK-friendly) | Page titles, card titles, article headers |
| **Body/UI** | **Sans-serif** (CJK-friendly) | Navigation, metadata, long-form content, UI |

### Font Stacks

To ensure a refined aesthetic across all languages, we use the following system font stacks:

- **Headings (Serif)**: `"Songti SC", "Noto Serif CJK SC", ui-serif, Georgia, serif`
- **Body/UI (Sans)**: `"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif`

Note: Future iterations may include self-hosted Noto Serif/Sans for absolute consistency.

### Type Scale

| Name | Size | Line Height | Weight |
|------|------|-------------|--------|
| `display` | 2.25rem | 1.2 | 700 (Serif) |
| `h1` | 1.875rem | 1.2 | 600 (Serif) |
| `h2` | 1.5rem | 1.3 | 600 (Serif) |
| `h3` | 1.25rem | 1.4 | 600 (Serif) |
| `body` | 1rem | 1.5 | 400 (Sans) |
| `small` | 0.875rem | 1.5 | 400 (Sans) |
| `tiny` | 0.75rem | 1.5 | 500 (Sans) |

## Color Tokens (Tailwind v4 / CSS Variables)

Tokens are defined in `apps/web/src/index.css`. We use OKLCH for better color math and perceptual uniformity.

### Semantic Tokens

| Variable | Description |
|----------|-------------|
| `--background` | Page background (warm-white/paper) |
| `--foreground` | Main text color (deep charcoal/warm-black) |
| `--card` | Surface color for cards and panels |
| `--primary` | Main action color (warm orange/terracotta) |
| `--secondary` | Subtle action color (muted teal/sage) |
| `--muted` | Decorative or disabled elements |
| `--muted-foreground` | Low-priority text |
| `--border` | Default border color |

## Elevation & Radii

### Elevation (Shadows)

- **Base**: Flat, `--border` only.
- **Raised (Cards)**: `shadow-sm` or `shadow-md` on hover.
- **Overlay (Modals/Popovers)**: `shadow-lg` with a soft blur.

### Radii

- **Base (`--radius`)**: `0.625rem` (10px).
- **Small**: `calc(var(--radius) - 4px)` (6px).
- **Large**: `calc(var(--radius) + 4px)` (14px).
- **Full**: `9999px` (Pills).

## Iconography Policy

We exclusively use **Lucide React**.

- **Library**: `lucide-react`
- **Stroke Width**: `1.5` (Default)
- **Standard Sizes**:
  - `16` (Inline with small text, secondary actions)
  - `20` (Default, navigation items)
  - `24` (Page headers, primary calls to action)

**Implementation Example**:
```tsx
import { ArrowRight } from 'lucide-react';

<ArrowRight size={20} strokeWidth={1.5} className="text-muted-foreground" />
```

## UI Primitives (Base UI)

Recall Link uses **Base UI** for unstyled accessible primitives (Modals, Tabs, Tooltips) and custom Tailwind-based components for simpler elements (Cards, Chips, Buttons).

- **Styling**: All components are styled using the Tailwind tokens defined in `apps/web/src/index.css`.
- **Primitives**: Located in `apps/web/src/components/base/`.
- **Logic**: Base UI handles state and accessibility; Tailwind handles the "Recall Link" aesthetic.

## Usage Guidelines

### 1. Spacing
Always use Tailwind spacing utilities (e.g., `p-4`, `gap-6`). Avoid hardcoded pixel values.

### 2. Colors
Never use hex codes in components. Use semantic classes:
- `text-foreground`, `text-muted-foreground`, `text-primary`
- `bg-background`, `bg-card`, `bg-secondary`
- `border-border`

### 3. Components
Prefer local primitives from `@/components/base` for UI elements. These are built on Base UI or pure Tailwind to ensure they adhere to our design system tokens.

### 4. Examples

**Card Component**:
```tsx
<div className="rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
  <h3 className="font-serif text-xl font-semibold">Title</h3>
  <p className="text-muted-foreground text-sm">Description text goes here.</p>
</div>
```

**Pill Chip**:
```tsx
<span className="bg-secondary/10 text-secondary rounded-full px-3 py-1 text-xs font-medium">
  Category
</span>
```
