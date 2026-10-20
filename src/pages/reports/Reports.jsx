import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function formatRWF(amount) {
  return 'RWF ' + Number(amount).toLocaleString()
}

const expenseLabels = {
  wages: 'Worker Wages', fuel: 'Fuel', electricity: 'Electricity',
  processing: 'Processing', packaging: 'Packaging', truck: 'Truck',
  maintenance: 'Maintenance', transport: 'Transport', other: 'Other',
}

export default function Reports() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('all')

  useEffect(() => { fetchReports() }, [period])

  async function fetchReports() {
    setLoading(true)

    let salesQuery = supabase.from('sales').select('*')
    let expensesQuery = supabase.from('expenses').select('*')
    let deliveriesQuery = supabase.from('maize_deliveries').select('*')
    let batchesQuery = supabase.from('batches').select('*')

    if (period !== 'all') {
      const now = new Date()
      let from
      if (period === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      if (period === 'week') { from = new Date(now); from.setDate(now.getDate() - 7); from = from.toISOString() }
      salesQuery = salesQuery.gte('sold_at', from)
      expensesQuery = expensesQuery.gte('expense_date', from)
      deliveriesQuery = deliveriesQuery.gte('received_at', from)
      batchesQuery = batchesQuery.gte('produced_at', from)
    }

    const [{ data: sales }, { data: expenses }, { data: deliveries }, { data: batches }] = await Promise.all([
      salesQuery, expensesQuery, deliveriesQuery, batchesQuery,
    ])

    const totalRevenue = (sales ?? []).reduce((s, x) => s + parseFloat(x.amount_received), 0)
    const totalExpenses = (expenses ?? []).reduce((s, x) => s + parseFloat(x.amount), 0)
    const maizeCost = (deliveries ?? []).reduce((s, x) => s + parseFloat(x.total_amount ?? 0), 0)
    const totalCost = totalExpenses + maizeCost
    const netProfit = totalRevenue - totalCost

    const realBatches = (batches ?? []).filter(x => !x.is_opening_stock)
    const totalFlour = realBatches.reduce((s, x) => s + parseFloat(x.flour_produced_kg), 0)
    const totalMaize = realBatches.reduce((s, x) => s + parseFloat(x.maize_input_kg), 0)
    const avgYield = totalMaize > 0 ? ((totalFlour / totalMaize) * 100).toFixed(1) : 0

    const totalKgSold = (sales ?? []).reduce((s, x) => s + parseFloat(x.total_kg), 0)
    const bags5 = (sales ?? []).reduce((s, x) => s + x.bags_5kg, 0)
    const bags10 = (sales ?? []).reduce((s, x) => s + x.bags_10kg, 0)
    const bags25 = (sales ?? []).reduce((s, x) => s + x.bags_25kg, 0)

    // Expenses by category
    const byCategory = {}
    ;(expenses ?? []).forEach(e => {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + parseFloat(e.amount)
    })

    setData({ totalRevenue, totalExpenses, maizeCost, totalCost, netProfit, totalFlour, totalMaize, avgYield, totalKgSold, bags5, bags10, bags25, byCategory, salesCount: (sales ?? []).length, batchCount: (batches ?? []).length })
    setLoading(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Profit & Loss, production yield and sales summaries.</p>
        </div>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="all">All Time</option>
          <option value="month">This Month</option>
          <option value="week">This Week</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* P&L */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-800">Profit & Loss</p>
            </div>
            <div className="divide-y divide-gray-50">
              <div className="flex justify-between px-6 py-4">
                <p className="text-sm text-gray-600">Total Revenue (Sales)</p>
                <p className="text-sm font-semibold text-green-700">{formatRWF(data.totalRevenue)}</p>
              </div>
              <div className="flex justify-between px-6 py-4">
                <p className="text-sm text-gray-600">Maize Purchase Cost</p>
                <p className="text-sm font-semibold text-red-600">— {formatRWF(data.maizeCost)}</p>
              </div>
              <div className="flex justify-between px-6 py-4">
                <p className="text-sm text-gray-600">Operational Expenses</p>
                <p className="text-sm font-semibold text-red-600">— {formatRWF(data.totalExpenses)}</p>
              </div>
              <div className="flex justify-between px-6 py-4 bg-gray-50">
                <p className="text-sm font-bold text-gray-800">Net Profit</p>
                <p className={`text-sm font-bold ${data.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {data.netProfit >= 0 ? '' : '— '}{formatRWF(Math.abs(data.netProfit))}
                </p>
              </div>
            </div>
          </div>

          {/* Production */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-800">Production Summary</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6">
              {[
                { label: 'Batches', value: data.batchCount },
                { label: 'Maize Processed', value: `${data.totalMaize.toLocaleString()} kg` },
                { label: 'Flour Produced', value: `${data.totalFlour.toLocaleString()} kg` },
                { label: 'Avg Yield', value: `${data.avgYield}%` },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className="text-xl font-bold text-gray-800">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sales */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-800">Sales Summary</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6">
              {[
                { label: 'Transactions', value: data.salesCount },
                { label: 'Total kg Sold', value: `${data.totalKgSold.toLocaleString()} kg` },
                { label: '5kg Bags', value: data.bags5.toLocaleString() },
                { label: '10kg Bags', value: data.bags10.toLocaleString() },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className="text-xl font-bold text-gray-800">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Expenses breakdown */}
          {Object.keys(data.byCategory).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <p className="font-semibold text-gray-800">Expenses Breakdown</p>
              </div>
              <div className="divide-y divide-gray-50">
                {Object.entries(data.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
                  <div key={cat} className="flex justify-between px-6 py-3">
                    <p className="text-sm text-gray-600">{expenseLabels[cat] ?? cat}</p>
                    <p className="text-sm font-semibold text-red-600">{formatRWF(amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
