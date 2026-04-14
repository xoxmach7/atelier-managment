import { useAuthStore } from '../stores/authStore'

const Profile = () => {
  const { user, logout } = useAuthStore()

  return (
    <div className="container">
      <h1>👤 Профиль</h1>
      
      <div className="card" style={{ maxWidth: '500px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          marginBottom: '24px',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
          }}>
            👤
          </div>
          <div>
            <h2 style={{ marginBottom: '4px' }}>{user?.full_name}</h2>
            <p className="text-muted" style={{ textTransform: 'capitalize' }}>
              {user?.role}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label className="text-muted" style={{ fontSize: '0.85rem' }}>Email</label>
            <p>{user?.email}</p>
          </div>
          <div>
            <label className="text-muted" style={{ fontSize: '0.85rem' }}>Телефон</label>
            <p>{user?.phone || 'Не указан'}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="btn btn-danger"
          style={{ marginTop: '24px', width: '100%' }}
        >
          🚪 Выйти из системы
        </button>
      </div>
    </div>
  )
}

export default Profile
