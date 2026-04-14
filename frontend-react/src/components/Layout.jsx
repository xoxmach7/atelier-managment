import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

const Layout = () => {
  const { user, logout, hasRole } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { path: '/', label: '📊 Дашборд', roles: ['admin', 'manager', 'designer'] },
    { path: '/tasks', label: '📝 Задачи', roles: ['admin', 'manager', 'designer'] },
    { path: '/quotes', label: '💰 Сметы', roles: ['admin', 'manager', 'designer'] },
    { path: '/orders', label: '📦 Заказы', roles: ['admin', 'manager'] },
    { path: '/fabrics', label: '🧵 Склад', roles: ['admin', 'manager', 'designer', 'warehouse'] },
    { path: '/production', label: '🏭 Производство', roles: ['admin', 'manager', 'seamstress'] },
  ]

  const filteredNav = navItems.filter(item => 
    item.roles.includes(user?.role) || user?.role === 'admin'
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        background: 'var(--surface)',
        borderRight: '1px solid var(--secondary)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto',
      }}>
        {/* Логотип */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '2px solid var(--primary)',
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            color: 'var(--primary)',
            margin: 0,
          }}>
            🧵 Бригада
          </h1>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginTop: '4px',
          }}>
            Ателье управление
          </p>
        </div>

        {/* Навигация */}
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {filteredNav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                marginBottom: '8px',
                borderRadius: '10px',
                color: isActive ? 'var(--primary)' : 'var(--text)',
                background: isActive ? 'rgba(233, 69, 96, 0.1)' : 'transparent',
                textDecoration: 'none',
                fontWeight: isActive ? '600' : '400',
                transition: 'all 0.2s',
              })}
            >
              <span style={{ fontSize: '1.2rem', marginRight: '12px' }}>
                {item.label.split(' ')[0]}
              </span>
              {item.label.split(' ').slice(1).join(' ')}
            </NavLink>
          ))}
        </nav>

        {/* Профиль и выход */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid var(--secondary)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
            padding: '12px',
            background: 'var(--background)',
            borderRadius: '10px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
            }}>
              👤
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: '600',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {user?.full_name || 'Пользователь'}
              </div>
              <div style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                textTransform: 'capitalize',
              }}>
                {user?.role}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px',
              background: 'transparent',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            🚪 Выход
          </button>
        </div>
      </aside>

      {/* Основной контент */}
      <main style={{
        flex: 1,
        marginLeft: '260px',
        minHeight: '100vh',
      }}>
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
