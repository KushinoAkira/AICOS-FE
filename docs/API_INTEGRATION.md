# AICOS Web - API integration status

Base URL: `VITE_API_BASE_URL` (default `http://localhost:5000/api/v1`, via the YARP gateway).
Client: `src/lib/api/http.ts` (Bearer token, single-flight refresh on 401, ProblemDetails -> `ApiError`).
Auth state: `src/context/AuthContext.tsx`. Data hook: `src/hooks/useApiQuery.ts`.
Backend is read-only for FE work: gaps below are requests to the BE team.

## 1. Wired now

| FE screen | BE endpoints |
|---|---|
| `login` (staff) | `POST /identity/auth/login` |
| `auth-customer-login` | `POST /identity/auth/login` (field changed from phone to email) |
| `admin-users` | `GET/POST /identity/users`, `PATCH /identity/users/{id}/status` |
| `admin-branches` | `GET /identity/branches` |

Client wrappers already written, not yet bound to UI: `authApi` (register, logout, me, change/forgot/reset password), `branchesApi` (create, update, status, active), `usersApi` (get, update, delete).

## 2. Exists in BE, FE screen not wired yet (client module still to write)

| FE screen | BE endpoints (gateway prefix) |
|---|---|
| `customer-menu`, `manager-menu` | `/menu/categories`, `/menu/products` (+ `PATCH /products/{id}/availability`) |
| `cashier-tables`, reservations UI | `/tables/dining-tables`, `/tables/reservations` (+ confirm/seat/complete/no-show/cancel), `GET /tables/availability`, `GET /tables/public/qr/{token}` |
| `warehouse-stock`, `manager-stock` | `/inventory/ingredients` (+ `/low-stock`, `/reorder-level`), `/inventory/stock-adjustments` (+ approve/reject) |
| `warehouse-suppliers` | `/inventory/suppliers` |
| `manager-menu` (recipes) | `/inventory/recipes/{productId}` |
| `manager-staff` (Employees) | `/workforce/employees`, `/workforce/work-shifts`, `/workforce/shift-assignments`, `/workforce/shift-swaps` |
| `cashier-shift` | `POST /workforce/attendance/check-in`, `/check-out`, `GET /workforce/shift-assignments/mine` |
| `customer-profile`, `admin-customers`, `admin-customer-detail` | `/customers/me`, `/customers/me/loyalty`, `/customers`, `/customers/{id}`, `/customers/{id}/points-adjustments` |
| `manager-promotion-suggestions` (vouchers) | `/customers/vouchers` (+ validate, redeem, revoke) |
| `account-settings` | `POST /identity/auth/change-password`, `PUT /customers/me` |

## 3. APIs missing in BE (needed by existing screens)

Services `order`, `payment`, `kitchen`, `reporting` only contain an empty service shell (no endpoints). The 4 Python AI routes return 501.

| FE screen | Needed API |
|---|---|
| `cashier-pos`, `customer-menu` (cart) | `POST /orders` (create, dine-in/takeaway, table, items, voucher), `GET /orders/{id}`, `PATCH /orders/{id}` (add/remove item), `POST /orders/{id}/cancel` |
| `cashier-board` | `GET /orders?status=&branchId=`, `POST /orders/{id}/status`, realtime channel (SSE/WebSocket) for new/updated orders |
| `customer-tracking` | `GET /orders/mine`, `GET /orders/{id}` + realtime status push |
| `cashier-pos` (checkout) | `POST /payments` (cash, QR/bank, card), `POST /payments/{id}/refund`, `GET /payments?orderId=`, receipt/invoice data, shift cash summary |
| kitchen/barista view | `GET /kitchen/tickets`, `POST /kitchen/tickets/{id}/start`, `/ready` |
| `manager-dashboard`, `manager-reports` | `GET /reporting/sales-summary`, `/revenue?from&to&groupBy`, `/top-products`, `/orders-by-hour`, export CSV/PDF |
| `manager-payroll`, `manager-payroll-detail` | `GET /workforce/payroll?month=`, `GET /workforce/payroll/{employeeId}?month=`, `POST /workforce/payroll/close` (no payroll endpoints exist) |
| `manager-suggestions`, `manager-promotion-suggestions`, `manager-marketing` | `POST /ai/summary` (501), AI marketing content generation endpoint (not defined) |
| `manager-inventory-forecast` | `POST /ai/forecast/demand` (501) |
| `AIAssistantChat` | `POST /ai/chat` (501), knowledge-base CRUD for `admin-ai-config` (`/ai/knowledge`, not defined) |
| face-scan attendance | `POST /ai/attendance/verify` (501), face enrolment endpoint (not defined) |
| `admin-logs` | `GET /identity/audit-logs` (not defined) |
| `warehouse-receipt` | goods-receipt / purchase-order endpoints (`POST /inventory/receipts`, `GET /inventory/receipts`, `POST /inventory/purchase-orders`); only stock-adjustments exist |
| `warehouse-stock` | stock-movement history (`GET /inventory/stock-movements`) |
| `admin-customers` | block/unblock customer, customer search by phone |

## 4. Contract mismatches to resolve (FE <-> BE)

1. **Register** - FE form has name, phone, password. BE requires `fullName`, `email`, `password`, `confirmPassword`; account is created immediately (no OTP).
2. **OTP screen (`auth-otp`)** - BE has no OTP verification endpoint. Forgot-password sends an email code; reset takes `{email, code, newPassword, confirmNewPassword}`. Needs either: BE adds `POST /auth/verify-otp` (+ phone OTP/SMS), or FE drops the OTP step and merges code entry into the reset screen.
3. **Login identifier** - BE accepts email or username only; the customer screen used phone numbers. Phone login needs a BE change.
4. **Role names** - BE: `SystemAdmin, Manager, Cashier, WarehouseStaff, AiBusinessAssistant, Customer, Guest`; FE maps them in `AuthContext.tsx`. `AiBusinessAssistant` is mapped to the manager UI.
5. **Branch counters** - `admin-branches` cards showed table/staff counts; `BranchResponse` has none (removed from UI). Ask BE for `tableCount`/`staffCount` or aggregate client-side.
6. **IDs** - all ids are GUID strings; FE mock ids ("1", "2") must be replaced.
7. **Money** - confirm VND is sent as integer (the existing `7400.000đ` display bug is an FE formatting issue).
8. **Route guard** - no FE guard yet; `DemoRoleSwitcher` still bypasses auth. Replace with `RequireAuth` per role once more screens are wired.
