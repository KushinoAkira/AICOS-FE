---
name: design-md
description: Làm việc với DESIGN.md (design tokens của AICOS) và CLI @google/design.md. Dùng khi lint/export tokens, sửa DESIGN.md hoặc tạo UI theo design system.
---

# DESIGN.md - AICOS

`DESIGN.md` ở thư mục gốc Frontend là design system "AICOS Warm Roast" (YAML tokens + giải thích).
CLI `@google/design.md` được chạy qua `npx`, không cần cài monorepo nguồn.

## Lệnh (chạy ở thư mục Frontend)

```bash
pnpm design:lint     # validate DESIGN.md (contrast, token tham chiếu, thứ tự section)
pnpm design:export   # xuất exports/theme.css (Tailwind v4 @theme) và exports/tokens.json (DTCG)
pnpm design:sync     # chép DESIGN.md -> .agents/context/DESIGN.md cho Impeccable
```

## Quy trình sửa token

1. Sửa YAML trong `DESIGN.md`.
2. `pnpm design:lint` phải sạch lỗi.
3. Cập nhật khối `@theme` trong `src/index.css` cho khớp (nguồn dùng thực tế của Tailwind).
4. `pnpm design:sync`.

`exports/` là file sinh ra, không sửa tay.
