import React, { useState } from 'react';
import QRScanner from './QRScanner';

/**
 * Компонент для сканирования ткани с отображением информации
 * Интегрируется в страницу выбора ткани / создания заказа
 */
const FabricScanner = ({ onFabricSelect, authToken, apiUrl = 'http://localhost:5000/api' }) => {
  const [fabric, setFabric] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showScanner, setShowScanner] = useState(true);

  // Поиск ткани по номеру вешалки
  const lookupFabric = async (hangerNumber) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${apiUrl}/fabrics/by-hanger/${hangerNumber}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setFabric(data.data);
        setShowScanner(false); // Скрываем сканер после успеха
      } else {
        setError('Ткань не найдена');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  // Бронирование ткани
  const reserveFabric = async (meters) => {
    if (!fabric) return;
    
    try {
      const response = await fetch(`${apiUrl}/reservations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fabric_id: fabric.id,
          reserved_meters: meters,
          expires_days: 3
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Забронировано ${meters}м ткани "${fabric.name}"`);
        onFabricSelect && onFabricSelect(fabric, meters);
      } else {
        alert(`❌ ${data.error?.message || 'Ошибка бронирования'}`);
      }
    } catch (err) {
      alert('❌ Ошибка соединения');
    }
  };

  // Сброс и повторное сканирование
  const reset = () => {
    setFabric(null);
    setError(null);
    setShowScanner(true);
  };

  return (
    <div className="fabric-scanner">
      <h3>📱 Сканирование ткани</h3>
      
      {showScanner ? (
        <div className="scanner-section">
          <QRScanner 
            onScan={lookupFabric}
            onError={setError}
            width={300}
            height={300}
          />
          
          {loading && <p>⏳ Поиск ткани...</p>}
          {error && <p className="error">❌ {error}</p>}
          
          {/* Ручной ввод */}
          <div className="manual-input" style={{ marginTop: '20px' }}>
            <p>Или введите номер вручную:</p>
            <input 
              type="text" 
              placeholder="Например: A-101"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  lookupFabric(e.target.value.toUpperCase());
                }
              }}
              style={{
                padding: '10px',
                fontSize: '1rem',
                textTransform: 'uppercase',
                borderRadius: '5px',
                border: '1px solid #ccc'
              }}
            />
          </div>
        </div>
      ) : (
        <div className="fabric-result">
          {fabric && (
            <>
              <div className="fabric-card" style={{
                background: '#16213e',
                padding: '20px',
                borderRadius: '15px',
                marginTop: '20px'
              }}>
                <h2 style={{ color: '#e94560', marginBottom: '10px' }}>
                  {fabric.hanger_number}
                </h2>
                <h3>{fabric.name}</h3>
                
                <div className="info-grid" style={{
                  display: 'grid',
                  gap: '10px',
                  marginTop: '15px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Остаток:</span>
                    <span style={{ 
                      color: fabric.stock_meters < 10 ? '#e94560' : '#16c79a',
                      fontWeight: 'bold'
                    }}>
                      {fabric.stock_meters} м
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Цена:</span>
                    <span>{fabric.price_per_meter.toLocaleString()} ₽/м</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Цвет:</span>
                    <span>{fabric.color || '-'}</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Ширина:</span>
                    <span>{fabric.width_cm} см</span>
                  </div>
                </div>

                {/* Выбор метража для бронирования */}
                <div className="reserve-section" style={{ marginTop: '20px' }}>
                  <label>Введите нужный метраж:</label>
                  <input 
                    type="number" 
                    id="reserveMeters"
                    defaultValue="5"
                    min="0.1"
                    step="0.1"
                    style={{
                      width: '100%',
                      padding: '10px',
                      marginTop: '10px',
                      marginBottom: '15px',
                      borderRadius: '5px',
                      border: '1px solid #ccc'
                    }}
                  />
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => {
                        const meters = parseFloat(document.getElementById('reserveMeters').value);
                        reserveFabric(meters);
                      }}
                      style={{
                        flex: 1,
                        padding: '15px',
                        background: '#16c79a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '1rem',
                        cursor: 'pointer'
                      }}
                    >
                      📦 Забронировать
                    </button>
                    
                    <button 
                      onClick={reset}
                      style={{
                        padding: '15px',
                        background: '#444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '1rem',
                        cursor: 'pointer'
                      }}
                    >
                      🔄 Сканировать другую
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FabricScanner;
