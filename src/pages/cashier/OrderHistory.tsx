import { useQuery } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { WorkHistory } from "../../components/WorkHistory"
import { staffApi } from "../../lib/api/staff"

/** "Đơn hàng" for cashiers and baristas: look up any order of the branch by time, type, status or a search, to check something quickly. */
export default function StaffOrderHistory({ navigate }: { navigate: (p: Page) => void }) {
  // Only to offer "Ca gần nhất" (the last shift this person worked) as a time window.
  const mine = useQuery({ queryKey: ["my-shifts"], queryFn: staffApi.myShifts, retry: false })
  return (
    <PageFrame page="staff-orders" navigate={navigate} uc="UC-46" title="Đơn hàng" subtitle="Tra cứu nhanh đơn của chi nhánh: tìm theo mã đơn, bàn hoặc món, lọc theo thời gian, loại và trạng thái.">
      <WorkHistory shifts={mine.data ?? []} />
    </PageFrame>
  )
}
