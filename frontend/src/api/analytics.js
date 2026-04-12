import api from './axios'

export const analyticsApi = {
  profile:  ()        => api.get('/analytics/profile'),
  allPosts: ()        => api.get('/analytics/posts'),
  post:     (postId)  => api.get(`/analytics/posts/${postId}`),
}
