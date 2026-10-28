/** Left-hand photo panel shared by the staff and customer login screens (desktop only). */
export default function AuthHero() {
  return (
    <div className="hidden lg:flex lg:w-5/12 xl:w-6/12 p-6">
      <div className="relative w-full overflow-hidden" style={{ borderRadius: "20px" }}>
        <img
          src={"/media/photo-1495474472287-4d71bcdd2085.jpg?v=lfs2"}
          alt="Không gian quán cà phê ấm áp"
          className="w-full h-full object-cover"
          style={{ minHeight: "500px" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(111,78,55,0.45) 0%, transparent 55%)" }}
        />
        <div className="absolute bottom-8 left-8 right-8">
          <p
            className="font-serif text-2xl font-medium leading-snug"
            style={{ color: "#FAF6F0", fontFamily: "'Literata', 'Inter', system-ui, sans-serif" }}
          >
            "Mỗi tách cà phê là một khoảnh khắc — chúng tôi giúp bạn trân trọng từng khoảnh khắc đó."
          </p>
        </div>
      </div>
    </div>
  )
}
