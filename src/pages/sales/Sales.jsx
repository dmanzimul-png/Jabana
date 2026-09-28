import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import DeleteConfirm from '../../components/DeleteConfirm'
import { Plus, X, ShoppingCart, Trash2 } from 'lucide-react'

const statusColors = {
  paid: 'bg-green-100 text-green-700',
  partially_paid: 'bg-yellow-100 text-yellow-700',
  unpaid: 'bg-red-100 text-red-700',
}
const statusLabels = { paid: 'Paid', partially_paid: 'Partially Paid', unpaid: 'Unpaid' }

function formatRWF(amount) {
  return 'RWF ' + Number(amount).toLocaleString()
}

export default function Sales() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const [form, setForm] = useState({
    customer_name: '', location: '', bags_5kg: '', bags_10kg: '', bags_25kg: '',
    price_per_kg: '', amount_received: '', payment_status: 'paid', salesperson: '', notes: '',
  })

  useEffect(() => { fetchSales() }, [])

  async function fetchSales() {
    setLoading(true)
    const { data } = await supabase.from('sales').select('*').order('sold_at', { ascending: false })
    setSales(data ?? [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const { error: err } = await supabase.from('sales').insert({
        customer_name: form.customer_name, location: form.location,
        bags_5kg: parseInt(form.bags_5kg) || 0, bags_10kg: parseInt(form.bags_10kg) || 0, bags_25kg: parseInt(form.bags_25kg) || 0,
        price_per_kg: parseFloat(form.price_per_kg), amount_received: parseFloat(form.amount_received) || 0,
        payment_status: form.payment_status, salesperson: form.salesperson, notes: form.notes,
      })
      if (err) throw err
      setShowForm(false)
      setForm({ customer_name: '', location: '', bags_5kg: '', bags_10kg: '', bags_25kg: '', price_per_kg: '', amount_received: '', payment_status: 'paid', salesperson: '', notes: '' })
      fetchSales()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    await supabase.from('sales').delete().eq('id', deleteId)
    setDeleteId(null)
    fetchSales()
  }

  const totalKg = (parseInt(form.bags_5kg) || 0) * 5 + (parseInt(form.bags_10kg) || 0) * 10 + (parseInt(form.bags_25kg) || 0) * 25
  const totalAmount = totalKg * (parseFloat(form.price_per_kg) || 0)
  const todayRevenue = sales.filter(s => new Date(s.sold_at).toDateString() === new Date().toDateString()).reduce((s, x) => s + parseFloat(x.amount_received), 0)
  const totalRevenue = sales.reduce((s, x) => s + parseFloat(x.amount_received), 0)
  const totalKgSold = sales.reduce((s, x) => s + parseFloat(x.total_kg), 0)

  return (
    <div>
      {deleteId && <DeleteConfirm onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-gray-500 text-sm mt-1">Record flour sales and track payments.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition">
          <Plus size={18} /> New Sale
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Today's Revenue", value: formatRWF(todayRevenue), color: 'bg-blue-50 text-blue-800' },
          { label: 'Total Revenue', value: formatRWF(totalRevenue), color: 'bg-green-50 text-green-800' },
          { label: 'Total kg Sold', value: `${totalKgSold.toLocaleString()} kg`, color: 'bg-yellow-50 text-yellow-800' },
          { label: 'Transactions', value: sales.length, color: 'bg-purple-50 text-purple-800' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 ${s.color.split(' ')[0]}`}>
            <p className={`text-xs font-medium mb-1 ${s.color.split(' ')[1]} opacity-70`}>{s.label}</p>
            <p className={`text-xl font-bold ${s.color.split(' ')[1]}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sales.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16 text-gray-400">
          <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No sales yet. Click <strong>New Sale</strong> to start.</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {sales.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900">{s.customer_name}</p>
                    {s.location && <p className="text-xs text-gray-400">📍 {s.location}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[s.payment_status]}`}>{statusLabels[s.payment_status]}</span>
                    <button onClick={() => setDeleteId(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition"><Trash2 size={15} /></button>
                  </div>
                </div>
                <div className="flex gap-2 text-xs text-gray-500 mb-3">
                  {s.bags_5kg > 0 && <span className="bg-gray-100 rounded-lg px-2 py-1">{s.bags_5kg}×5kg</span>}
                  {s.bags_10kg > 0 && <span className="bg-gray-100 rounded-lg px-2 py-1">{s.bags_10kg}×10kg</span>}
                  {s.bags_25kg > 0 && <span className="bg-gray-100 rounded-lg px-2 py-1">{s.bags_25kg}×25kg</span>}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">{Number(s.total_kg).toLocaleString()} kg total</p>
                    {s.salesperson && <p className="text-xs text-gray-400">👤 {s.salesperson}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-700">{formatRWF(s.amount_received)}</p>
                    <p className="text-xs text-gray-400">{new Date(s.sold_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Customer', 'Location', '5kg', '10kg', '25kg', 'Total kg', 'Total', 'Received', 'Status', 'Salesperson', 'Date', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sales.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-900">{s.customer_name}</td>
                      <td className="px-4 py-3 text-gray-500">{s.location || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{s.bags_5kg}</td>
                      <td className="px-4 py-3 text-gray-700">{s.bags_10kg}</td>
                      <td className="px-4 py-3 text-gray-700">{s.bags_25kg}</td>
                      <td className="px-4 py-3 font-medium">{Number(s.total_kg).toLocaleString()} kg</td>
                      <td className="px-4 py-3 font-semibold">{formatRWF(s.total_amount)}</td>
                      <td className="px-4 py-3 text-green-700 font-medium">{formatRWF(s.amount_received)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[s.payment_status]}`}>{statusLabels[s.payment_status]}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{s.salesperson || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(s.sold_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><button onClick={() => setDeleteId(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition"><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">Record New Sale</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input type="text" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })}
                    required placeholder="e.g. John Doe"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Kigali"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bags Sold</label>
                <div className="grid grid-cols-3 gap-3">
                  {[{ label: '5 kg', key: 'bags_5kg' }, { label: '10 kg', key: 'bags_10kg' }, { label: '25 kg', key: 'bags_25kg' }].map(({ label, key }) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-500 mb-1">{label} bags</label>
                      <input type="number" min="0" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                        placeholder="0"
                        className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per kg (RWF)</label>
                <input type="number" step="1" min="0" value={form.price_per_kg} onChange={e => setForm({ ...form, price_per_kg: e.target.value })}
                  required placeholder="e.g. 800"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              {totalAmount > 0 && (
                <div className="bg-green-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-green-700 font-medium">{totalKg} kg → Total</span>
                  <span className="text-lg font-bold text-green-800">{formatRWF(totalAmount)}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                  <select value={form.payment_status} onChange={e => setForm({ ...form, payment_status: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="paid">Paid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Received (RWF)</label>
                  <input type="number" step="1" min="0" value={form.amount_received} onChange={e => setForm({ ...form, amount_received: e.target.value })}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salesperson / Driver</label>
                <input type="text" value={form.salesperson} onChange={e => setForm({ ...form, salesperson: e.target.value })}
                  placeholder="e.g. Jean Pierre"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  placeholder="Any additional notes..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button type="submit" disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50 text-base">
                {saving ? 'Saving...' : 'Record Sale'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
