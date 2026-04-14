import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuthStore } from '../stores/authStore'

const Dashboard = () => {
  const [stats, setStats] = useState({
    tasks: 0,
    quotes: 0,
    orders: 0,
    production: 0,
  })
  const [recentTasks, setRecentTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      // Загружаем статистику
      const [tasksRes, quotesRes, ordersRes] = await Promise.all([
        api.get('/tasks?limit=1'),
        api.get('/quotes?limit=1'),
        api.get('/orders?limit=1'),
      ])

      setStats({
        tasks: tasksRes.data.count || 0,
        quotes: quotesRes.data.count || 0,
        orders: ordersRes.data.count || 0,
        production: 0,
      })

      // Последние задачи
      const recentRes = await api.get('/tasks?limit=5')
      setRecentTasks(recentRes.data.data || [])
    } catch (error) {
      console.error('Ошибка загрузки дашборда:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      'lead': { class: 'badge-new', text: 'Новый лид' },
      'measurement_done': { class: 'badge-measurement', text: 'Замер' },
      'quote_sent': { class: 'badge-design', text: 'КП отправлено' },
      'sewing': { class: 'badge-sewing', text: 'В пошиве' },
      'ready': { class: 'badge-ready', text: 'Готово' },
    }
    const info = statusMap[status] || { class: '', text: status }
    return <span className={`badge ${info.class}`}>{info.text}</span>
  }

  return (
    <div className="container animate-fade-in">
      {/* Приветствие */}
      <div className="mb-3">
        <h1>Привет, {user?.full_name?.split(' ')[0] || 'Дизайнер'}! 👋</h1>
        <p className="text-muted">Вот что происходит в ателье сегодня</p>
      </div>

      {/* Статистика */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '30px',
      }}>
        <StatCard 
          icon="📝" 
          title="Активные задачи" 
          value={stats.tasks} 
          color="#3498db"
          link="/tasks"
        />
        <StatCard 
          icon="💰" 
          title="Сметы на согласовании" 
          value={stats.quotes} 
          color="#f39c12"
          link="/quotes"
        />
        <StatCard 
          icon="📦" 
          title="Заказы в работе" 
          value={stats.orders} 
          color="#16c79a"
          link="/orders"
        />
        <StatCard 
          icon="🏭" 
          title="В производстве" 
          value={stats.production} 
          color="#9b59b6"
          link="/production"
        />
      </div>

      {/* Быстрые действия */}
      <div className="card mb-3">
        <h3 style={{ marginBottom: '20px' }}>⚡ Быстрые действия</h3>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <Link to="/tasks/new" className="btn btn-primary">
            ➕ Новая задача
          </Link>
          <Link to="/fabrics" className="btn btn-secondary">
            📱 Сканировать ткань
          </Link>
          <Link to="/quotes" className="btn btn-secondary">
            📊 Создать смету
          </Link>
        </div>
      </div>

      {/* Последние задачи */}
      <div className="card">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
          <h3>📝 Последние задачи</h3>
          <Link to="/tasks" className="text-muted" style={{ fontSize: '0.9rem' }}>
            Все задачи →
          </Link>
        </div>

        {loading ? (
          <p className="text-muted">Загрузка...</p>
        ) : recentTasks.length === 0 ? (
          <p className="text-muted">Нет активных задач. Создайте первую!</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {recentTasks.map(task => (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  background: 'var(--background)',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  color: 'var(--text)',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateX(5px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
              >
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {task.task_number || `Задача #${task.id}`}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                    {task.client_name || 'Клиент не указан'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {getStatusBadge(task.status)}
                  <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                    {new Date(task.created_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Компонент карточки статистики
const StatCard = ({ icon, title, value, color, link }) => (
  <Link
    to={link}
    style={{
      background: 'var(--surface)',
      borderRadius: '15px',
      padding: '24px',
      textDecoration: 'none',
      color: 'var(--text)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      borderLeft: `4px solid ${color}`,
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-3px)'
      e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = 'none'
    }}
  >
    <div style={{
      width: '56px',
      height: '56px',
      borderRadius: '12px',
      background: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.8rem',
    }}>
      {icon}
    </div>
    <div>
      <div style={{
        fontSize: '2rem',
        fontWeight: '700',
        color: color,
      }}>
        {value}
      </div>
      <div className="text-muted" style={{ fontSize: '0.9rem' }}>
        {title}
      </div>
    </div>
  </Link>
)

export default Dashboard
