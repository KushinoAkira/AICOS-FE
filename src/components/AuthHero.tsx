import { useState } from "react"

/**
 * Left-hand panel shared by the staff and customer sign-in screens (desktop only). The photo sits on a warm espresso
 * background, so the panel still looks finished when the photo cannot load (offline demo, blocked CDN).
 */
export default function AuthHero() {
  const [photo, setPhoto] = useState(true)
  return (
    <div className="hidden p-6 lg:flex lg:w-5/12 xl:w-6/12">
      <div className="relative w-full overflow-hidden rounded-[20px] bg-gradient-to-br from-espresso via-clay to-terracotta">
        {photo && (
          <img
            src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&h=1100&fit=crop&auto=format"
            alt=""
            onError={() => setPhoto(false)}
            className="h-full min-h-[500px] w-full object-cover"
          />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-espresso/80 via-espresso/20 to-transparent" />
        <div className="absolute bottom-8 left-8 right-8 text-bg-base">
          <p className="font-serif text-2xl font-medium leading-snug">Mỗi tách cà phê là một khoảnh khắc. Chúng tôi giúp bạn trân trọng từng khoảnh khắc đó.</p>
          <p className="mt-4 text-sm text-bg-base/75">Gọi món, pha chế, thanh toán và tích điểm trên cùng một hệ thống.</p>
        </div>
      </div>
    </div>
  )
}
