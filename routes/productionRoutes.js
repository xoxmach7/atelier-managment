import express from 'express'
import { authenticate, authorize, ROLES } from '../middleware/auth.js'
import pool from '../config/db.js'

const router = express.Router()

// Все роуты требуют авторизации
router.use(authenticate)

// Получить все назначения
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pa.*, 
             u.full_name as seamstress_name,
             o.order_number
      FROM production_assignments pa
      LEFT JOIN users u ON pa.assigned_to = u.id
      LEFT JOIN orders o ON pa.order_id = o.id
      ORDER BY pa.priority DESC, pa.deadline ASC
    `)
    
    res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Ошибка загрузки производства:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// Создать назначение (только менеджер/админ)
router.post('/', authorize(ROLES.MANAGER, ROLES.ADMIN), async (req, res) => {
  const { order_id, assigned_to, deadline, priority, complexity } = req.body
  
  try {
    const result = await pool.query(`
      INSERT INTO production_assignments 
        (order_id, assigned_to, deadline, priority, complexity, status, created_by)
      VALUES ($1, $2, $3, $4, $5, 'assigned', $6)
      RETURNING *
    `, [order_id, assigned_to, deadline, priority, complexity, req.user.id])
    
    // Обновляем статус заказа
    await pool.query(`
      UPDATE orders SET status = 'processing' WHERE id = $1
    `, [order_id])
    
    res.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('Ошибка назначения:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

// Обновить статус (швея может менять свой заказ)
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params
  const { status } = req.body
  
  try {
    // Проверяем права
    const assignResult = await pool.query(
      'SELECT assigned_to FROM production_assignments WHERE id = $1',
      [id]
    )
    
    if (assignResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Назначение не найдено' } })
    }
    
    const assignment = assignResult.rows[0]
    
    // Швея может менять только свои заказы
    if (req.user.role === 'seamstress' && assignment.assigned_to !== req.user.id) {
      return res.status(403).json({ success: false, error: { message: 'Нет доступа' } })
    }
    
    const result = await pool.query(`
      UPDATE production_assignments 
      SET status = $1, 
          ${status === 'ready' ? 'completed_at = NOW()' : ''}
          ${status === 'cutting' && '!started_at' ? 'started_at = NOW()' : ''}
      WHERE id = $2
      RETURNING *
    `, [status, id])
    
    // Логируем изменение
    await pool.query(`
      INSERT INTO production_logs (assignment_id, old_status, new_status, changed_by, notes)
      SELECT $1, status, $2, $3, 'Status updated'
      FROM production_assignments WHERE id = $1
    `, [id, status, req.user.id])
    
    res.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('Ошибка обновления статуса:', error)
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

export default router
