import { useState } from 'react'

export function useLocalStorage(key, initialValue) {
  const [stored, setStored] = useState(() => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : initialValue }
    catch { return initialValue }
  })
  const set = (value) => {
    const v = value instanceof Function ? value(stored) : value
    setStored(v)
    localStorage.setItem(key, JSON.stringify(v))
  }
  return [stored, set]
}
