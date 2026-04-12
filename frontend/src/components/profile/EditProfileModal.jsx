import { useState } from 'react'
import { X, Loader } from 'lucide-react'
import { usersApi } from '../../api/users'
import toast from 'react-hot-toast'

export default function EditProfileModal({ profile, onClose, onUpdated }) {
  const [form, setForm] = useState({
    fullName: profile.fullName || '',
    username: profile.username || '',
    bio: profile.bio || '',
    website: profile.website || '',
    gender: profile.gender || '',
    isPrivate: profile.isPrivate || false,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await usersApi.updateProfile(form)
      toast.success('Profile updated!')
      onUpdated(data.data)
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { key: 'fullName', label: 'Full name', type: 'text', max: 50 },
    { key: 'username', label: 'Username', type: 'text', max: 30 },
    { key: 'website',  label: 'Website', type: 'url', max: 100 },
  ]

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md animate-scale-in overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <button onClick={onClose}><X size={20} /></button>
          <h3 className="font-semibold text-gray-900 dark:text-white">Edit profile</h3>
          <button onClick={handleSubmit} disabled={loading}
            className="text-blue-500 font-semibold text-sm disabled:opacity-40 flex items-center gap-1">
            {loading && <Loader size={14} className="animate-spin" />} Save
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {fields.map(({ key, label, type, max }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                maxLength={max}
                className="input-base"
              />
            </div>
          ))}

          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Bio</label>
            <textarea
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              rows={3}
              maxLength={150}
              className="input-base resize-none"
            />
            <p className="text-xs text-gray-400 text-right">{form.bio.length}/150</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Gender</label>
            <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="input-base">
              <option value="">Prefer not to say</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Private account</p>
              <p className="text-xs text-gray-500">Only approved followers can see your posts</p>
            </div>
            <div onClick={() => setForm(f => ({ ...f, isPrivate: !f.isPrivate }))}
              className={`w-10 h-6 rounded-full transition-colors ${form.isPrivate ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${form.isPrivate ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </label>
        </form>
      </div>
    </div>
  )
}
