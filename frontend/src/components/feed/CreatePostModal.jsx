import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, ImagePlus, ChevronLeft, MapPin, Tag, Loader } from 'lucide-react'
import { postsApi } from '../../api/posts'
import { useAuth }  from '../../context/AuthContext'
import Avatar       from '../common/Avatar'
import toast        from 'react-hot-toast'

const STEPS = ['upload', 'crop', 'details']

export default function CreatePostModal({ onClose, onCreated }) {
  const { user }  = useAuth()
  const [step, setStep]       = useState('upload')
  const [files, setFiles]     = useState([])
  const [previews, setPreviews] = useState([])
  const [previewIdx, setPreviewIdx] = useState(0)
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const [altText, setAltText] = useState('')
  const [disableComments, setDisableComments] = useState(false)
  const [status, setStatus]   = useState('PUBLISHED')
  const [submitting, setSubmitting] = useState(false)

  const onDrop = useCallback((accepted) => {
    if (accepted.length === 0) return
    const newPreviews = accepted.map(f => URL.createObjectURL(f))
    setFiles(accepted)
    setPreviews(newPreviews)
    setStep('details')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg','.jpeg','.png','.webp','.gif'] },
    maxFiles: 10,
    maxSize: 10 * 1024 * 1024,
    onDropRejected: (r) => {
      const err = r[0]?.errors[0]
      if (err?.code === 'file-too-large') toast.error('File too large. Max 10MB.')
      else toast.error('Invalid file type.')
    }
  })

  const extractHashtags = (text) => {
    const matches = text.match(/#[\w]+/g)
    return matches ? matches.map(h => h.slice(1)) : []
  }

  const handleSubmit = async () => {
    if (files.length === 0) { toast.error('Please add at least one image'); return }
    setSubmitting(true)
    try {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f))

      const postData = {
        caption,
        location,
        hashtags: extractHashtags(caption),
        status,
        commentsDisabled: disableComments,
      }
      formData.append('data', new Blob([JSON.stringify(postData)], { type: 'application/json' }))

      const { data } = await postsApi.create(formData)
      toast.success('Post shared!')
      onCreated?.(data.data)
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create post')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          {step === 'details'
            ? <button onClick={() => setStep('upload')} className="p-1"><ChevronLeft size={22} /></button>
            : <button onClick={onClose} className="p-1"><X size={22} /></button>
          }
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {step === 'upload' ? 'Create new post' : 'New post'}
          </h3>
          {step === 'details'
            ? <button
                onClick={handleSubmit}
                disabled={submitting}
                className="text-blue-500 font-semibold text-sm disabled:opacity-50 flex items-center gap-1"
              >
                {submitting && <Loader size={14} className="animate-spin" />}
                {status === 'DRAFT' ? 'Save draft' : 'Share'}
              </button>
            : <div className="w-8" />
          }
        </div>

        {/* Upload step */}
        {step === 'upload' && (
          <div
            {...getRootProps()}
            className={`flex-1 flex flex-col items-center justify-center m-4 rounded-2xl border-2 border-dashed cursor-pointer transition-colors
              ${isDragActive
                ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
          >
            <input {...getInputProps()} />
            <div className="text-center p-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <ImagePlus size={36} className="text-gray-400" />
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {isDragActive ? 'Drop your photos here' : 'Drag photos here'}
              </p>
              <p className="text-gray-500 text-sm mb-4">JPEG, PNG, WebP, GIF — up to 10MB</p>
              <button type="button" className="btn-primary text-sm px-6 py-2">
                Select from computer
              </button>
            </div>
          </div>
        )}

        {/* Details step */}
        {step === 'details' && (
          <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
            {/* Image preview */}
            <div className="md:w-1/2 bg-black flex-shrink-0">
              <div className="relative aspect-square">
                <img src={previews[previewIdx]} alt="Preview" className="w-full h-full object-contain" />
                {previews.length > 1 && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                    {previews.map((_, i) => (
                      <button key={i} onClick={() => setPreviewIdx(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${i === previewIdx ? 'bg-white w-3' : 'bg-white/60'}`} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Details form */}
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
              {/* User */}
              <div className="flex items-center gap-3">
                <Avatar user={user} size="sm" />
                <span className="font-semibold text-sm text-gray-900 dark:text-white">{user?.username}</span>
              </div>

              {/* Caption */}
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Write a caption... Use # for hashtags, @ for mentions"
                rows={4}
                maxLength={2200}
                className="input-base resize-none text-sm"
              />
              <p className="text-xs text-gray-400 text-right -mt-3">{caption.length}/2200</p>

              {/* Location */}
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-3.5 text-gray-400" />
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Add location"
                  className="input-base pl-9 text-sm"
                />
              </div>

              {/* Options */}
              <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Turn off comments</span>
                  <div
                    onClick={() => setDisableComments(d => !d)}
                    className={`w-10 h-5 rounded-full transition-colors ${disableComments ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${disableComments ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </label>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Save as draft</span>
                  <input
                    type="checkbox"
                    checked={status === 'DRAFT'}
                    onChange={e => setStatus(e.target.checked ? 'DRAFT' : 'PUBLISHED')}
                    className="w-4 h-4 accent-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
