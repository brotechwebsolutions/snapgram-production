export function PostCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden animate-pulse">
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32" />
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        </div>
      </div>
      <div className="w-full aspect-square bg-gray-200 dark:bg-gray-700" />
      <div className="p-4 space-y-3">
        <div className="flex gap-4">
          <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      </div>
    </div>
  )
}

export function StorySkeleton() {
  return (
    <div className="flex flex-col items-center gap-1 animate-pulse">
      <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
      <div className="h-2 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Cover */}
      <div className="h-40 bg-gray-200 dark:bg-gray-700" />
      <div className="px-4 pb-4">
        <div className="flex justify-between items-end -mt-12 mb-4">
          <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full border-4 border-white dark:border-black" />
          <div className="h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded-xl mt-12" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
        <div className="flex gap-8 mt-4">
          {[1,2,3].map(i => (
            <div key={i} className="text-center">
              <div className="h-5 w-10 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-1" />
              <div className="h-3 w-14 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-0.5">
        {Array(9).fill(0).map((_,i) => (
          <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
    </div>
  )
}

export function UserCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 animate-pulse">
      <div className="w-11 h-11 bg-gray-200 dark:bg-gray-700 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-28" />
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-20" />
      </div>
      <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
    </div>
  )
}

export function CommentSkeleton() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
      </div>
    </div>
  )
}

export function MessageSkeleton() {
  return (
    <div className="space-y-4 p-4 animate-pulse">
      {[1,2,3,4].map(i => (
        <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
          <div className={`h-10 bg-gray-200 dark:bg-gray-700 rounded-2xl ${i % 2 === 0 ? 'w-40' : 'w-56'}`} />
        </div>
      ))}
    </div>
  )
}

export function NotificationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-11 h-11 bg-gray-200 dark:bg-gray-700 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-24" />
      </div>
      <div className="w-11 h-11 bg-gray-200 dark:bg-gray-700 rounded-lg" />
    </div>
  )
}
