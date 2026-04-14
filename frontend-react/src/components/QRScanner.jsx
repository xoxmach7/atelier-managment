import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

/**
 * Компонент QR-сканера
 * 
 * @param {function} onScan - callback при успешном сканировании (передает hanger_number)
 * @param {function} onError - callback при ошибке
 * @param {number} width - ширина сканера
 * @param {number} height - высота сканера
 * @param {boolean} stopOnScan - остановить сканер после успеха
 */
const QRScanner = ({ 
  onScan, 
  onError, 
  width = 300, 
  height = 300,
  stopOnScan = true 
}) => {
  const scannerRef = useRef(null)
  const [isScanning, setIsScanning] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [lastScanned, setLastScanned] = useState(null)

  useEffect(() => {
    const element = document.getElementById('qr-reader')
    if (!element) return

    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1,
    }

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            const hangerNumber = extractHangerNumber(decodedText)
            
            if (hangerNumber) {
              setLastScanned({
                code: hangerNumber,
                time: new Date().toLocaleTimeString('ru-RU')
              })
              
              onScan && onScan(hangerNumber)
              
              if (stopOnScan) {
                scanner.stop().catch(() => {})
                setIsScanning(false)
              }
            }
          },
          () => {
            // Игнорируем ошибки сканирования
          }
        )
        setIsScanning(true)
        setHasError(false)
      } catch (err) {
        console.error('Camera error:', err)
        setHasError(true)
        setIsScanning(false)
        onError && onError('Нет доступа к камере')
      }
    }

    startScanner()

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [onScan, onError, stopOnScan])

  const extractHangerNumber = (text) => {
    const match = text.match(/([A-Z]-\d{3})/)
    if (match) return match[1]
    
    const altMatch = text.match(/([A-Z])(\d{3})/)
    if (altMatch) return `${altMatch[1]}-${altMatch[2]}`
    
    return null
  }

  const restart = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        window.location.reload()
      })
    }
  }

  return (
    <div style={styles.container}>
      {hasError ? (
        <div style={styles.error}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📷❌</div>
          <h3 style={{ color: 'var(--danger)', marginBottom: '8px' }}>
            Нет доступа к камере
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
            Разрешите доступ к камере в настройках браузера
          </p>
          <button onClick={restart} className="btn btn-primary">
            🔄 Попробовать снова
          </button>
        </div>
      ) : (
        <>
          <div 
            id="qr-reader" 
            style={{
              width: `${width}px`,
              height: `${height}px`,
              borderRadius: '15px',
              overflow: 'hidden',
              margin: '0 auto',
            }}
          />
          
          {isScanning && (
            <div style={styles.hint}>
              <div style={styles.scanLine} />
              <p>Наведите камеру на QR-код вешалки</p>
            </div>
          )}
          
          {lastScanned && (
            <div style={styles.lastScanned}>
              <span>✅ Отсканировано: </span>
              <strong>{lastScanned.code}</strong>
              <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                ({lastScanned.time})
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

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
    background: 'var(--surface)',
    borderRadius: '15px',
  },
  hint: {
    marginTop: '20px',
    textAlign: 'center',
    color: 'var(--success)',
    position: 'relative',
  },
  scanLine: {
    width: '200px',
    height: '2px',
    background: 'var(--success)',
    margin: '0 auto 12px',
    boxShadow: '0 0 10px var(--success)',
    animation: 'scan 2s infinite',
  },
  lastScanned: {
    marginTop: '16px',
    padding: '12px 20px',
    background: 'rgba(22, 199, 154, 0.1)',
    borderRadius: '10px',
    color: 'var(--success)',
  },
}

// Добавляем keyframes в глобальные стили
const styleSheet = document.createElement('style')
styleSheet.textContent = `
  @keyframes scan {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
`
document.head.appendChild(styleSheet)

export default QRScanner
