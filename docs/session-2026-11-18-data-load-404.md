# Session 2026-11-18 — Không tải được dữ liệu (404)

## Bối cảnh

Tiếp nối FE AICOS sau merge voucher-lam: brand admin / sơ đồ tầng báo **“Không tải được dữ liệu”** + `Yêu cầu thất bại (404)` khi `VITE_USE_MOCK=false` (gateway `localhost:8080`).

App: `http://localhost:8443` · API: `http://localhost:8080/api/v1`.

## Triệu chứng

- Nhiều màn (đặc biệt **Sơ đồ tầng** sau khi chọn chi nhánh) hiện `ErrorState` / QueryBoundary.
- Network: `GET …/api/v1/api/v1/floors?branchId=…` → **404** (double prefix).
- Cùng lúc: `GET …/tables/floor-plan` không có `branchId` → **400** (BrandAdmin JWT không có `branchId`).

## Nguyên nhân

1. **`floorsApi` chỉ có mock** nhưng vẫn export mock khi real mode; path `/api/v1/floors` nối vào `API_BASE_URL` đã kết thúc bằng `/api/v1` → `/api/v1/api/v1/floors`.
2. Backend **không có** `/floors` canvas API; sơ đồ thật là `/tables/dining-tables` + `/tables/floor-plan`.
3. **`floorTables()`** trong `be/orders.ts` chỉ lấy `user.branchId` từ JWT → BrandAdmin (`branchId: null`) gọi floor-plan thiếu query.

## Việc đã làm

| File | Thay đổi |
|------|----------|
| `src/lib/api/http.ts` | `buildUrl`: bỏ prefix `/api/v1` trùng khi không mock |
| `src/lib/api/floors.ts` | Mock path `/floors`; **beFloorsApi** chiếu `/tables` → 1 tầng giả lập (đọc + lưu vị trí bàn) |
| `src/lib/api/be/orders.ts` | `floorTables` dùng `getActiveBranchId()`; thêm `dbId` (UUID bàn) |
| `src/lib/api/orders.ts` | `TableRow.dbId?` |
| `src/pages/staff/FloorPlanViewer.tsx` | Khớp canvas theo UUID + mã bàn; sidebar không nhân đôi |

## Kiểm tra (chrome-devtools)

- `/caphenha/floor-plan` + chọn chi nhánh: **hết 404**, canvas “Sơ đồ bàn” load.
- Request đúng: `/tables/floor-plan?branchId=…`, `/tables/dining-tables?branchId=…` → 200.
- Các chi nhánh Cà phê Nhà hiện **0 bàn** → sidebar “Chưa có bàn…” là đúng dữ liệu, không phải lỗi API.
- Smoke: Bàn & QR, Quy tắc thanh toán, Báo cáo — không còn ErrorState 404 kiểu cũ.

## Việc liên quan trước đó (cùng chuỗi chat / compaction)

- Logo AICOS bị xén → `object-contain` / logo ngang.
- Đăng nhập quán / CTA header + guard customer → staff-entry.
- Rule MCP (`mcp-tools.mdc`): chrome-devtools + CodeGraph dùng chủ động.

## Ghi chú còn lại

- Editor canvas “tầng” đầy đủ (tường/cửa…) vẫn là model mock; real mode chủ yếu **chiếu bàn từ Tables**. Chỉnh khu vực/bàn/QR dùng **Bàn & QR**.
- `codegraph-frontend` / `codegraph-backend` đang v1.6.2; CLI có bản 1.6.3 (`codegraph upgrade`) — không bắt buộc cho fix này.
- Chưa commit / push theo yêu cầu session.
