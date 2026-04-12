import { getInitials } from '../../utils/helpers'

const SIZES = {
  xs:  'w-7 h-7 text-xs',
  sm:  'w-9 h-9 text-sm',
  md:  'w-11 h-11 text-base',
  lg:  'w-16 h-16 text-xl',
  xl:  'w-24 h-24 text-3xl',
  '2xl': 'w-32 h-32 text-4xl',
}

export default function Avatar({ user, size = 'md', ring = false, onClick, className = '' }) {
  const sizeClass = SIZES[size] || SIZES.md

  const base = `${sizeClass} rounded-full object-cover flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`

  if (user?.profilePictureUrl) {
    return (
      <div className={`relative ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
        {ring && (
          <div className="story-ring absolute inset-0 rounded-full" style={{padding:'2px', background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)'}}>
            <div className="w-full h-full rounded-full bg-white dark:bg-black" style={{padding:'2px'}}>
              <img src={user.profilePictureUrl} alt={user.username} className={`${sizeClass} rounded-full object-cover`} />
            </div>
          </div>
        )}
        {!ring && <img src={user.profilePictureUrl} alt={user?.username || ''} className={base} />}
      </div>
    )
  }

  // Fallback: initials avatar
  const colors = ['bg-purple-500','bg-pink-500','bg-red-500','bg-orange-500','bg-yellow-500','bg-green-500','bg-blue-500','bg-indigo-500']
  const colorIdx = user?.username ? user.username.charCodeAt(0) % colors.length : 0
  const bg = colors[colorIdx]

  return (
    <div
      className={`${sizeClass} ${bg} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {getInitials(user?.fullName || user?.username || '?')}
    </div>
  )
}
