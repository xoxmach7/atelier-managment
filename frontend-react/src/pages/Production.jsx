import { useEffect, useState } from 'react'
import api from '../services/api'
import { useAuthStore } from '../stores/authStore'

const Production = () => {
  const [assignments, setAssignments] = useState([])
  const [orders, setOrders] = useState([])
  const [seamstresses, setSeamstresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [assignData, setAssignData] = useState({
    order_id: '',
    assigned_to: '',
    deadline: '',
    priority: 2,
    complexity: 'medium',
  })
  const { user } = useAuthStore()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [assignRes, ordersRes] = await Promise.all([
        api.get('/production'),
        api.get('/orders?status=processing'),
      ])
      setAssignments(assignRes.data.data || [])
      setOrders(ordersRes.data.data || [])
      
      // Получаем список швей (в реальности нужен отдельный endpoint)
      // setSeamstresses([...])
    } catch (error) {
      console.error('Ошибка загрузки:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    try {
      await api.post('/production', assignData)
      alert('✅ Заказ назначен в производство')
      setShowAssignForm(false)
      loadData()
    } catch (error) {
      alert(error.response?.data?.error?.message || 'Ошибка назначения')
    }
  }

  const updateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/production/${id}/status`, { status: newStatus })
      loadData()
    } catch (error) {
      alert('Ошибка обновления статуса')
    }
  }

  const getStatusInfo = (status) => {
    const map = {
      'queued': { text: 'В очереди', color: '#7f8c8d' },
      'assigned': { text: 'Назначено', color: '#3498db' },
      'cutting': { text: 'Раскрой', color: '#9b59b6' },
      'sewing': { text: 'Пошив', color: '#f39c12' },
      'quality_check': { text: 'Проверка', color: '#e67e22' },
      'ready': { text: 'Готово', color: '#16c79a' },
      'returned': { text: 'На доработке', color: '#e94560' },
    }
    return map[status] || { text: status, color: '#7f8c8d' }
  }

  const canAssign = user?.role === 'admin' || user?.role === 'manager'
  const isSeamstress = user?.role === 'seamstress'

  return (
    <div className="container animate-fade-in">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <h1>🏭 Производство</h1>
          <p className="text-muted">Заказы в цеху и назначения швей</p>
        </div>
        {canAssign && (
          <button 
            onClick={() => setShowAssignForm(!showAssignForm)}
            className="btn btn-primary"
          >
            ➕ {showAssignForm ? 'Отмена' : 'Назначить заказ'}
          </button>
        )}
      </div>

      {/* Форма назначения */}
      {showAssignForm && canAssign && (
        <div className="card mb-3" style={{ borderLeftColor: 'var(--primary)' }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>
            🎯 Назначить в производство
          </h3>
          <form onSubmit={handleAssign}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}>
              <div>
                <label>Заказ *</label>
                <select
                  value={assignData.order_id}
                  onChange={(e) => setAssignData({...assignData, order_id: e.target.value})}
                  required
                >
                  <option value="">Выберите заказ</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} - {o.customer_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Швея *</label>
                <select
                  value={assignData.assigned_to}
                  onChange={(e) => setAssignData({...assignData, assigned_to: e.target.value})}
                  required
                >
                  <option value="">Выберите швею</option>
                  <option value="1">Мария Иванова</option>
                  <option value="2">Анна Петрова</option>
                  <option value="3">Елена Сидорова</option>
                </select>
              </div>
              <div>
                <label>Дедлайн *</label>
                <input
                  type="date"
                  value={assignData.deadline}
                  onChange={(e) => setAssignData({...assignData, deadline: e.target.value})}
                  required
                />
              </div>
              <div>
                <label>Приоритет</label>
                <select
                  value={assignData.priority}
                  onChange={(e) => setAssignData({...assignData, priority: Number(e.target.value)})}
                >
                  <option value={1}>🟢 Низкий</option>
                  <option value={2}>🔵 Обычный</option>
                  <option value={3}>🟡 Высокий</option>
                  <option value={4}>🔴 Срочный</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-success">
              ✅ Назначить
            </button>
          </form>
        </div>
      )}

      {/* Список назначений */}
      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>📋 Заказы в производстве</h3>
        
        {loading ? (
          <p>Загрузка...</p>
        ) : assignments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p className="text-muted">Нет заказов в производстве</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {assignments.map(item => {
              const status = getStatusInfo(item.status)
              return (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    borderLeftColor: status.color,
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '12px',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                          Заказ #{item.order_id}
                        </span>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          background: status.color + '20',
                          color: status.color,
                        }}>
                          {status.text}
                        </span>
                        {item.priority >= 3 && (
                          <span style={{ fontSize: '0.8rem' }}>🔥</span>
                        )}
                      </div>
                      <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                        👤 Швея: {item.seamstress_name || 'Не назначена'}<br/>
                        📅 Дедлайн: {item.deadline ? new Date(item.deadline).toLocaleDateString('ru-RU') : 'Не указан'}
                      </p>
                    </div>
                    
                    {/* Кнопки смены статуса (для швеи) */}
                    {isSeamstress && item.assigned_to === user?.id && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {item.status === 'assigned' && (
                          <button 
                            onClick={() => updateStatus(item.id, 'cutting')}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                          >
                            ✂️ Начать раскрой
                          </button>
                        )}
                        {item.status === 'cutting' && (
                          <button 
                            onClick={() => updateStatus(item.id, 'sewing')}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                          >
                            🧵 Начать пошив
                          </button>
                        )}
                        {item.status === 'sewing' && (
                          <button 
                            onClick={() => updateStatus(item.id, 'quality_check')}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                          >
                            🔍 На проверку
                          </button>
                        )}
                        {item.status === 'quality_check' && (
                          <button 
                            onClick={() => updateStatus(item.id, 'ready')}
                            className="btn btn-success"
                            style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                          >
                            ✅ Готово
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Прогресс */}
                  <div style={{
                    height: '6px',
                    background: 'var(--background)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: getProgressPercent(item.status),
                      background: status.color,
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Прогресс по статусам
const getProgressPercent = (status) => {
  const progress = {
    'queued': '10%',
    'assigned': '20%',
    'cutting': '40%',
    'sewing': '60%',
    'quality_check': '80%',
    'ready': '100%',
    'returned': '50%',
  }
  return progress[status] || '0%'
}

export default Production
