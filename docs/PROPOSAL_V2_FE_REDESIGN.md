# AICOS Web - FE redesign for Proposal v2

Source: `UC_BR_FR_Smart_Coffee_Chain (1).xlsx` (66 UC, 75 BR, FR/NFR lists, 4 open questions).
Backend is out of scope (read-only). Sections 5-6 list what the FE needs from it.

## 1. What changed vs. the current FE

The current FE was built for a **single coffee shop** (roles: customer, cashier, warehouse, manager, admin). Proposal v2 is a **multi-tenant SaaS for coffee chains**.

| Area | Current FE | Proposal v2 |
|---|---|---|
| Roles | Customer, Cashier, Warehouse, Manager, Admin | **Super Admin, Brand Admin, Branch Manager, Barista, Cashier, Customer + Guest (no account)** |
| Tenancy | none | Brand = tenant (BR-04, BR-72); every screen is scoped to brand, staff to one branch (BR-05) |
| SaaS platform | none | Tenants, plans, tenant subscriptions, payment providers (mock), platform health, SaaS revenue (UC-05..10) |
| Ordering | Customer menu + cart, one flow | **Two flows**: Dine-in via table QR (Guest or Customer, table session, add-on orders, pay bill) and **scheduled takeaway pre-order** (Customer only, pickup slot, prepaid) |
| Kitchen | Order board for cashier | **Barista** preparation queue (FIFO/priority, Pending -> Preparing -> Ready, cup label) |
| Warehouse / inventory | Stock, receipts, suppliers, forecast | **Removed** (no UC) |
| AI | Manager suggestions, inventory forecast, promotion suggestions, marketing content, assistant knowledge, face attendance | **Only 3 AI features**: Smart Barista chat (UC-52), personalised recommendations (UC-54), feedback analysis (UC-64 -> UC-37). Face attendance explicitly excluded (BR-49) |
| Money | POS + payroll | Cash/QR payment, refunds with status, reconciliation, shift cash closing, VAT/service fee config |
| Customer | Menu, tracking, profile | + loyalty points, vouchers, feedback, notifications, order history, cancel, data deletion (UC-66) |
| Staff HR | Employees, payroll | Branch staff, shift schedule, attendance review, replacement shifts, payroll summary + export, pay rules |
| Governance | System logs | Audit log: Brand Admin = business audit, Super Admin = platform audit only (BR-06) |

## 2. RBAC (FE)

`src/router/rbac.ts` must switch to these roles (backend role names to be mapped, see section 6):

| Role | Home | Branch scope | Notes |
|---|---|---|---|
| Super Admin | `/platform/tenants` | none | Never sees orders/customers/feedback content (BR-06) |
| Brand Admin | `/brand/dashboard` | all branches of own brand | Menu, pricing, policies, accounts |
| Branch Manager | `/branch/dashboard` | own branch | Availability, tables/QR, staff, shifts, exceptions |
| Barista | `/barista/queue` | own branch | |
| Cashier | `/cashier/pos` | own branch | |
| Customer | `/menu` (own brand) | n/a | Inherits Guest abilities |
| Guest | `/q/:token` | table's branch | No login |

## 3. Sitemap (route -> UC)

**Public / Guest** (customer-facing shell, mobile-first)
- `/q/:token` Scan QR + menu (UC-49); `/q/:token/cart` place order incl. add-on to open session (UC-50); `/q/:token/bill` pay bill, cash/QR (UC-51); chat drawer (UC-52)
- `/login` (UC-01), `/sign-up` with brand picker (UC-04, BR-72), `/forgot-password`, `/reset-password` (UC-02; OTP vs link = open question 1)

**Customer**
- `/menu` brand/branch menu; `/takeaway` branch/nearby -> pickup slot -> prepayment (UC-53)
- `/orders` tracking + history (UC-55); `/orders/:id` status, cancel (UC-57, BR-61), rate + feedback (UC-58, 7-day window BR-43)
- `/for-you` recommendations (UC-54); `/loyalty` points, vouchers (UC-56); `/notifications` (UC-59)
- `/account` profile, password, drink preferences (UC-03), delete my data (UC-66)

**Cashier**
- `/cashier/pos` counter order (UC-41) + cash payment (UC-42) + verify digital payment fallback (UC-43)
- `/cashier/tables` open table sessions, present bill, close session (UC-44)
- `/cashier/handover` serve dine-in / hand over takeaway, no-show (UC-45, BR-58)
- `/cashier/shift` schedule, check in/out (UC-47, UC-48), replacement shifts (UC-31); `/cashier/cash-closing` (UC-46)

**Barista**
- `/barista/queue` FIFO + priority, status buttons, cup label (UC-38, UC-39, UC-40); `/barista/shift` (UC-47, UC-48, UC-31)

