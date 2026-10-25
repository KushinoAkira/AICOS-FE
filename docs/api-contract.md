# API contract the frontend expects (mocked with MSW in `src/services/mock`)

Base: `VITE_API_BASE_URL` (e.g. `http://localhost:8080/api/v1`). Errors use ProblemDetails (`title`, `detail`, `code`, optional `retryAfterSeconds`).

## Identity (Phase 2)
| Method | Path | Notes |
|---|---|---|
| POST | `/identity/auth/login` | 401 `invalid_credentials`; **423 `account_locked` + `retryAfterSeconds`** after 5 failures (BR-02); 403 `account_disabled` |
| POST | `/identity/auth/forgot-password` | Same 200 for unknown emails. Mock also returns `devToken` (never in production) |
| POST | `/identity/auth/reset-password` | Body `{ token, newPassword, confirmNewPassword }`; **410 `token_expired`** for used/expired token. OTP variant would send `code` instead of `token` |
| POST | `/identity/auth/register` | Needs `brandId` (customer belongs to one brand, BR-72) - not yet in mock |

Backend today still issues legacy roles (`SystemAdmin`, `Manager`, `WarehouseStaff`) and has no tenant concept; it needs `SuperAdmin`, `BrandAdmin`, `BranchManager`, `Barista` and a tenant id claim.

## Platform (Super Admin only, platform-level data, BR-06)
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/platform/tenants` | - | `Tenant[]` |
| POST | `/platform/tenants` | `{ name, slug, planId, adminName, adminEmail }` | `Tenant`; 409 `slug_taken` |
| PATCH | `/platform/tenants/:id/status` | `{ status: Active\|Suspended\|Closed, reason? }` | `Tenant` (writes audit) |
| GET/PUT | `/platform/plans[/:id]` | `{ name, monthlyFee, billingCycle, maxBranches, maxUsers, graceDays }` | `Plan[]` / `Plan`; 422 when values <= 0 |
| GET | `/platform/subscriptions` | - | `Subscription[]` |
| PATCH | `/platform/subscriptions/:id` | `{ planId?, suspend? }` | `Subscription` |
| GET/PUT | `/platform/payment-providers[/:id]` | `{ mode: mock\|sandbox, enabled }` | secrets always masked |
| GET | `/platform/health` | - | `{ name, status: Up\|Degraded\|Down, latencyMs, checkedAtUtc }[]` |
| GET | `/platform/revenue` | - | SaaS subscription revenue per month only (BR-09) |
| GET | `/platform/audit` | - | append-only entries |

Types live in `src/lib/api/platform.ts`.

## Cấp thương hiệu (UC-05) và bảng giá công khai

Theo proposal v2, thương hiệu do **Super Admin** tạo (/platform/tenants, kèm Brand Admin đầu tiên); FE **không** có luồng chủ quán tự đăng ký. Trang chủ (/) chỉ giới thiệu, dẫn tới /contact để liên hệ tư vấn.

| Method | Path | Body | Trả về | Ghi chú |
|---|---|---|---|---|
| GET | `/api/v1/public/plans` | - | `Plan[]` | Bảng giá hiển thị ở landing |

Tạo thương hiệu: `POST /api/v1/platform/tenants` (SuperAdmin) kèm `firstAdmin`; BE gửi email mời đặt mật khẩu.

## Trang đăng nhập theo thương hiệu (subdomain)

Frontend nhận ra thương hiệu từ tên miền (`caphenha.aicos.app`, khi dev: `caphenha.localhost:5173`) hoặc `?brand=caphenha` (dự phòng khi dev, nhớ theo tab). Tên miền gốc (`aicos.app`) là trang nền tảng, không có thương hiệu.

| Method | Path | Ghi chú |
|---|---|---|
| GET | `/api/v1/public/brands/{slug}` | Anonymous. Trả `{ name, slug, status: Active\|Suspended\|Closed, logoUrl?, brandColor? }`. 404 nếu không có hoặc đang `Pending/Rejected` |
| GET/PUT | `/api/v1/brand/profile` | Brand Admin. `{ logoUrl?, brandColor? }` (`#RRGGBB`). Real mode: logo tải lên bằng multipart, lưu URL |

Yêu cầu backend:
- Chọn tenant theo `Host` (wildcard DNS `*.aicos.app`); token mang `tenantId`.
- Đăng nhập trên địa chỉ của một thương hiệu chỉ nhận tài khoản thuộc thương hiệu đó, ngược lại trả 403 `wrong_tenant`. Tài khoản Super Admin chỉ đăng nhập ở tên miền gốc.
- Đăng ký khách hàng trên subdomain tự gắn khách vào thương hiệu đó.
- `BrandRegistrationInput` thêm `logoDataUrl?` và `brandColor?` (mock gửi dạng data URL, tối đa 512 KB).
- Mock gửi header `X-Tenant: <slug>` để giả lập việc chọn tenant theo host (chỉ khi `VITE_USE_MOCK=true`).

## Liên hệ công khai

| Method | Path | Ghi chú |
|---|---|---|
| POST | `/api/v1/public/contact` | Anonymous. Body `{ name, email, phone?, topic: demo\|pricing\|support\|other, message }`. 200 `{ received: true }`, 422 nếu thiếu dữ liệu. Backend cần gửi mail cho đội hỗ trợ và chống spam (rate limit, captcha) |

## AI service (Backend/ai-models, base `VITE_AI_BASE_URL`, default `http://localhost:8090/api/v1/ai`)
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/chat` | `{message, history: productId[]}` | `{reply, suggestions[{productId,name,price,reason,score}], route{intent,confidence,llm,retrieval,latency_ms}, handoff}` |
| POST | `/chat/stream` | same | SSE |
| POST | `/recommendations` | `{history: productId[], k}` | `{items[{productId,name,price,reason,score}]}` |
| POST | `/feedback/analyze` | `{texts: string[]}` | `{available, items[{sentiment,confidence,aspects,aspectLabels}], model}` |
Note: the service currently uses its demo menu ids (`p01`..); align with real menu ids when the BE menu is final.
