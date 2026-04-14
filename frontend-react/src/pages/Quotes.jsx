import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const Quotes = () => {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCalculator, setShowCalculator] = useState(false)

  // Данные для калькулятора
  const [calcData, setCalcData] = useState({
    window_width_cm: 300,
    window_height_cm: 250,
    fabric_id: '',
    sewing_type: 'шторы',
    folds_count: 2,
    city: 'Алматы',
    installation: true,
    delivery: true,
    complexity: 'medium',
  })
  const [fabrics, setFabrics] = useState([])
  const [calcResult, setCalcResult] = useState(null)

  useEffect(() => {
    loadQuotes()
    loadFabrics()
  }, [])

  const loadQuotes = async () => {
    try {
      const { data } = await api.get('/quotes')
      setQuotes(data.data || [])
    } catch (error) {
      console.error('Ошибка загрузки смет:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFabrics = async () => {
    try {
      const { data } = await api.get('/fabrics')
      setFabrics(data.data || [])
    } catch (error) {
      console.error('Ошибка загрузки тканей:', error)
    }
  }

  // Калькулятор материалов
  const calculate = async () => {
    try {
      console.log('Отправляю:', calcData)
      const { data } = await api.post('/quotes/calculate', {
        ...calcData,
        fabric_id: calcData.fabric_id ? parseInt(calcData.fabric_id) : null
      })
      console.log('Получил:', data)
      if (data.success) {
        setCalcResult(data.data)
      }
    } catch (error) {
      console.error('Ошибка расчёта:', error)
      alert('Ошибка расчёта: ' + (error.response?.data?.error?.message || error.message))
    }
  }

  const getStatusBadge = (status) => {
    const map = {
      'draft': { text: 'Черновик', color: '#7f8c8d' },
      'sent': { text: 'Отправлено', color: '#3498db' },
      'viewed': { text: 'Просмотрено', color: '#9b59b6' },
      'approved': { text: 'Согласовано', color: '#16c79a' },
      'rejected': { text: 'Отклонено', color: '#e94560' },
    }
    const info = map[status] || { text: status, color: '#7f8c8d' }
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '0.8rem',
        background: info.color + '20',
        color: info.color,
      }}>
        {info.text}
      </span>
    )
  }

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
          <h1>💰 Сметы и КП</h1>
          <p className="text-muted">Коммерческие предложения и расчёты</p>
        </div>
        <button 
          onClick={() => setShowCalculator(!showCalculator)}
          className="btn btn-primary"
        >
          🧮 {showCalculator ? 'Скрыть' : 'Калькулятор'}
        </button>
      </div>

      {/* Калькулятор */}
      {showCalculator && (
        <div className="card mb-3" style={{ borderLeftColor: 'var(--success)' }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--success)' }}>
            🧮 Калькулятор материалов
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '20px',
          }}>
            <div>
              <label>Ширина окна (см)</label>
              <input
                type="number"
                value={calcData.window_width_cm}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value) || 0
                  setCalcData({...calcData, window_width_cm: val})
                }}
              />
            </div>
            <div>
              <label>Высота окна (см)</label>
              <input
                type="number"
                value={calcData.window_height_cm}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value) || 0
                  setCalcData({...calcData, window_height_cm: val})
                }}
              />
            </div>
            <div>
              <label>Ткань</label>
              <select
                value={calcData.fabric_id}
                onChange={(e) => setCalcData({...calcData, fabric_id: e.target.value})}
              >
                <option value="">Выберите ткань</option>
                {fabrics.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.price_per_meter}₸/м)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Тип пошива</label>
              <select
                value={calcData.sewing_type}
                onChange={(e) => setCalcData({...calcData, sewing_type: e.target.value})}
              >
                <option value="шторы">Шторы</option>
                <option value="тюль">Тюль</option>
                <option value="портьеры">Портьеры</option>
              </select>
            </div>
            <div>
              <label>Сложность пошива</label>
              <select
                value={calcData.complexity}
                onChange={(e) => setCalcData({...calcData, complexity: e.target.value})}
              >
                <option value="simple">🟢 Простой (2000 ₸/м)</option>
                <option value="medium">🟡 Средний (3500 ₸/м)</option>
                <option value="complex">🟠 Сложный (5500 ₸/м)</option>
                <option value="premium">🔴 Премиум (8000 ₸/м)</option>
              </select>
            </div>
            <div>
              <label>Город</label>
              <select
                value={calcData.city}
                onChange={(e) => setCalcData({...calcData, city: e.target.value})}
              >
                <option value="Алматы">Алматы</option>
                <option value="Астана">Астана</option>
                <option value="Шымкент">Шымкент</option>
                <option value="Другой">Другой</option>
              </select>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '20px',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={calcData.installation}
                onChange={(e) => setCalcData({...calcData, installation: e.target.checked})}
              />
              🛠️ Монтаж (установка)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={calcData.delivery}
                onChange={(e) => setCalcData({...calcData, delivery: e.target.checked})}
              />
              🚚 Доставка
            </label>
          </div>

          <button onClick={calculate} className="btn btn-success" style={{ marginBottom: '20px' }}>
            📊 Рассчитать
          </button>

          {calcResult && (
            <div style={{
              background: 'var(--background)',
              borderRadius: '10px',
              padding: '20px',
            }}>
              <h4 style={{ marginBottom: '16px' }}>📋 Результат расчёта:</h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '16px',
              }}>
                <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: '8px' }}>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>🧵 Ткань ({calcResult.meters_needed} м)</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                    {calcResult.fabric_cost?.toLocaleString()} ₸
                  </div>
                </div>
                <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: '8px' }}>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>🪡 Пошив ({calcResult.complexity})</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                    {calcResult.sewing_cost?.toLocaleString()} ₸
                  </div>
                </div>
                <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: '8px' }}>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>🧷 Фурнитура</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                    {calcResult.accessories_cost?.toLocaleString()} ₸
                  </div>
                </div>
                {calcResult.installation_cost > 0 && (
                  <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: '8px' }}>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>🛠️ Монтаж</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--warning)' }}>
                      {calcResult.installation_cost?.toLocaleString()} ₸
                    </div>
                  </div>
                )}
                {calcResult.delivery_cost > 0 && (
                  <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: '8px' }}>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>🚚 Доставка ({calcResult.city})</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--warning)' }}>
                      {calcResult.delivery_cost?.toLocaleString()} ₸
                    </div>
                  </div>
                )}
              </div>
              
              {/* Итог */}
              <div style={{
                marginTop: '20px',
                padding: '20px',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                borderRadius: '12px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '8px' }}>
                  💰 ИТОГОВАЯ СУММА ({calcResult.city || 'Алматы'})
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                  {(calcResult.total_cost || 0).toLocaleString()} ₸
                </div>
                <div style={{ fontSize: '1.1rem', color: 'var(--success)', marginTop: '12px', fontWeight: '600' }}>
                  💳 ПРЕДОПЛАТА 50%: {(calcResult.prepayment_amount || 0).toLocaleString()} ₸
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '12px' }}>
                  Ткань: {(calcResult.fabric_cost || 0).toLocaleString()} ₸
                  {calcResult.sewing_cost > 0 && ` + Пошив: ${calcResult.sewing_cost.toLocaleString()} ₸`}
                  {calcResult.accessories_cost > 0 && ` + Фурнитура: ${calcResult.accessories_cost.toLocaleString()} ₸`}
                  {calcResult.installation_cost > 0 && ` + Монтаж: ${calcResult.installation_cost.toLocaleString()} ₸`}
                  {calcResult.delivery_cost > 0 && ` + Доставка: ${calcResult.delivery_cost.toLocaleString()} ₸`}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Список смет */}
      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>📋 Сметы</h3>
        
        {loading ? (
          <p>Загрузка...</p>
        ) : quotes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p className="text-muted">Пока нет смет. Создайте из задачи.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {quotes.map(quote => (
              <Link
                key={quote.id}
                to={`/quotes/${quote.id}`}
                className="card"
                style={{
                  textDecoration: 'none',
                  color: 'var(--text)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                      {quote.quote_number}
                    </span>
                    {getStatusBadge(quote.status)}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                    Сумма: <strong>{quote.total_amount?.toLocaleString()} ₸</strong>
                  </div>
                </div>
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                  {new Date(quote.created_at).toLocaleDateString('ru-RU')}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Quotes
