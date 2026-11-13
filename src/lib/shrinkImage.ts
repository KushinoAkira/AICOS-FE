/**
 * Shrinks a photo chosen from the computer so it can be stored with the product: at most `maxSide` pixels on the long side, JPEG.
 * Returns a data URL (about 30-120 KB for a drink photo), or throws when the file is not an image the browser can read.
 */
export async function shrinkImage(file: File, maxSide = 640, quality = 0.82): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Chỉ chọn được file ảnh (JPG, PNG, WebP).")
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("Không đọc được ảnh này. Thử ảnh khác."))
      el.src = url
    })
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Trình duyệt không xử lý được ảnh.")
    ctx.fillStyle = "#ffffff"          // a transparent PNG gets a white background instead of black
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    let out = canvas.toDataURL("image/jpeg", quality)
    // Very detailed photos: step the quality down until it fits the server limit.
    for (let q = quality - 0.15; out.length > 380_000 && q > 0.3; q -= 0.15) out = canvas.toDataURL("image/jpeg", q)
    if (out.length > 380_000) throw new Error("Ảnh quá lớn sau khi thu nhỏ. Chọn ảnh khác.")
    return out
  } finally {
    URL.revokeObjectURL(url)
  }
}
