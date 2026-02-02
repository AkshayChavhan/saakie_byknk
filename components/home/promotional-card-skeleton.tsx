export function PromotionalCardSkeleton() {
  return (
    <div className="bg-white rounded-lg p-6 h-48 animate-pulse flex flex-col justify-between">
      <div>
        <div className="h-6 bg-gray-200 rounded mb-4"></div>
        <div className="h-8 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded mb-4"></div>
      </div>
      <div>
        <div className="h-4 bg-gray-200 rounded mb-1"></div>
        <div className="h-4 bg-gray-200 rounded mb-1"></div>
        <div className="h-3 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}