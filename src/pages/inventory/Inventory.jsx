import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Package } from 'lucide-react'

function formatRWF(amount) {
  return 'RWF ' + Number(amount).toLocaleString()
}

export default function Inventory() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchInventory() }, [])

  async function fetchInventory() {
    setLoading(true)

    const [{ data: batches }, { data: sales }] = await Promise.all([
      supabase.from('batches').select('flour_produced_kg'),
      supabase.from('sales').select('bags_5kg, bags_10kg, bags_25kg, total_kg'),
    ])

    const totalProduced = (batches ?? []).reduce((s, b) => s + parseFloat(b.flour_produced_kg), 0)
    const totalSoldKg = (sales ?? []).reduce((s, sale) => s + parseFloat(sale.total_kg), 0)
    const flourInStock = totalProduced - totalSoldKg

    const bags5Sold = (sales ?? []).reduce((s, sale) => s + sale.bags_5kg, 0)
    const bags10Sold = (sales ?? []).reduce((s, sale) => s + sale.bags_10kg, 0)
    const bags25Sold = (sales ?? []).reduce((s, sale) => s + sale.bags_25kg, 0)

    setStats({ totalProduced, totalSoldKg, flourInStock, bags5Sold, bags10Sold, bags25Sold })
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="text-gray-500 text-sm mt-1">Current flour stock based on production and sales.</p>
      </div>

      {/* Main stock card */}
      <div className="bg-green-600 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Package size={24} />
          <p className="font-semibold text-green-100">Flour Currently in Stock</p>
        </div>
        <p className="text-5xl font-bold mb-1">{stats.flourInStock.toLocaleString()} kg</p>
        <p className="text-green-200 text-sm">
          {stats.totalProduced.toLocaleString()} kg produced — {stats.totalSoldKg.toLocaleString()} kg sold
        </p>
      </div>

      {/* Bag breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: '5 kg Bags Sold', sold: stats.bags5Sold, kg: 5, color: 'bg-blue-50 text-blue-800', sub: 'text-blue-600' },
          { label: '10 kg Bags Sold', sold: stats.bags10Sold, kg: 10, color: 'bg-purple-50 text-purple-800', sub: 'text-purple-600' },
          { label: '25 kg Bags Sold', sold: stats.bags25Sold, kg: 25, color: 'bg-orange-50 text-orange-800', sub: 'text-orange-600' },
        ].map(b => (
          <div key={b.label} className={`rounded-2xl p-5 ${b.color.split(' ')[0]}`}>
            <p className={`text-xs font-medium mb-2 ${b.sub}`}>{b.label}</p>
            <p className={`text-3xl font-bold ${b.color.split(' ')[1]}`}>{b.sold.toLocaleString()}</p>
            <p className={`text-xs mt-1 ${b.sub}`}>{(b.sold * b.kg).toLocaleString()} kg total</p>
          </div>
        ))}
      </div>

      {/* Summary table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-800">Stock Summary</p>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { label: 'Total Flour Produced', value: `${stats.totalProduced.toLocaleString()} kg`, color: 'text-green-700' },
            { label: 'Total Flour Sold', value: `${stats.totalSoldKg.toLocaleString()} kg`, color: 'text-red-600' },
            { label: 'Flour Remaining in Stock', value: `${stats.flourInStock.toLocaleString()} kg`, color: 'text-gray-900 font-bold' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between px-6 py-4">
              <p className="text-sm text-gray-600">{row.label}</p>
              <p className={`text-sm ${row.color}`}>{row.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
