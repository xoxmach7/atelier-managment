import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

const Login = () => {
  const [email, setEmail] = useState('admin@brigada.com')
  const [password, setPassword] = useState('admin123')
  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    
    const result = await login(email, password)
    if (result.success) {
      navigate('/')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--background)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'var(--surface)',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      }}>
        {/* Логотип */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'var(--primary)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            margin: '0 auto 20px',
          }}>
            🧵
          </div>
          <h1 style={{
            fontSize: '1.8rem',
            color: 'var(--primary)',
            marginBottom: '8px',
          }}>
            Бригада
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Система управления ателье
          </p>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: 'rgba(233, 69, 96, 0.1)',
              color: 'var(--danger)',
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '0.95rem',
            }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@brigada.com"
              required
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
            }}>
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              required
              style={{ width: '100%' }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px' }}
          >
            {isLoading ? (
              <>
                <span className="spinner">⏳</span> Вход...
              </>
            ) : (
              '🔐 Войти'
            )}
          </button>
        </form>

        {/* Подсказка */}
        <div style={{
          marginTop: '30px',
          padding: '16px',
          background: 'var(--background)',
          borderRadius: '10px',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
        }}>
          <strong style={{ color: 'var(--text)' }}>Демо доступ:</strong>
          <br />
          Email: admin@brigada.com
          <br />
          Пароль: admin123
        </div>
      </div>
    </div>
  )
}

export default Login
