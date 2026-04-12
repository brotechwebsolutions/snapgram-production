import api from './axios'

export const storiesApi = {
  create:            (formData)    => api.post('/stories', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getFeed:           ()            => api.get('/stories/feed'),
  view:              (storyId)     => api.post(`/stories/${storyId}/view`),
  react:             (storyId, emoji) => api.post(`/stories/${storyId}/react`, { emoji }),
  delete:            (storyId)     => api.delete(`/stories/${storyId}`),
  createHighlight:   (data)        => api.post('/stories/highlights', data),
  getUserHighlights: (userId)      => api.get(`/stories/highlights/user/${userId}`),
  deleteHighlight:   (id)          => api.delete(`/stories/highlights/${id}`),
}
