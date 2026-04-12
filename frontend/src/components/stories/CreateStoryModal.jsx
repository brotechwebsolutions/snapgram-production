import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, ImagePlus, Loader } from 'lucide-react'
import { storiesApi } from '../../api/stories'
import toast from 'react-hot-toast'

export default function CreateStoryModal({ onClose, onCreated }) {
  const [file, setFile]       = useState(null)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [privacy, setPrivacy] = useState('ALL')
  const [submitting, setSubmitting] = useState(false)

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) {
      setFile(accepted[0])
      setPreview(URL.createObjectURL(accepted[0]))
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  })

  const handleSubmit = async () => {
    if (!file) { toast.error('Please select a file'); return }
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('data', new Blob([JSON.stringify({ caption, privacy })], { type: 'application/json' }))
      const { data } = await storiesApi.create(formData)
      toast.success('Story posted!')
      onCreated?.(data.data)
    } catch {
      toast.error('Failed to post story')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm animate-scale-in overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <button onClick={onClose}><X size={20} /></button>
          <h3 className="font-semibold">New Story</h3>
          <button onClick={handleSubmit} disabled={!file || submitting}
            className="text-blue-500 font-semibold text-sm disabled:opacity-40 flex items-center gap-1">
            {submitting && <Loader size={14} className="animate-spin" />}
            Share
          </button>
        </div>

        {!preview ? (
          <div {...getRootProps()} className={`m-4 rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${isDragActive ? 'border-brand-400 bg-brand-50' : 'border-gray-200 dark:border-gray-700'}`}>
            <input {...getInputProps()} />
            <ImagePlus size={40} className="mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400 text-sm">Tap to select photo or video</p>
          </div>
        ) : (
          <div className="relative">
            <img src={preview} alt="Story preview" className="w-full max-h-80 object-cover" />
            <button onClick={() => { setFile(null); setPreview(null) }}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="px-4 pb-4 space-y-3">
          <input
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Add a caption..."
            maxLength={200}
            className="input-base text-sm"
          />
          <select value={privacy} onChange={e => setPrivacy(e.target.value)} className="input-base text-sm">
            <option value="ALL">Everyone</option>
            <option value="FOLLOWERS">Followers only</option>
            <option value="CLOSE_FRIENDS">Close friends</option>
          </select>
        </div>
      </div>
    </div>
  )
}
