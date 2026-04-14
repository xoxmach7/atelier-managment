import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const CreateTask = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    client_name: '',
    client_phone: '',
    client_address: '',
    source: 'walk_in',
    description: '',
    client_wishes: '',
    preferred_date: '',
    priority: 2,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      const { data } = await api.post('/tasks', form)
      
      if (data.success) {
        alert(`✅ Задача создана: ${data.data.task_number}`)
        navigate(`/tasks/${data.data.id}`)
      }
    } catch (error) {
      alert(error.response?.data?.error?.message || 'Ошибка создания задачи')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="container animate-fade-in">
      <div className="mb-3">
        <h1>📝 Новая задача</h1>
        <p className="text-muted">Создайте задачу для нового клиента</p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: '600px' }}>
        {/* Клиент */}
        <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>👤 Информация о клиенте</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <label>Имя клиента *</label>
          <input
            type="text"
            name="client_name"
            value={form.client_name}
            onChange={handleChange}
            placeholder="Иванов Алексей"
            required
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>Телефон *</label>
          <input
            type="tel"
            name="client_phone"
            value={form.client_phone}
            onChange={handleChange}
            placeholder="+7 (999) 123-45-67"
            required
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>Адрес (для замера/установки)</label>
          <input
            type="text"
            name="client_address"
            value={form.client_address}
            onChange={handleChange}
            placeholder="г. Москва, ул. Ленина 1, кв. 10"
          />
        </div>

        {/* Источник */}
        <div style={{ marginBottom: '20px' }}>
          <label>Источник</label>
          <select name="source" value={form.source} onChange={handleChange}>
            <option value="walk_in">🚶 Пришёл в шоурум</option>
            <option value="instagram">📸 Instagram</option>
            <option value="whatsapp">💬 WhatsApp</option>
            <option value="phone_call">📞 Телефонный звонок</option>
            <option value="referral">👥 Рекомендация</option>
            <option value="website">🌐 Сайт</option>
          </select>
        </div>

        {/* Детали */}
        <h3 style={{ marginBottom: '20px', marginTop: '30px', color: 'var(--primary)' }}>
          📋 Детали задачи
        </h3>

        <div style={{ marginBottom: '20px' }}>
          <label>Что нужно клиенту?</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Шторы в гостиную, тюль в спальню..."
            rows={3}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>Пожелания клиента</label>
          <textarea
            name="client_wishes"
            value={form.client_wishes}
            onChange={handleChange}
            placeholder="Цвет, стиль, бюджет..."
            rows={2}
          />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '20px',
        }}>
          <div>
            <label>Желаемая дата</label>
            <input
              type="date"
              name="preferred_date"
              value={form.preferred_date}
              onChange={handleChange}
            />
          </div>
          <div>
            <label>Приоритет</label>
            <select name="priority" value={form.priority} onChange={handleChange}>
              <option value={1}>🟢 Низкий</option>
              <option value={2}>🔵 Обычный</option>
              <option value={3}>🟡 Высокий</option>
              <option value={4}>🔴 Срочный</option>
              <option value={5}>🔥 Критичный</option>
            </select>
          </div>
        </div>

        {/* Кнопки */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '30px',
        }}>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            {loading ? '⏳ Создание...' : '✅ Создать задачу'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="btn btn-secondary"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateTask
