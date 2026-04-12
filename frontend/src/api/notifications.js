import api from './axios'

export const notificationsApi = {
  getAll:       (page, size) => api.get(`/notifications?page=${page}&size=${size}`),
  getUnreadCount: ()         => api.get('/notifications/unread-count'),
  markAllRead:  ()           => api.post('/notifications/mark-all-read'),
  markRead:     (id)         => api.post(`/notifications/${id}/read`),
  clearAll:     ()           => api.delete('/notifications'),
}
