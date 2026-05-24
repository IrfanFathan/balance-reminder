export default function SkeletonCard() {
  return (
    <div className="bg-white p-5 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="h-4 w-32 bg-gray-200 mb-2" />
          <div className="h-3 w-24 bg-gray-200" />
        </div>
        <div className="text-right">
          <div className="h-3 w-12 bg-gray-200 mb-1 ml-auto" />
          <div className="h-5 w-20 bg-gray-200 ml-auto" />
        </div>
      </div>
    </div>
  )
}
