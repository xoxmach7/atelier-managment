import React, { useState } from 'react';
import FabricScanner from '../components/FabricScanner';

/**
 * Страница создания заказа с интеграцией QR-сканера
 * Показывает как использовать сканер внутри приложения
 */
const CreateOrder = () => {
  // Состояние формы заказа
  const [order, setOrder] = useState({
    clientName: '',
    clientPhone: '',
    address: '',
    items: [], // Товары в заказе
  });
  
  // Токен из localStorage (получен при логине)
  const authToken = localStorage.getItem('brigada_token');
  
  // Добавление ткани в заказ после сканирования
  const handleFabricSelect = (fabric, meters) => {
    const newItem = {
      type: 'fabric',
      id: fabric.id,
      name: fabric.name,
      hangerNumber: fabric.hanger_number,
      meters: meters,
      pricePerMeter: fabric.price_per_meter,
      totalPrice: meters * fabric.price_per_meter,
    };
    
    setOrder(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    
    // Можно показать уведомление
    console.log(`Добавлена ткань: ${fabric.name} (${meters}м)`);
  };
  
  // Удаление позиции
  const removeItem = (index) => {
    setOrder(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };
  
  // Итоговая сумма
  const totalAmount = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
  
  return (
    <div className="create-order-page" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🛒 Создание заказа</h1>
      
      {/* Шаг 1: Информация о клиенте */}
      <section style={{ marginBottom: '30px' }}>
        <h2>👤 Клиент</h2>
        <div style={{ display: 'grid', gap: '15px' }}>
          <input 
            type="text" 
            placeholder="Имя клиента"
            value={order.clientName}
            onChange={(e) => setOrder(prev => ({ ...prev, clientName: e.target.value }))}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
          />
          <input 
            type="tel" 
            placeholder="Телефон"
            value={order.clientPhone}
            onChange={(e) => setOrder(prev => ({ ...prev, clientPhone: e.target.value }))}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
          />
          <input 
            type="text" 
            placeholder="Адрес установки"
            value={order.address}
            onChange={(e) => setOrder(prev => ({ ...prev, address: e.target.value }))}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
          />
        </div>
      </section>
      
      {/* Шаг 2: Выбор ткани через сканер */}
      <section style={{ marginBottom: '30px' }}>
        <h2>📱 Сканирование ткани со склада</h2>
        <FabricScanner 
          onFabricSelect={handleFabricSelect}
          authToken={authToken}
          apiUrl="http://localhost:5000/api"
        />
      </section>
      
      {/* Шаг 3: Список выбранных товаров */}
      <section style={{ marginBottom: '30px' }}>
        <h2>📋 Позиции заказа ({order.items.length})</h2>
        
        {order.items.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            Отсканируйте вешалку с тканью, чтобы добавить в заказ
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {order.items.map((item, index) => (
              <div 
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px',
                  background: '#f5f5f5',
                  borderRadius: '10px',
                  borderLeft: '4px solid #16c79a'
                }}
              >
                <div>
                  <strong>{item.name}</strong>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    {item.hangerNumber} • {item.meters}м × {item.pricePerMeter.toLocaleString()}₽
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <strong>{item.totalPrice.toLocaleString()}₽</strong>
                  <button 
                    onClick={() => removeItem(index)}
                    style={{
                      background: '#e94560',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      
      {/* Шаг 4: Итого и создание */}
      <section style={{ 
        background: '#16213e', 
        color: '#fff', 
        padding: '20px', 
        borderRadius: '15px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '0.9rem', color: '#a0a0a0' }}>Итого:</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16c79a' }}>
            {totalAmount.toLocaleString()}₽
          </div>
        </div>
        
        <button 
          disabled={order.items.length === 0 || !order.clientName}
          style={{
            padding: '15px 40px',
            background: order.items.length === 0 || !order.clientName ? '#444' : '#e94560',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1.1rem',
            cursor: order.items.length === 0 || !order.clientName ? 'not-allowed' : 'pointer'
          }}
        >
          ✅ Создать заказ
        </button>
      </section>
    </div>
  );
};

export default CreateOrder;
