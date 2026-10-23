# Plan: AICOS — Warm Minimalism Coffee Platform UI

## Context

The user wants a complete multi-role web UI prototype for "AICOS", an AI-integrated coffee shop management platform. The brief specifies an exact aesthetic: **Warm Minimalism + Human-Tech** — warm, handcrafted, editorial, never cold SaaS. 14 screens across 5 user roles must be clickable as a prototype. The project is a fresh Vite + React 19 + Tailwind CSS v4 scaffold with only a blank `App.tsx`.

---

## Architecture Decisions

### Navigation
Use a simple React `useState`-based page router in `App.tsx` (no react-router). A `currentPage` string identifies the active screen; a `navigate(page)` function is passed as a prop. This is sufficient for a click-through prototype.

### Fonts
Wire **Fraunces** (display/heading, serif) and **Inter** (body, sans-serif) via Google Fonts CSS `@import` at the top of `src/index.css` — before the Tailwind import.

### Color Tokens
Define CSS custom properties in `src/index.css` using `@theme` block (Tailwind v4 convention). Map all brand tokens from the brief's color table.

### Component Structure
```
src/
  index.css            ← fonts, tokens, base
  App.tsx              ← page router
  components/
    InternalLayout.tsx ← sidebar + header shell for staff roles
    CustomerLayout.tsx ← minimal header + cart for customer
  pages/
    auth/Login.tsx
    customer/Menu.tsx
    customer/ProductDetail.tsx   (modal overlay, rendered inside Menu)
    customer/OrderTracking.tsx
    customer/Profile.tsx
    cashier/POS.tsx
    cashier/OrderBoard.tsx
    warehouse/Stock.tsx
    warehouse/StockReceipt.tsx
    manager/Dashboard.tsx
    manager/MenuManagement.tsx
    manager/Reports.tsx
    admin/Users.tsx
    admin/Branches.tsx
```

---

## CSS / Token Setup (`src/index.css`)

```css
/* 1. Google Fonts — must be first */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

/* 2. Tailwind */
@import 'tailwindcss';

/* 3. Design tokens via Tailwind v4 @theme */
@theme {
  --color-bg-base:       #FAF6F0;
  --color-bg-warm:       #F5EFE6;
  --color-surface:       #FFFFFF;
  --color-text-primary:  #3A2E22;
  --color-text-secondary:#8A7A6C;
  --color-espresso:      #6F4E37;
  --color-terracotta:    #C97B4A;
  --color-clay:          #8B5E3C;
  --color-olive:         #7A8450;
  --color-olive-bg:      #EAEDE0;
  --color-border:        #E6DCCB;
  --color-success:       #5C7A52;
  --color-warning:       #B98A3D;
  --color-danger:        #A6534B;

  --font-serif: 'Fraunces', Georgia, serif;
  --font-sans:  'Inter', system-ui, sans-serif;

  --radius-btn:  10px;
  --radius-card: 16px;
  --radius-hero: 20px;
}
```

---

## Screen Inventory & Key Design Notes

| Frame | File | Key elements |
|---|---|---|
| Auth / Login | `auth/Login.tsx` | 2-col: left Unsplash coffee photo, right centered form on #FAF6F0 |
| Customer / Menu | `customer/Menu.tsx` | Editorial hero, AI suggestion strip (olive-bg), pill categories, 3-col grid, sticky cart panel |
| Customer / Product Detail | modal in Menu.tsx | Overlay card, size pills, topping checkboxes, qty counter |
| Customer / Order Tracking | `customer/OrderTracking.tsx` | Centered timeline, animated "brewing" step dot |
| Customer / Profile | `customer/Profile.tsx` | Avatar, points serif number, soft progress arc, voucher cards |
| Cashier / POS | `cashier/POS.tsx` | Dark espresso sidebar, 4-col product grid, sticky order panel |
| Cashier / Order Board | `cashier/OrderBoard.tsx` | 3-col Kanban, time-age badges |
| Warehouse / Stock | `warehouse/Stock.tsx` | 3 KPI cards, lightweight table, colored status badges |
| Warehouse / Stock Receipt | `warehouse/StockReceipt.tsx` | Narrow 620px form, two-column inputs, line-item table |
| Manager / Dashboard | `manager/Dashboard.tsx` | 4 stat cards (serif numbers), bar chart (recharts), AI suggestion block (olive) |
| Manager / Menu Mgmt | `manager/MenuManagement.tsx` | Search + category filter, table with avatar thumbnails, badge states |
| Manager / Reports | `manager/Reports.tsx` | Time-period pills, serif-numbered ranking list |
| Admin / Users | `admin/Users.tsx` | Role-colored badges, status badges, add-user button |
| Admin / Branches | `admin/Branches.tsx` | Branch table + warm empty-state illustration |

---

## Prototype Navigation Map (click-through)

```
Login → Manager/Dashboard (default after login)

Customer/Menu → [modal] Product Detail → back to Menu
Customer/Menu → [Đặt món] → Order Tracking → Profile

Cashier/POS ↔ Cashier/Order Board

Warehouse/Stock → Stock Receipt → back to Stock

Manager/Dashboard → Menu Management
Manager/Dashboard → Reports

Admin/Users ↔ Admin/Branches
```

A **role switcher** widget (small floating pill or sidebar footer) will let the demo jump between role contexts: Customer / Thu ngân / Kho / Quản lý / Admin.

---

## Key Implementation Details

### InternalLayout (`src/components/InternalLayout.tsx`)
- Props: `role` ('cashier'|'warehouse'|'manager'|'admin'), `activePage`, `navigate`
- Sidebar: fixed 220px, `bg-espresso` (#6F4E37), white text icons, rounded active pill
- Nav items differ per role; use a role-nav config map
- Header: greeting + avatar at top-right

### CustomerLayout (`src/components/CustomerLayout.tsx`)
- Transparent/cream top bar with AICOS wordmark and cart icon
- No sidebar

### Unsplash Images
- Login photo: `https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&h=1200&fit=crop&auto=format` (coffee shop interior)
- Menu product cards: curated Unsplash coffee drink photos
- Profile avatar: placeholder circle

### AI Elements
- Always use `bg-olive-bg` (#EAEDE0) container + wavy SVG icon (simple `~` line, not robot)
- Label text: "Gợi ý riêng cho bạn", "Gợi ý cho quán hôm nay" — never "AI"
- Olive (#7A8450) color exclusively for these elements

### Charts (Manager Dashboard)
- Install `recharts` (already a popular dependency — check package.json first; install if missing)
- Bar chart: terracotta fill, rounded top (`radius={[6,6,0,0]}`), 7-day data

### Loading / Brewing metaphor
- OrderTracking "Đang pha chế" step: pulsing terracotta dot + small steam SVG

---

## Implementation Order

1. `src/index.css` — fonts + tokens + base body styles
2. `src/App.tsx` — page router with `useState`, role switcher
3. `src/components/InternalLayout.tsx` + `CustomerLayout.tsx`
4. `auth/Login.tsx`
5. Customer pages (Menu → ProductDetail modal → OrderTracking → Profile)
6. Cashier pages (POS → OrderBoard)
7. Warehouse pages (Stock → StockReceipt)
8. Manager pages (Dashboard → MenuManagement → Reports)
9. Admin pages (Users → Branches)

---

## Verification

- Visual check via Vite dev server preview (already running on `$PORT`)
- All 14 screens reachable via click-through from Login
- Role switcher allows jumping between all 5 roles
- No console errors
- Fraunces font renders for all headings
- Terracotta CTAs visible on every screen; olive only on AI-suggestion elements
- recharts bar chart renders in Manager Dashboard
