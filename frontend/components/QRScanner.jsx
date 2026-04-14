import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * Компонент QR-сканера для React
 * 
 * Пример использования:
 * <QRScanner 
 *   onScan={(hangerNumber) => console.log('Найдена вешалка:', hangerNumber)}
 *   onError={(error) => console.error('Ошибка:', error)}
 *   width={300}
 *   height={300}
 * />
 */
const QRScanner = ({ onScan, onError, width = 300, height = 300 }) => {
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Проверяем что элемент существует
    const element = document.getElementById('qr-scanner');
    if (!element) return;

    const scanner = new Html5Qrcode('qr-scanner');
    scannerRef.current = scanner;

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1,
    };

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' }, // Задняя камера
          config,
          (decodedText) => {
            // Успешное сканирование
            const hangerNumber = extractHangerNumber(decodedText);
            if (hangerNumber) {
              onScan(hangerNumber);
            } else {
              onError && onError('Неверный формат QR кода');
            }
          },
          () => {
            // Игнорируем ошибки при сканировании (когда QR не найден)
          }
        );
        setIsScanning(true);
        setHasError(false);
      } catch (err) {
        console.error('Ошибка камеры:', err);
        setHasError(true);
        setIsScanning(false);
        onError && onError('Нет доступа к камере');
      }
    };

    startScanner();

    // Очистка при размонтировании
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan, onError]);

  // Извлечение номера вешалки из QR
  const extractHangerNumber = (text) => {
    // Паттерны: A-101, B-205
    const match = text.match(/([A-Z]-\d{3})/);
    if (match) return match[1];
    
    // Если просто буква-цифры без дефиса
    const altMatch = text.match(/([A-Z])(\d{3})/);
    if (altMatch) return `${altMatch[1]}-${altMatch[2]}`;
    
    return null;
  };

  const restartScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        setHasError(false);
        window.location.reload(); // Простой способ перезапустить
      });
    }
  };

  return (
    <div style={styles.container}>
      {hasError ? (
        <div style={styles.error}>
          <p>⚠️ Нет доступа к камере</p>
          <p style={styles.errorHint}>
            Разрешите доступ к камере в настройках браузера
          </p>
          <button onClick={restartScanner} style={styles.retryButton}>
            🔄 Попробовать снова
          </button>
        </div>
      ) : (
        <>
          <div 
            id="qr-scanner" 
            style={{
              width: `${width}px`,
              height: `${height}px`,
              borderRadius: '15px',
              overflow: 'hidden',
            }}
          />
          {isScanning && (
            <p style={styles.hint}>📱 Наведите камеру на QR-код вешалки</p>
          )}
        </>
      )}
    </div>
  );
};

// Стили (можно заменить на CSS Modules или Tailwind)
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
  },
  error: {
    textAlign: 'center',
    padding: '40px 20px',
    backgroundColor: '#16213e',
    borderRadius: '15px',
    color: '#e94560',
  },
  errorHint: {
    color: '#a0a0a0',
    fontSize: '0.9rem',
    marginTop: '10px',
  },
  retryButton: {
    marginTop: '20px',
    padding: '12px 24px',
    backgroundColor: '#e94560',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  hint: {
    marginTop: '15px',
    color: '#16c79a',
    fontSize: '0.9rem',
  },
};

export default QRScanner;
