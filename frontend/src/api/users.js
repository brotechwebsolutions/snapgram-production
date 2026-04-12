import api from './axios'

export const usersApi = {
  // ── OWN PROFILE ──────────────────────────────────────────────────────────
  getMe:               ()              => api.get('/users/me'),
  updateProfile:       (data)          => api.put('/users/me', data),
  uploadProfilePic:    (formData)      => api.post('/users/me/profile-picture', formData,
                                            { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadCoverPhoto:    (formData)      => api.post('/users/me/cover-photo', formData,
                                            { headers: { 'Content-Type': 'multipart/form-data' } }),

  // ── PUBLIC ────────────────────────────────────────────────────────────────
  getProfile:          (username)      => api.get(`/users/${username}/profile`),

  /**
   * Check if a username is available (public endpoint, no auth required).
   * Returns { data: { data: true/false } }
   *   true  = available
   *   false = taken
   */
  checkUsername:       (username)      => api.get(`/users/check-username/${encodeURIComponent(username)}`),

  // ── SOCIAL ACTIONS ────────────────────────────────────────────────────────
  follow:              (userId)        => api.post(`/users/${userId}/follow`),
  unfollow:            (userId)        => api.delete(`/users/${userId}/follow`),
  block:               (userId)        => api.post(`/users/${userId}/block`),
  unblock:             (userId)        => api.delete(`/users/${userId}/block`),
  mute:                (userId)        => api.post(`/users/${userId}/mute`),
  unmute:              (userId)        => api.delete(`/users/${userId}/mute`),
  addCloseFriend:      (userId)        => api.post(`/users/${userId}/close-friends`),
  removeCloseFriend:   (userId)        => api.delete(`/users/${userId}/close-friends`),

  // ── SOCIAL GRAPH ──────────────────────────────────────────────────────────
  getFollowers:        (userId, p, s)  => api.get(`/users/${userId}/followers?page=${p}&size=${s}`),
  getFollowing:        (userId, p, s)  => api.get(`/users/${userId}/following?page=${p}&size=${s}`),

  // ── SEARCH ────────────────────────────────────────────────────────────────
  search:              (q, p, s)       => api.get(`/users/search?q=${encodeURIComponent(q)}&page=${p}&size=${s}`),
}
