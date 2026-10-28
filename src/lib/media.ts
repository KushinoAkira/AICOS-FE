/**
 * Static demo photos under /public/media.
 * Query bump forces clients off a bad cached Git-LFS pointer that Hosting briefly served.
 */
const MEDIA_VER = "lfs2"

export function mediaUrl(file: string) {
  const name = file.endsWith(".jpg") ? file : `${file}.jpg`
  return `/media/${name}?v=${MEDIA_VER}`
}
