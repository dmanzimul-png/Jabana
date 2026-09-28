export default function MobileCard({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-4 ${className}`}>
      {children}
    </div>
  )
}
