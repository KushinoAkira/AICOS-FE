import { useEffect, useState } from "react"

/** Seconds left until `seconds` from the moment it is set; 0 when finished. */
export function useCountdown(seconds: number, restartKey = 0) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    setLeft(seconds)
    if (seconds <= 0) return
    const id = setInterval(() => setLeft((s) => (s <= 1 ? (clearInterval(id), 0) : s - 1)), 1000)
    return () => clearInterval(id)
  }, [seconds, restartKey])
  return left
}

export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
