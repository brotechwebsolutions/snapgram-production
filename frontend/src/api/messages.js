import api from './axios'

export const messagesApi = {
  send:              (formData)              => api.post('/messages', formData),
  getConversations:  ()                      => api.get('/messages/conversations'),
  getMessages:       (convId, page, size)    => api.get(`/messages/conversations/${convId}?page=${page}&size=${size}`),
  sendTyping:        (convId, isTyping)      => api.post(`/messages/conversations/${convId}/typing`, { isTyping }),
  editMessage:       (messageId, content)    => api.put(`/messages/${messageId}`, { content }),
  markSeen:          (messageId)             => api.post(`/messages/${messageId}/seen`),
  deleteMessage:     (messageId)             => api.delete(`/messages/${messageId}`),
  pinConversation:   (convId)               => api.post(`/messages/conversations/${convId}/pin`),
}
