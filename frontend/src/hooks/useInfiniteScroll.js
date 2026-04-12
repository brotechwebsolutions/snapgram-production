import { useState, useCallback } from 'react'

export function useInfiniteScroll(fetchFn) {
  const [items, setItems]     = useState([])
  const [page, setPage]       = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const load = useCallback(async (reset = false) => {
    if (loading) return
    setLoading(true)
    setError(null)
    const currentPage = reset ? 0 : page
    try {
      const result = await fetchFn(currentPage)
      const newItems = result?.content ?? []
      setItems(prev => reset ? newItems : [...prev, ...newItems])
      setHasMore(!result?.last)
      setPage(currentPage + 1)
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [page, loading, fetchFn])

  const reset = useCallback(() => {
    setItems([]); setPage(0); setHasMore(true); setError(null)
  }, [])

  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id))
  const updateItem = (id, upd) => setItems(prev => prev.map(i =>
    i.id === id ? (typeof upd === 'function' ? upd(i) : { ...i, ...upd }) : i))

  return { items, setItems, loading, hasMore, error, load, reset, removeItem, updateItem }
}
