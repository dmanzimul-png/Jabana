import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Wheat, Factory, ShoppingCart,
  Package, Truck, Receipt, Users, BarChart3, LogOut, Menu, X
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'owner', 'manager'] },
  { to: '/maize', label: 'Maize Receiving', icon: Wheat, roles: ['admin', 'manager', 'worker'] },
  { to: '/production', label: 'Production', icon: Factory, roles: ['admin', 'manager', 'worker'] },
  { to: '/inventory', label: 'Inventory', icon: Package, roles: ['admin', 'manager'] },
  { to: '/sales', label: 'Sales', icon: ShoppingCart, roles: ['admin', 'manager', 'worker'] },
  { to: '/suppliers', label: 'Suppliers', icon: Truck, roles: ['admin', 'manager'] },
  { to: '/expenses', label: 'Expenses', icon: Receipt, roles: ['admin', 'manager'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'owner'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['admin'] },
]

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const role = profile?.role ?? 'worker'
  const visibleNav = navItems.filter(item => item.roles.includes(role))

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const NavItems = ({ onClick }) => (
    <>
      {visibleNav.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
              isActive
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
            }`
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 p-4 fixed h-full">
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">J</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Jabana Flour Mill</p>
            <p className="text-xs text-gray-400 capitalize">{role}</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <NavItems />
        </nav>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 w-72 bg-white h-full p-4 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3 px-2">
                <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">J</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Jabana Flour Mill</p>
                  <p className="text-xs text-gray-400 capitalize">{role}</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <nav className="flex flex-col gap-1 flex-1">
              <NavItems onClick={() => setSidebarOpen(false)} />
            </nav>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile Top Bar */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
            <Menu size={22} />
          </button>
          <p className="font-bold text-gray-900 text-sm">Jabana Flour Mill</p>
          <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-700 font-semibold text-sm capitalize">{profile?.full_name?.[0] ?? 'U'}</span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
