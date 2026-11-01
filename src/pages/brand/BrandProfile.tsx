import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { BrandPreview, ColorPicker, LogoPicker } from "../../components/BrandIdentityFields"
import { PageFrame } from "../../components/PageFrame"
import { Button, Field, QueryBoundary } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { brandApi, type BrandProfile as Profile } from "../../lib/api/brand"

/** Brand Admin edits the logo and colour shown on the brand's own login / sign-up pages. */
export default function BrandProfile({ navigate }: { navigate: (p: Page) => void }) {
  const profile = useQuery({ queryKey: ["brand", "profile"], queryFn: brandApi.profile })
  return (
    <PageFrame page="brand-profile" navigate={navigate} uc="UC-EXTRA" title="Thương hiệu" subtitle="Logo và màu hiển thị trên trang đăng nhập, đăng ký của khách hàng và nhân viên quán.">
      <QueryBoundary query={profile}>{(p) => <ProfileForm key={p.slug} initial={p} />}</QueryBoundary>
    </PageFrame>
  )
}

function ProfileForm({ initial }: { initial: Profile }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [logo, setLogo] = useState<string | undefined>(initial.logoUrl)
  const [color, setColor] = useState<string | undefined>(initial.brandColor)
  const [description, setDescription] = useState(initial.description ?? "")
  const save = useMutation({
    mutationFn: () => brandApi.saveProfile({ logoUrl: logo, brandColor: color, description: description.trim() || undefined }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["brand", "profile"] }); void qc.invalidateQueries({ queryKey: ["public"] }); showToast("Đã lưu thương hiệu", "success") },
    onError: (e) => showToast(e.message, "error"),
  })
  const dirty = logo !== initial.logoUrl || color !== initial.brandColor || description.trim() !== (initial.description ?? "")

  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6 rounded-[16px] border border-border bg-surface p-5 sm:p-6">
        <div><p className="text-sm text-text-secondary">Tên thương hiệu</p><p className="font-serif text-xl text-text-primary">{initial.name}</p><p className="text-xs text-text-secondary">{initial.slug}.aicos.app</p></div>
        <LogoPicker name={initial.name} value={logo} onChange={setLogo} />
        <ColorPicker value={color} onChange={setColor} />
        <Field label="Giới thiệu ngắn" hint="Hiện trên thẻ quán khi khách chọn quán." maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex flex-wrap gap-3">
          <Button loading={save.isPending} disabled={!dirty} disabledReason="Chưa có thay đổi" onClick={() => save.mutate()}>Lưu thay đổi</Button>
          <Button variant="secondary" onClick={() => window.open(`/login?brand=${initial.slug}`, "_blank", "noopener")}>Mở trang đăng nhập của quán</Button>
        </div>
      </div>
      <BrandPreview name={initial.name} logo={logo} color={color} />
    </div>
  )
}
