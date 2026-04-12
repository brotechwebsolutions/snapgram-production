import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import PostCard from '../feed/PostCard'

export default function PostDetailModal({ post, onClose, onDelete }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="text-white p-2"><X size={24} /></button>
        </div>
        <PostCard post={post} onDelete={onDelete} />
      </div>
    </div>
  )
}
