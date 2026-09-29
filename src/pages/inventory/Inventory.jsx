import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Package } from 'lucide-react'

export default function Stock() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchStock() }, [])

  async function fetchStock() {
    setLoading(true)
    const [{ data: batches }, { data: sales }, { data: returns_ }, { data: spoiled }] = await Promise.all([
      supabase.from('batches').select('flour_produced_kg, bags_5kg, bags_10kg, bags_25kg'),
      supabase.from('sales').select('bags_5kg, bags_10kg, bags_25kg, total_kg'),
      supabase.from('returns').select('bags_5kg, bags_10kg, bags_25kg'),
      supabase.from('spoiled_packages').select('bags_5kg, bags_10kg, bags_25kg'),
    ])

    const sum = (arr, key) => (arr ?? []).reduce((s, x) => s + (x[key] ?? 0), 0)

    const produced = { b5: sum(batches, 'bags_5kg'), b10: sum(batches, 'bags_10kg'), b25: sum(batches, 'bags_25kg') }
    const sold = { b5: sum(sales, 'bags_5kg'), b10: sum(sales, 'bags_10kg'), b25: sum(sales, 'bags_25kg') }
    const returned = { b5: sum(returns_, 'bags_5kg'), b10: sum(returns_, 'bags_10kg'), b25: sum(returns_, 'bags_25kg') }
    const spoiledBags = { b5: sum(spoiled, 'bags_5kg'), b10: sum(spoiled, 'bags_10kg'), b25: sum(spoiled, 'bags_25kg') }

    const remaining = {
      b5: produced.b5 - sold.b5 + returned.b5 - spoiledBags.b5,
      b10: produced.b10 - sold.b10 + returned.b10 - spoiledBags.b10,
      b25: produced.b25 - sold.b25 + returned.b25 - spoiledBags.b25,
    }

    const totalProducedKg = (batches ?? []).reduce((s, b) => s + parseFloat(b.flour_produced_kg ?? 0), 0)
    const totalSoldKg = (sales ?? []).reduce((s, x) => s + parseFloat(x.total_kg ?? 0), 0)
    const totalReturnedKg = returned.b5 * 5 + returned.b10 * 10 + returned.b25 * 25
    const totalSpoiledKg = spoiledBags.b5 * 5 + spoiledBags.b10 * 10 + spoiledBags.b25 * 25
    const totalRemainingKg = remaining.b5 * 5 + remaining.b10 * 10 + remaining.b25 * 25

    setStats({ produced, sold, returned, spoiledBags, remaining, totalProducedKg, totalSoldKg, totalReturnedKg, totalSpoiledKg, totalRemainingKg })
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const bagSizes = [
    { label: '5 kg Bags', produced: stats.produced.b5, sold: stats.sold.b5, returned: stats.returned.b5, spoiled: stats.spoiledBags.b5, remaining: stats.remaining.b5 },
    { label: '10 kg Bags', produced: stats.produced.b10, sold: stats.sold.b10, returned: stats.returned.b10, spoiled: stats.spoiledBags.b10, remaining: stats.remaining.b10 },
    { label: '25 kg Bags', produced: stats.produced.b25, sold: stats.sold.b25, returned: stats.returned.b25, spoiled: stats.spoiledBags.b25, remaining: stats.remaining.b25 },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
        <p className="text-gray-500 text-sm mt-1">Current flour stock by bag size.</p>
      </div>

      {/* Total stock card */}
      <div className="bg-green-600 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Package size={24} />
          <p className="font-semibold text-green-100">Total Flour in Stock</p>
        </div>
        <p className="text-5xl font-bold mb-1">{stats.totalRemainingKg.toLocaleString()} kg</p>
        <p className="text-green-200 text-sm">
          {stats.totalProducedKg.toLocaleString()} kg produced · {stats.totalSoldKg.toLocaleString()} kg sold · {stats.totalReturnedKg.toLocaleString()} kg returned · {stats.totalSpoiledKg.toLocaleString()} kg spoiled
        </p>
      </div>

      {/* Per bag size breakdown */}
      <div className="space-y-4">
        {bagSizes.map(b => (
          <div key={b.label} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="font-bold text-gray-900">{b.label}</p>
              <span className="text-lg font-bold text-green-700">{b.remaining} remaining</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
              {[
                { label: 'Produced', value: b.produced, color: 'text-green-700' },
                { label: 'Sold', value: b.sold, color: 'text-blue-700' },
                { label: 'Returned', value: b.returned, color: 'text-yellow-700' },
                { label: 'Spoiled', value: b.spoiled, color: 'text-red-600' },
              ].map(s => (
                <div key={s.label} className="px-5 py-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
