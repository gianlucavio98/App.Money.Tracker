# Money Tracker

A personal expense tracking Progressive Web App (PWA) built with Angular 21. Track where you spend your money, visualize spending patterns, manage budgets, and export reports — all locally in your browser with no backend required.

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| **Angular** | 21 | Frontend framework (standalone components, signals, lazy routes) |
| **Node.js** | 22 | Runtime |
| **TypeScript** | ~5.9 | Language |
| **Dexie.js** | 4.x | IndexedDB wrapper for local data persistence |
| **Bootstrap** | 5.3 | Responsive UI styling |
| **Bootstrap Icons** | 1.13 | Icon library |
| **Chart.js + ng2-charts** | 4.x / 10.x | Interactive charts and graphs |
| **jsPDF + jspdf-autotable** | 4.x / 5.x | PDF export with tables |
| **html2canvas** | 1.x | Capture charts as images for PDF |
| **Angular PWA** | 21 | Service worker + web manifest for offline support |

## Features

### Authentication
- Local login/logout using IndexedDB
- Default user: `gianluca.vio` / `MoneyTracking725!?`
- Password stored as SHA-256 hash (never in plain text)
- Session managed via `sessionStorage`

### Dashboard (`/dashboard`)
- Summary cards: total spent, number of entries, monthly budget progress
- Budget progress bar with color coding (green → yellow → red)
- Doughnut chart: spending breakdown by category
- Bar chart: daily spending
- Filters: date range (last 7/30 days, this/last month, this year, custom), category
- Export to PDF with charts and data tables

### Expenses (`/expenses`)
- Table view with pagination (15 entries/page)
- Sortable columns: date (default desc), description, amount
- Filters: text search, category, date range (default: current month)
- Add, edit, delete entries
- Recurring entries marked with a badge

### Add/Edit Expense (`/add-expense`, `/edit-expense/:id`)
- Form fields: amount (€), category (dropdown), date, description
- Validation: required amount > 0, category, date

### Reports (`/reports`)
- Three report types: weekly, monthly, yearly
- Line chart: spending trend over time
- Doughnut chart: category breakdown
- Stacked bar chart: category comparison across periods
- Summary cards: total spent, entry count, average per entry

### Admin (`/admin`)
Tabbed interface with five sections:

- **Categories** — Add, edit (inline), delete categories with name, Bootstrap icon class, and color
- **Budget** — Set monthly budget by month (YYYY-MM), view/delete all budgets
- **Recurring Expenses** — Add/edit/delete recurring entries with frequency (weekly/monthly/yearly), start/end dates, active toggle. Entries are auto-generated up to today on each dashboard visit
- **All Expenses** — Full table of every expense entry with delete capability
- **Users** — View registered users

### Navigation
- Responsive Bootstrap navbar (collapses on mobile)
- Links: Dashboard, Expenses, Add Entry, Reports, Admin
- User display name and logout button

