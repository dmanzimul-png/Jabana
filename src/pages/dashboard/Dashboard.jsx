import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Wheat, Package, ShoppingCart, TrendingUp, AlertCircle } from 'lucide-react'

function formatRWF(amount) {
  return 'RWF ' + Number(amount).toLocaleString()
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [recentSales, setRecentSales] = useState([])
  const [recentDeliveries, setRecentDeliveries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchDashboard() }, [])

  async function fetchDashboard() {
    setLoading(true)

    const [
      { data: batches },
      { data: sales },
      { data: deliveries },
      { data: expenses },
    ] = await Promise.all([
      supabase.from('batches').select('flour_produced_kg'),
      supabase.from('sales').select('*').order('sold_at', { ascending: false }),
      supabase.from('maize_deliveries').select('*, suppliers(name)').order('received_at', { ascending: false }),
      supabase.from('expenses').select('amount'),
    ])

    const totalFlourProduced = (batches ?? []).reduce((s, b) => s + parseFloat(b.flour_produced_kg), 0)
    const totalSoldKg = (sales ?? []).reduce((s, sale) => s + parseFloat(sale.total_kg), 0)
    const flourInStock = totalFlourProduced - totalSoldKg

    const today = new Date().toDateString()
    const todaySales = (sales ?? []).filter(s => new Date(s.sold_at).toDateString() === today)
    const todayRevenue = todaySales.reduce((s, sale) => s + parseFloat(sale.amount_received), 0)
    const totalRevenue = (sales ?? []).reduce((s, sale) => s + parseFloat(sale.amount_received), 0)
    const totalExpenses = (expenses ?? []).reduce((s, e) => s + parseFloat(e.amount), 0)

    const unpaidSuppliers = (deliveries ?? [])
      .filter(d => d.payment_status !== 'paid')
      .reduce((s, d) => s + (parseFloat(d.total_amount) - parseFloat(d.amount_paid)), 0)

    setStats({ flourInStock, todayRevenue, totalRevenue, totalExpenses, unpaidSuppliers, totalFlourProduced })
    setRecentSales((sales ?? []).slice(0, 5))
    setRecentDeliveries((deliveries ?? []).slice(0, 5))
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const statCards = [
    { label: 'Flour in Stock', value: `${stats.flourInStock.toLocaleString()} kg`, icon: Package, color: 'bg-green-50 text-green-700', iconBg: 'bg-green-100' },
    { label: "Today's Revenue", value: formatRWF(stats.todayRevenue), icon: TrendingUp, color: 'bg-blue-50 text-blue-700', iconBg: 'bg-blue-100' },
    { label: 'Total Revenue', value: formatRWF(stats.totalRevenue), icon: ShoppingCart, color: 'bg-purple-50 text-purple-700', iconBg: 'bg-purple-100' },
    { label: 'Unpaid Suppliers', value: formatRWF(stats.unpaidSuppliers), icon: AlertCircle, color: 'bg-red-50 text-red-700', iconBg: 'bg-red-100' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here's what's happening at Jabana today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, iconBg }) => (
          <div key={label} className={`rounded-2xl p-4 ${color.split(' ')[0]}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${iconBg}`}>
              <Icon size={18} className={color.split(' ')[1]} />
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${color.split(' ')[1]}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* P&L Snapshot */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <p className="font-semibold text-gray-800 mb-4">Profit & Loss Snapshot</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
            <p className="text-lg font-bold text-green-700">{formatRWF(stats.totalRevenue)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Total Expenses</p>
            <p className="text-lg font-bold text-red-600">{formatRWF(stats.totalExpenses)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Net Profit</p>
            <p className={`text-lg font-bold ${stats.totalRevenue - stats.totalExpenses >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {formatRWF(stats.totalRevenue - stats.totalExpenses)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="font-semibold text-gray-800">Recent Sales</p>
          </div>
          {recentSales.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No sales yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentSales.map(s => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.customer_name}</p>
                    <p className="text-xs text-gray-400">{s.total_kg} kg · {new Date(s.sold_at).toLocaleDateString()}</p>
                  </div>
                  <p className="text-sm font-semibold text-green-700">{formatRWF(s.amount_received)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Deliveries */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="font-semibold text-gray-800">Recent Maize Deliveries</p>
          </div>
          {recentDeliveries.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No deliveries yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentDeliveries.map(d => (
                <div key={d.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.suppliers?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{d.tonnes}t · {d.batch_number}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    d.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                    d.payment_status === 'partially_paid' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {d.payment_status === 'paid' ? 'Paid' : d.payment_status === 'partially_paid' ? 'Partial' : 'Unpaid'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
