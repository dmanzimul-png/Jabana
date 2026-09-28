import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, X, Wheat } from 'lucide-react'

const statusColors = {
  paid: 'bg-green-100 text-green-700',
  partially_paid: 'bg-yellow-100 text-yellow-700',
  unpaid: 'bg-red-100 text-red-700',
}

const statusLabels = {
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  unpaid: 'Unpaid',
}

function formatRWF(amount) {
  return 'RWF ' + Number(amount).toLocaleString()
}

export default function MaizeReceiving() {
  const [deliveries, setDeliveries] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    supplier_id: '',
    new_supplier: '',
    tonnes: '',
    price_per_tonne: '',
    payment_status: 'unpaid',
    amount_paid: '',
    notes: '',
  })

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: d }, { data: s }] = await Promise.all([
      supabase.from('maize_deliveries').select('*, suppliers(name)').order('received_at', { ascending: false }),
      supabase.from('suppliers').select('*').order('name'),
    ])
    setDeliveries(d ?? [])
    setSuppliers(s ?? [])
    setLoading(false)
  }

  async function generateBatchNumber() {
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('maize_deliveries')
      .select('*', { count: 'exact', head: true })
    const next = String((count ?? 0) + 1).padStart(3, '0')
    return `MAZ-${year}-${next}`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      let supplierId = form.supplier_id

      if (!supplierId && form.new_supplier.trim()) {
        const { data: newSupplier, error: sErr } = await supabase
          .from('suppliers')
          .insert({ name: form.new_supplier.trim() })
          .select()
          .single()
        if (sErr) throw sErr
        supplierId = newSupplier.id
      }

      if (!supplierId) throw new Error('Please select or enter a supplier.')

      const batchNumber = await generateBatchNumber()

      const { error: dErr } = await supabase.from('maize_deliveries').insert({
        batch_number: batchNumber,
        supplier_id: supplierId,
        tonnes: parseFloat(form.tonnes),
        price_per_tonne: parseFloat(form.price_per_tonne),
        payment_status: form.payment_status,
        amount_paid: parseFloat(form.amount_paid) || 0,
        notes: form.notes,
      })

      if (dErr) throw dErr

      setShowForm(false)
      setForm({ supplier_id: '', new_supplier: '', tonnes: '', price_per_tonne: '', payment_status: 'unpaid', amount_paid: '', notes: '' })
      fetchAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const total = parseFloat(form.tonnes) * parseFloat(form.price_per_tonne) || 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maize Receiving</h1>
          <p className="text-gray-500 text-sm mt-1">Record incoming maize deliveries from suppliers.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
        >
          <Plus size={18} /> New Delivery
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 rounded-2xl p-4">
          <p className="text-xs font-medium text-yellow-700 mb-1">Total Deliveries</p>
          <p className="text-2xl font-bold text-yellow-800">{deliveries.length}</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4">
          <p className="text-xs font-medium text-green-700 mb-1">Total Maize Received</p>
          <p className="text-2xl font-bold text-green-800">
            {deliveries.reduce((s, d) => s + parseFloat(d.tonnes), 0).toLocaleString()} t
          </p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 col-span-2 lg:col-span-1">
          <p className="text-xs font-medium text-red-700 mb-1">Outstanding Payments</p>
          <p className="text-2xl font-bold text-red-800">
            {formatRWF(deliveries.filter(d => d.payment_status !== 'paid').reduce((s, d) => s + (d.total_amount - d.amount_paid), 0))}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Wheat size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No deliveries recorded yet. Click <strong>New Delivery</strong> to start.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Batch #', 'Supplier', 'Tonnes', 'Price/Tonne', 'Total', 'Paid', 'Status', 'Date'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {deliveries.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-mono font-semibold text-green-700">{d.batch_number}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{d.suppliers?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{d.tonnes} t</td>
                    <td className="px-4 py-3 text-gray-700">{formatRWF(d.price_per_tonne)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatRWF(d.total_amount)}</td>
                    <td className="px-4 py-3 text-gray-700">{formatRWF(d.amount_paid)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[d.payment_status]}`}>
                        {statusLabels[d.payment_status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(d.received_at).toLocaleDateString()}</td>
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
              <h2 className="text-lg font-bold text-gray-900">Record New Delivery</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Supplier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select
                  value={form.supplier_id}
                  onChange={e => setForm({ ...form, supplier_id: e.target.value, new_supplier: '' })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">— Select existing supplier —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {!form.supplier_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Or add new supplier</label>
                  <input
                    type="text"
                    value={form.new_supplier}
                    onChange={e => setForm({ ...form, new_supplier: e.target.value })}
                    placeholder="Supplier name"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              )}

              {/* Tonnes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tonnes Received</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.tonnes}
                    onChange={e => setForm({ ...form, tonnes: e.target.value })}
                    required
                    placeholder="e.g. 12.4"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price per Tonne (RWF)</label>
                  <input
                    type="number" step="1" min="0"
                    value={form.price_per_tonne}
                    onChange={e => setForm({ ...form, price_per_tonne: e.target.value })}
                    required
                    placeholder="e.g. 420000"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Auto total */}
              {total > 0 && (
                <div className="bg-green-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-green-700 font-medium">Total Amount</span>
                  <span className="text-lg font-bold text-green-800">{formatRWF(total)}</span>
                </div>
              )}

              {/* Payment */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                  <select
                    value={form.payment_status}
                    onChange={e => setForm({ ...form, payment_status: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (RWF)</label>
                  <input
                    type="number" step="1" min="0"
                    value={form.amount_paid}
                    onChange={e => setForm({ ...form, amount_paid: e.target.value })}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Notes */}
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
                {saving ? 'Saving...' : 'Record Delivery'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