### PWA / Offline
- Angular service worker for caching assets
- Web manifest for installability (`Add to Home Screen`)
- Works offline after first load
- Designed for deployment on GitHub Pages

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── admin/            # Admin page (categories, budget, recurring, users)
│   │   ├── dashboard/        # Dashboard with charts and filters
│   │   ├── expense-form/     # Add/edit expense form
│   │   ├── expense-list/     # Expense table with pagination/sorting
│   │   ├── login/            # Login page
│   │   ├── navbar/           # Top navigation bar
│   │   └── reports/          # Weekly/monthly/yearly reports
│   ├── database/
│   │   └── app.database.ts   # Dexie DB schema, seed data, password hashing
│   ├── guards/
│   │   └── auth.guard.ts     # Route guard (redirects to /login if not authenticated)
│   ├── models/
│   │   ├── budget.model.ts
│   │   ├── category.model.ts
│   │   ├── expense.model.ts
│   │   ├── recurring-expense.model.ts
│   │   └── user.model.ts
│   ├── services/
│   │   ├── auth.service.ts           # Login, logout, session management
│   │   ├── budget.service.ts         # CRUD for monthly budgets
│   │   ├── category.service.ts       # CRUD for expense categories
│   │   ├── expense.service.ts        # CRUD + search + date range queries
│   │   ├── pdf-export.service.ts     # PDF generation with charts
│   │   └── recurring-expense.service.ts  # CRUD + auto-generation logic
│   ├── app.config.ts         # App providers (router, service worker)
│   ├── app.routes.ts         # Lazy-loaded routes with auth guard
│   ├── app.ts                # Root component
│   └── app.html              # Root template (navbar + router-outlet)
├── styles.scss               # Global styles (Bootstrap + custom)
├── index.html                # HTML entry point with PWA meta tags
└── main.ts                   # Bootstrap entry point
public/
├── manifest.webmanifest      # PWA manifest
├── icons/                    # PWA icons (72–512px)
└── favicon.ico
```

## Data Models

### Expense
| Field | Type | Description |
|---|---|---|
| `id` | number (auto) | Primary key |
| `amount` | number | Expense amount in € |
| `categoryId` | number | FK to Category |
| `date` | string | ISO date (YYYY-MM-DD) |
| `description` | string | Free text |
| `userId` | number | FK to User |
| `recurringExpenseId` | number? | FK to RecurringExpense (if auto-generated) |
| `createdAt` | string | ISO timestamp |
| `updatedAt` | string | ISO timestamp |

### Category
| Field | Type | Description |
|---|---|---|
| `id` | number (auto) | Primary key |
| `name` | string | Category name |
| `icon` | string | Bootstrap Icons class (e.g. `bi-cart`) |
| `color` | string | Hex color for charts/badges |

### User
| Field | Type | Description |
|---|---|---|
| `id` | number (auto) | Primary key |
| `username` | string | Unique login name |
| `passwordHash` | string | SHA-256 hash |
| `displayName` | string | Display name in UI |
| `createdAt` | string | ISO timestamp |

### Budget
| Field | Type | Description |
|---|---|---|
| `id` | number (auto) | Primary key |
| `userId` | number | FK to User |
| `monthlyAmount` | number | Budget limit in € |
| `month` | string | YYYY-MM format |

### RecurringExpense
| Field | Type | Description |
|---|---|---|
| `id` | number (auto) | Primary key |
| `userId` | number | FK to User |
| `amount` | number | Amount in € |
| `categoryId` | number | FK to Category |
| `description` | string | Description |
| `frequency` | string | `weekly` \| `monthly` \| `yearly` |
| `startDate` | string | ISO date |
| `endDate` | string? | ISO date (optional) |
| `lastGeneratedDate` | string? | Last date entries were generated up to |
| `active` | boolean | Whether auto-generation is enabled |

## Default Seed Data

**User**: `gianluca.vio` (password: SHA-256 hash of `MoneyTracking725!?`)

**Categories** (12 defaults):
Food & Groceries, Transportation, Entertainment, Housing & Rent, Utilities, Healthcare, Shopping, Subscriptions, Education, Travel, Personal Care, Other

## Getting Started

### Prerequisites
- Node.js 22+
- npm 10+

### Install & Run
```bash
cd money-tracker
npm install
npm start
```
App runs at `http://localhost:4200/`

### Build for Production
```bash
npm run build
```
Output: `dist/money-tracker/browser/`

### Deploy to GitHub Pages
```bash
npx ng build --base-href /YOUR-REPO-NAME/
# Push contents of dist/money-tracker/browser/ to gh-pages branch
```

## Architecture Notes

- **Standalone components** — No NgModules. Each component declares its own imports.
- **Lazy-loaded routes** — All pages load on demand for smaller initial bundle.
- **Signals** — Angular signals for reactive state in components.
- **IndexedDB via Dexie** — All data persisted locally. No server needed.
- **Auth guard** — Functional `CanActivateFn` guard protects all routes except `/login`.
- **Recurring expense generation** — On each dashboard load, the service checks all active recurring expenses and generates any missing entries up to today.
- **PWA** — Service worker caches the app shell. After first visit, the app works fully offline.

## Future Enhancements
- **OPFS** for file storage (receipts, attachments)
- Multi-user support with role-based access
- Data import/export (CSV, JSON)
- Expense tagging and advanced filtering
- Dark mode
