import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import DeleteConfirm from '../../components/DeleteConfirm'
import { Plus, X, Truck, Trash2 } from 'lucide-react'

function formatRWF(amount) {
  return 'RWF ' + Number(amount).toLocaleString()
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const [form, setForm] = useState({ name: '', phone: '', location: '' })

  useEffect(() => { fetchSuppliers() }, [])

  async function fetchSuppliers() {
    setLoading(true)
    const { data: suppliersData } = await supabase
      .from('suppliers')
      .select('*, maize_deliveries(id, tonnes, total_amount, amount_paid, payment_status)')
      .order('name')
    setSuppliers(suppliersData ?? [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const { error: err } = await supabase.from('suppliers').insert({
        name: form.name,
        phone: form.phone,
        location: form.location,
      })
      if (err) throw err
      setShowForm(false)
      setForm({ name: '', phone: '', location: '' })
      fetchSuppliers()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    await supabase.from('suppliers').delete().eq('id', deleteId)
    setDeleteId(null)
    fetchSuppliers()
  }

  return (
    <div>
      {deleteId && <DeleteConfirm onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-500 text-sm mt-1">Manage maize suppliers and their payment history.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
        >
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      {/* Supplier Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16 text-gray-400">
          <Truck size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No suppliers yet. Click <strong>Add Supplier</strong> to start.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {suppliers.map(s => {
            const deliveries = s.maize_deliveries ?? []
            const totalTonnes = deliveries.reduce((sum, d) => sum + parseFloat(d.tonnes), 0)
            const totalAmount = deliveries.reduce((sum, d) => sum + parseFloat(d.total_amount ?? 0), 0)
            const totalPaid = deliveries.reduce((sum, d) => sum + parseFloat(d.amount_paid ?? 0), 0)
            const outstanding = totalAmount - totalPaid
            const hasUnpaid = deliveries.some(d => d.payment_status !== 'paid')

            return (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{s.name}</h3>
                    <div className="flex flex-col gap-0.5 mt-1">
                      {s.phone && <p className="text-sm text-gray-500">📞 {s.phone}</p>}
                      {s.location && <p className="text-sm text-gray-500">📍 {s.location}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasUnpaid && <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">Owes Payment</span>}
                    <button onClick={() => setDeleteId(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition"><Trash2 size={15} /></button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-yellow-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-yellow-700 font-medium mb-1">Deliveries</p>
                    <p className="text-xl font-bold text-yellow-800">{deliveries.length}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-green-700 font-medium mb-1">Total Tonnes</p>
                    <p className="text-xl font-bold text-green-800">{totalTonnes.toLocaleString()}t</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center ${outstanding > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <p className={`text-xs font-medium mb-1 ${outstanding > 0 ? 'text-red-700' : 'text-gray-600'}`}>Outstanding</p>
                    <p className={`text-sm font-bold ${outstanding > 0 ? 'text-red-800' : 'text-gray-700'}`}>
                      {outstanding > 0 ? formatRWF(outstanding) : 'Settled'}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add Supplier</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required placeholder="e.g. ABC Maize Suppliers"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. +250 7XX XXX XXX"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Musanze"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add Supplier'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
