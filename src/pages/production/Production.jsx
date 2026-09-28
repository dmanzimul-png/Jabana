import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, X, Factory } from 'lucide-react'

function formatRWF(amount) {
  return 'RWF ' + Number(amount).toLocaleString()
}

export default function Production() {
  const [batches, setBatches] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    delivery_id: '',
    maize_input_kg: '',
    flour_produced_kg: '',
    byproduct_kg: '',
    other_loss_kg: '',
    notes: '',
  })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: b }, { data: d }] = await Promise.all([
      supabase.from('batches').select('*, maize_deliveries(batch_number, tonnes, suppliers(name))').order('produced_at', { ascending: false }),
      supabase.from('maize_deliveries').select('id, batch_number, tonnes, suppliers(name)').order('received_at', { ascending: false }),
    ])
    setBatches(b ?? [])
    setDeliveries(d ?? [])
    setLoading(false)
  }

  async function generateBatchNumber() {
    const year = new Date().getFullYear()
    const { count } = await supabase.from('batches').select('*', { count: 'exact', head: true })
    const next = String((count ?? 0) + 1).padStart(3, '0')
    return `BATCH-${year}-${next}`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const batchNumber = await generateBatchNumber()
      const { error: err } = await supabase.from('batches').insert({
        batch_number: batchNumber,
        delivery_id: form.delivery_id || null,
        maize_input_kg: parseFloat(form.maize_input_kg),
        flour_produced_kg: parseFloat(form.flour_produced_kg),
        byproduct_kg: parseFloat(form.byproduct_kg) || 0,
        other_loss_kg: parseFloat(form.other_loss_kg) || 0,
        notes: form.notes,
      })
      if (err) throw err
      setShowForm(false)
      setForm({ delivery_id: '', maize_input_kg: '', flour_produced_kg: '', byproduct_kg: '', other_loss_kg: '', notes: '' })
      fetchAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const yieldPercent = form.maize_input_kg && form.flour_produced_kg
    ? ((parseFloat(form.flour_produced_kg) / parseFloat(form.maize_input_kg)) * 100).toFixed(1)
    : null

  const totalFlour = batches.reduce((s, b) => s + parseFloat(b.flour_produced_kg), 0)
  const totalMaize = batches.reduce((s, b) => s + parseFloat(b.maize_input_kg), 0)
  const avgYield = totalMaize > 0 ? ((totalFlour / totalMaize) * 100).toFixed(1) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production</h1>
          <p className="text-gray-500 text-sm mt-1">Track batches, flour yield and processing output.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
        >
          <Plus size={18} /> New Batch
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-50 rounded-2xl p-4">
          <p className="text-xs font-medium text-yellow-700 mb-1">Total Batches</p>
          <p className="text-2xl font-bold text-yellow-800">{batches.length}</p>
        </div>
        <div className="bg-orange-50 rounded-2xl p-4">
          <p className="text-xs font-medium text-orange-700 mb-1">Maize Processed</p>
          <p className="text-2xl font-bold text-orange-800">{totalMaize.toLocaleString()} kg</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4">
          <p className="text-xs font-medium text-green-700 mb-1">Flour Produced</p>
          <p className="text-2xl font-bold text-green-800">{totalFlour.toLocaleString()} kg</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4">
          <p className="text-xs font-medium text-blue-700 mb-1">Average Yield</p>
          <p className="text-2xl font-bold text-blue-800">{avgYield}%</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Factory size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No batches recorded yet. Click <strong>New Batch</strong> to start.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Batch #', 'Delivery Ref', 'Supplier', 'Maize Input', 'Flour Out', 'By-product', 'Loss', 'Yield', 'Date'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {batches.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-mono font-semibold text-green-700">{b.batch_number}</td>
                    <td className="px-4 py-3 font-mono text-gray-500 text-xs">{b.maize_deliveries?.batch_number ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{b.maize_deliveries?.suppliers?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{Number(b.maize_input_kg).toLocaleString()} kg</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{Number(b.flour_produced_kg).toLocaleString()} kg</td>
                    <td className="px-4 py-3 text-gray-500">{Number(b.byproduct_kg).toLocaleString()} kg</td>
                    <td className="px-4 py-3 text-gray-500">{Number(b.other_loss_kg).toLocaleString()} kg</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        b.yield_percent >= 65 ? 'bg-green-100 text-green-700' :
                        b.yield_percent >= 55 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {b.yield_percent}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(b.produced_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Record New Batch</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Link to delivery */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link to Maize Delivery (optional)</label>
                <select
                  value={form.delivery_id}
                  onChange={e => {
                    const d = deliveries.find(d => d.id === e.target.value)
                    setForm({
                      ...form,
                      delivery_id: e.target.value,
                      maize_input_kg: d ? String(d.tonnes * 1000) : form.maize_input_kg,
                    })
                  }}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">— Select delivery —</option>
                  {deliveries.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.batch_number} — {d.suppliers?.name} ({d.tonnes}t)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maize Input (kg)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.maize_input_kg}
                    onChange={e => setForm({ ...form, maize_input_kg: e.target.value })}
                    required placeholder="e.g. 10000"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Flour Produced (kg)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.flour_produced_kg}
                    onChange={e => setForm({ ...form, flour_produced_kg: e.target.value })}
                    required placeholder="e.g. 6000"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">By-product (kg)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.byproduct_kg}
                    onChange={e => setForm({ ...form, byproduct_kg: e.target.value })}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other Loss (kg)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.other_loss_kg}
                    onChange={e => setForm({ ...form, other_loss_kg: e.target.value })}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Live yield preview */}
              {yieldPercent && (
                <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${
                  yieldPercent >= 65 ? 'bg-green-50' : yieldPercent >= 55 ? 'bg-yellow-50' : 'bg-red-50'
                }`}>
                  <span className="text-sm font-medium text-gray-700">Flour Yield</span>
                  <span className={`text-xl font-bold ${
                    yieldPercent >= 65 ? 'text-green-700' : yieldPercent >= 55 ? 'text-yellow-700' : 'text-red-700'
                  }`}>{yieldPercent}%</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Any additional notes..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Record Batch'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
