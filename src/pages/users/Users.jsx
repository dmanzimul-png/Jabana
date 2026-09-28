import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, X, Users } from 'lucide-react'

const roles = [
  { value: 'admin', label: 'Admin', desc: 'Full access to everything' },
  { value: 'owner', label: 'Owner', desc: 'Full visibility, can approve transactions' },
  { value: 'manager', label: 'Manager', desc: 'Inventory, production, sales, warehouse' },
  { value: 'worker', label: 'Worker', desc: 'Limited to assigned operations' },
]

const roleColors = {
  admin: 'bg-purple-100 text-purple-700',
  owner: 'bg-blue-100 text-blue-700',
  manager: 'bg-green-100 text-green-700',
  worker: 'bg-gray-100 text-gray-700',
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'worker' })

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setUsers(data ?? [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      // Create auth user via Supabase Admin (using service role is ideal, but here we use signUp)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.full_name, role: form.role } }
      })
      if (signUpError) throw signUpError

      // Upsert profile manually in case trigger doesn't fire
      if (data?.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: form.full_name,
          role: form.role,
        })
      }

      setSuccess(`${form.full_name} has been added successfully.`)
      setShowForm(false)
      setForm({ full_name: '', email: '', password: '', role: 'worker' })
      fetchUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function updateRole(userId, newRole) {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    fetchUsers()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage team members and their access roles.</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setSuccess('') }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
        >
          <Plus size={18} /> Add User
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-4">
          ✅ {success}
        </div>
      )}

      {/* Role legend */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {roles.map(r => (
          <div key={r.value} className="bg-white rounded-xl border border-gray-100 p-3">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleColors[r.value]}`}>{r.label}</span>
            <p className="text-xs text-gray-400 mt-1">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Users list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No users yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-700 font-bold text-sm">{u.full_name?.[0]?.toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{u.full_name}</p>
                    <p className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <select
                  value={u.role}
                  onChange={e => updateRole(u.id, e.target.value)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 ${roleColors[u.role]}`}
                >
                  {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add New User</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  required placeholder="e.g. Jean Pierre"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required placeholder="user@example.com"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required placeholder="Min 6 characters"
                  minLength={6}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {roles.map(r => (
                    <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                  ))}
                </select>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
              >
                {saving ? 'Creating user...' : 'Add User'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