**Branch Manager**
- `/branch/dashboard` + `/branch/reports` (UC-36); `/branch/availability` (UC-24); `/branch/tables` floor plan (UC-25) + QR (UC-26)
- `/branch/staff` (UC-27); `/branch/schedule` (UC-28); `/branch/attendance` (UC-29); `/branch/replacements` (UC-30); `/branch/payroll` (UC-32)
- `/branch/cash-closing` (UC-33); `/branch/exceptions` cancel/refund (UC-34, UC-63); `/branch/reconciliation` (UC-35); `/branch/feedback` (UC-37); `/branch/pickup-slots` (UC-21, if Branch Manager owns it)

**Brand Admin**
- `/brand/dashboard` chain reports (UC-23); `/brand/branches` (UC-12); `/brand/accounts` roles + branches (UC-13)
- `/brand/menu` products, options, branch prices (UC-14) + publish (UC-15); `/brand/loyalty` (UC-16); `/brand/vouchers` (UC-17)
- `/brand/policies` cancel/refund (UC-18); `/brand/pay-rules` (UC-19); `/brand/merchant-payment` (UC-20); `/brand/pickup-slots` (UC-21)
- `/brand/subscription` status + simulated renew (UC-22); `/brand/reconciliation` (UC-35); `/brand/feedback` (UC-37); `/brand/audit` (UC-11)

**Super Admin**
- `/platform/tenants` (UC-05); `/platform/plans` (UC-06); `/platform/subscriptions` (UC-07); `/platform/payment-providers` (UC-08); `/platform/health` (UC-09); `/platform/revenue` (UC-10); `/platform/audit` (UC-11, platform-level only)

Shared: notification bell (UC-59: Customer, Barista, Cashier, Brand Admin), account settings (UC-03), user menu with sign out.

## 4. Reuse / remove map for existing screens

| Existing screen | Decision |
|---|---|
| `auth/*` | Keep, add sign-up brand picker, decide OTP vs reset link |
| `customer/Menu`, `OrderTracking`, `Profile`, `CartDrawer`, `OrdersContext` | Rework into dine-in QR flow + takeaway flow + history; cart drawer logic reusable |
| `cashier/POS`, `OrderBoard`, `Reservations`, `Shifts` | POS keep; OrderBoard becomes **Barista queue**; Reservations -> table sessions; Shifts -> check-in + cash closing |
| `warehouse/*`, `manager/InventoryForecast`, `PromotionSuggestions`, `MarketingContent`, `AISuggestions`, `admin/AssistantKnowledge` | **Remove** (not in v2) |
| `manager/Dashboard`, `Reports`, `Employees`, `Payroll`, `PayrollDetail`, `MenuManagement` | Split between Branch Manager and Brand Admin (reports/menu -> Brand; staff/payroll -> Branch) |
| `admin/Users`, `Branches`, `CustomerAccounts*`, `SystemLogs` | Users -> Brand accounts; Branches -> Brand branches; customer accounts removed (Super Admin must not see tenant customers); logs -> audit |
| `InternalLayout`, `AuthContext`, `rbac.ts`, `UserMenu` | Keep, change role model + nav per role |

## 5. Open decisions (block design details)

1. Reset password: OTP or link (UC-02).
2. Who configures pickup slots: Brand Admin or Branch Manager (UC-21).
3. Keep manual digital-payment verification (UC-43)?
4. Build subscription Renew (simulated) or view-only (UC-22)?
5. Customer belongs to one brand and picks it at sign-up (BR-72) - confirm.
6. Cross-branch replacement shift allowed (BR-51)?
7. Order-status vs payment-status are separate state machines (BR-34 review) - FE assumes separate badges.

## 6. Backend gaps for FE (current BE is single-tenant, roles SystemAdmin/Manager/Cashier/WarehouseStaff)

- Tenant model and `tenantId` in JWT; roles `SuperAdmin, BrandAdmin, BranchManager, Barista, Cashier, Customer`; Guest QR token endpoints (`GET /public/qr/{token}` exists).
- Not existing: tenants, plans, subscriptions, platform health/revenue, orders (dine-in, takeaway, sessions, slots), payments/refunds/callbacks, kitchen queue, loyalty rules/points, vouchers (exists partly), feedback + AI analysis, notifications, cash closing, payroll, audit, data-deletion.
- Existing and reusable with role renaming: identity auth, branches, users, menu categories/products, dining tables + QR, workforce shifts/attendance/swaps, customers/vouchers.

## 6. Decisions (final)
- UC-02 reset password: OTP.
- UC-43: Cashier verifies digital payment manually.
- UC-22: simulated Renew screen.
- UC-21: Brand Admin sets brand default, Branch Manager overrides per branch.
- Customer belongs to exactly one brand, chosen at Sign Up (BR-72).
- BR-51: cross-branch replacement shifts allowed within the same brand.

## 7. Phase 1 status (foundation)
Done: role model (src/router/roles.ts), RBAC + home pages, routes per sitemap, per-role sidebar, obsolete screens removed, Planned placeholders for unbuilt screens. Dev-only role overrides via VITE_DEV_ROLE_OVERRIDES because the backend still issues legacy roles.
