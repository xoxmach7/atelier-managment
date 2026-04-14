import { useEffect, useState } from 'react'
import QRScanner from '../components/QRScanner'
import api from '../services/api'

const Fabrics = () => {
  const [fabrics, setFabrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [selectedFabric, setSelectedFabric] = useState(null)
  const [reserveMeters, setReserveMeters] = useState(5)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadFabrics()
  }, [search])

  const loadFabrics = async () => {
    try {
      setLoading(true)
      const params = search ? `?search=${search}` : ''
      const { data } = await api.get(`/fabrics${params}`)
      setFabrics(data.data || [])
    } catch (error) {
      console.error('Ошибка загрузки тканей:', error)
    } finally {
      setLoading(false)
    }
  }

  // Обработка сканирования
  const handleScan = async (hangerNumber) => {
    try {
      const { data } = await api.get(`/fabrics/by-hanger/${hangerNumber}`)
      if (data.success) {
        setSelectedFabric(data.data)
        setScanning(false)
      }
    } catch (error) {
      alert('Ткань не найдена')
    }
  }

  // Бронирование ткани
  const handleReserve = async () => {
    if (!selectedFabric) return
    
    try {
      const { data } = await api.post('/reservations', {
        fabric_id: selectedFabric.id,
        reserved_meters: reserveMeters,
        expires_days: 3,
      })
      
      if (data.success) {
        alert(`✅ Забронировано ${reserveMeters}м ткани "${selectedFabric.name}"`)
        setSelectedFabric(null)
        loadFabrics()
      }
    } catch (error) {
      alert(error.response?.data?.error?.message || 'Ошибка бронирования')
    }
  }

  return (
    <div className="container animate-fade-in">
      <h1>🧵 Склад тканей</h1>
      <p className="text-muted mb-3">Сканируйте QR-код на вешалке для быстрого поиска</p>

      {/* QR Сканер */}
      <div className="card mb-3" style={{ textAlign: 'center' }}>
        <h3 style={{ marginBottom: '20px' }}>📱 QR Сканер</h3>
        
        {scanning ? (
          <QRScanner 
            onScan={handleScan}
            onError={(err) => console.error(err)}
            width={300}
            height={300}
            stopOnScan={true}
          />
        ) : (
          <div>
            {selectedFabric ? (
              // Результат сканирования
              <div style={{
                background: 'var(--background)',
                borderRadius: '15px',
                padding: '24px',
                maxWidth: '400px',
                margin: '0 auto',
              }}>
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  color: 'var(--primary)',
                  marginBottom: '12px',
                }}>
                  {selectedFabric.hanger_number}
                </div>
                <h3 style={{ marginBottom: '8px' }}>{selectedFabric.name}</h3>
                <p className="text-muted" style={{ marginBottom: '16px' }}>
                  {selectedFabric.composition}
                </p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '20px',
                }}>
                  <div style={{
                    background: 'var(--surface)',
                    padding: '12px',
                    borderRadius: '10px',
                  }}>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>Остаток</div>
                    <div style={{
                      fontSize: '1.3rem',
                      fontWeight: 'bold',
                      color: selectedFabric.stock_meters < 10 ? 'var(--danger)' : 'var(--success)',
                    }}>
                      {selectedFabric.stock_meters} м
                    </div>
                  </div>
                  <div style={{
                    background: 'var(--surface)',
                    padding: '12px',
                    borderRadius: '10px',
                  }}>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>Цена</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>
                      {selectedFabric.price_per_meter.toLocaleString()} ₽
                    </div>
                  </div>
                </div>

                {/* Бронирование */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px' }}>
                    Забронировать (метров):
                  </label>
                  <input
                    type="number"
                    value={reserveMeters}
                    onChange={(e) => setReserveMeters(parseFloat(e.target.value))}
                    min="0.1"
                    step="0.1"
                    max={selectedFabric.stock_meters}
                    style={{ width: '100%', marginBottom: '16px', textAlign: 'center' }}
                  />
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handleReserve} className="btn btn-success" style={{ flex: 1 }}>
                      📦 Забронировать
                    </button>
                    <button 
                      onClick={() => setSelectedFabric(null)} 
                      className="btn btn-secondary"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setSelectedFabric(null)
                    setScanning(true)
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  🔄 Сканировать другую
                </button>
              </div>
            ) : (
              // Кнопка начала сканирования
              <button 
                onClick={() => setScanning(true)}
                className="btn btn-primary"
                style={{ padding: '20px 40px', fontSize: '1.2rem' }}
              >
                📷 Включить камеру
              </button>
            )}
          </div>
        )}
      </div>

      {/* Список тканей */}
      <div className="card">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <h3>📋 Все ткани ({fabrics.length})</h3>
          <input
            type="text"
            placeholder="🔍 Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 'auto', minWidth: '250px' }}
          />
        </div>

        {loading ? (
          <p>Загрузка...</p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {fabrics.map(fabric => (
              <div
                key={fabric.id}
                style={{
                  background: 'var(--background)',
                  borderRadius: '12px',
                  padding: '16px',
                  borderLeft: `4px solid ${fabric.stock_meters < 10 ? 'var(--danger)' : 'var(--success)'}`,
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}>
                  <span style={{
                    fontWeight: 'bold',
                    color: 'var(--primary)',
                  }}>
                    {fabric.hanger_number}
                  </span>
                  <span style={{
                    fontSize: '0.8rem',
                    color: fabric.stock_meters < 10 ? 'var(--danger)' : 'var(--success)',
                  }}>
                    {fabric.stock_meters < 10 ? '⚠️ Мало' : '✅ В наличии'}
                  </span>
                </div>
                <h4 style={{ marginBottom: '4px', fontSize: '1rem' }}>{fabric.name}</h4>
                <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                  {fabric.composition}
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.9rem',
                }}>
                  <span className="text-muted">{fabric.stock_meters} м</span>
                  <span style={{ fontWeight: 'bold' }}>
                    {fabric.price_per_meter.toLocaleString()} ₽/м
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Fabrics
