import { useAuth } from '../../context/AuthContext'

export default function Dashboard() {
  const { profile } = useAuth()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Welcome back, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
      </h1>
      <p className="text-gray-500 text-sm mb-8">Here's what's happening at Jabana today.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Maize in Stock', value: '—', unit: 'kg', color: 'bg-yellow-50 text-yellow-700' },
          { label: 'Flour in Stock', value: '—', unit: 'kg', color: 'bg-green-50 text-green-700' },
          { label: "Today's Sales", value: '—', unit: 'RWF', color: 'bg-blue-50 text-blue-700' },
          { label: 'Unpaid Suppliers', value: '—', unit: 'RWF', color: 'bg-red-50 text-red-700' },
        ].map(card => (
          <div key={card.label} className={`rounded-2xl p-4 ${card.color}`}>
            <p className="text-xs font-medium opacity-70 mb-2">{card.label}</p>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs opacity-60">{card.unit}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <p className="text-gray-400 text-sm text-center py-8">Recent activity will appear here once data is added.</p>
      </div>
    </div>
  )
}
