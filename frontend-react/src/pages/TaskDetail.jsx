import { useParams } from 'react-router-dom'

const TaskDetail = () => {
  const { id } = useParams()

  return (
    <div className="container">
      <h1>📝 Задача #{id}</h1>
      <p className="text-muted">Детальная страница задачи (в разработке)</p>
      
      <div className="card">
        <p>Здесь будет:</p>
        <ul style={{ marginTop: '16px', lineHeight: '1.8' }}>
          <li>Информация о клиенте</li>
          <li>История статусов</li>
          <li>Замеры и фото</li>
          <li>Бронирования ткани</li>
          <li>Сметы (КП)</li>
          <li>Кнопки смены статуса</li>
        </ul>
      </div>
    </div>
  )
}

export default TaskDetail
