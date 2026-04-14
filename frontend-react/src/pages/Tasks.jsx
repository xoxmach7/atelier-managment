import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const Tasks = () => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadTasks()
  }, [filter])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const { data } = await api.get(`/tasks${params}`)
      setTasks(data.data || [])
    } catch (error) {
      console.error('Ошибка загрузки задач:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (status) => {
    const map = {
      'lead': { label: 'Новый лид', color: '#3498db' },
      'measurement_scheduled': { label: 'Замер назначен', color: '#9b59b6' },
      'measurement_done': { label: 'Замер выполнен', color: '#8e44ad' },
      'quote_preparing': { label: 'Готовится КП', color: '#f39c12' },
      'quote_sent': { label: 'КП отправлено', color: '#e67e22' },
      'negotiation': { label: 'Переговоры', color: '#d35400' },
      'converted_to_order': { label: 'В заказе', color: '#16c79a' },
      'lost': { label: 'Проигран', color: '#95a5a6' },
      'postponed': { label: 'Отложен', color: '#7f8c8d' },
    }
    return map[status] || { label: status, color: '#95a5a6' }
  }

  const filters = [
    { value: 'all', label: 'Все' },
    { value: 'lead', label: 'Лиды' },
    { value: 'measurement_done', label: 'Замеры' },
    { value: 'quote_sent', label: 'КП' },
    { value: 'converted_to_order', label: 'В заказе' },
  ]

  return (
    <div className="container animate-fade-in">
      {/* Шапка */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <h1>📝 Задачи и Лиды</h1>
          <p className="text-muted">Управление клиентами от первого контакта до заказа</p>
        </div>
        <Link to="/tasks/new" className="btn btn-primary">
          ➕ Новая задача
        </Link>
      </div>

      {/* Фильтры */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className="btn"
            style={{
              padding: '8px 16px',
              fontSize: '0.9rem',
              background: filter === f.value ? 'var(--primary)' : 'var(--surface)',
              color: filter === f.value ? 'white' : 'var(--text)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Список задач */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>⏳ Загрузка задач...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📝</div>
          <h3>Нет задач</h3>
          <p className="text-muted" style={{ marginBottom: '24px' }}>
            Создайте первую задачу, чтобы начать работу с клиентом
          </p>
          <Link to="/tasks/new" className="btn btn-primary">
            Создать задачу
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {tasks.map(task => {
            const status = getStatusInfo(task.status)
            return (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                className="card"
                style={{
                  textDecoration: 'none',
                  color: 'var(--text)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateX(8px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
              >
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px',
                  }}>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: 'var(--primary)',
                    }}>
                      {task.task_number}
                    </span>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      background: status.color + '20',
                      color: status.color,
                    }}>
                      {status.label}
                    </span>
                    {task.priority >= 4 && (
                      <span style={{ fontSize: '0.8rem' }}>🔥 Срочно</span>
                    )}
                  </div>
                  
                  <h3 style={{ marginBottom: '4px' }}>{task.client_name || 'Клиент не указан'}</h3>
                  <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                    📞 {task.client_phone || 'Телефон не указан'}
                  </p>
                  
                  {task.description && (
                    <p style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      marginTop: '8px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {task.description}
                    </p>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                    {new Date(task.created_at).toLocaleDateString('ru-RU')}
                  </div>
                  {task.designer_name && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      👤 {task.designer_name}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Tasks
