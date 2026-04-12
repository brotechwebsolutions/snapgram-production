import api from './axios'

export const searchApi = {
  global:   (q, page, size)  => api.get(`/search?q=${encodeURIComponent(q)}&page=${page}&size=${size}`),
  users:    (q, page, size)  => api.get(`/search/users?q=${encodeURIComponent(q)}&page=${page}&size=${size}`),
  posts:    (q, page, size)  => api.get(`/search/posts?q=${encodeURIComponent(q)}&page=${page}&size=${size}`),
  trending: (limit = 20)     => api.get(`/search/trending?limit=${limit}`),
}
