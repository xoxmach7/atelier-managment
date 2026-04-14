import express from 'express';
import {
    getTasks,
    getTaskById,
    createTask,
    updateTaskStatus,
    assignDesigner,
    addTaskPhoto,
    addMeasurement,
    deleteTask
} from '../controllers/taskController.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, authorize, ROLES } from '../middleware/auth.js';
import { validateTask, validateId, validatePagination } from '../middleware/validation.js';

const router = express.Router();

// Все роуты требуют авторизации
router.use(authenticate);

// Доступ: все авторизованные
router.get('/', validatePagination, asyncHandler(getTasks));
router.get('/:id', validateId, asyncHandler(getTaskById));

// Доступ: дизайнер, менеджер, админ
router.post('/', authorize(ROLES.DESIGNER, ROLES.MANAGER, ROLES.ADMIN), validateTask, asyncHandler(createTask));
router.patch('/:id/status', authorize(ROLES.DESIGNER, ROLES.MANAGER, ROLES.ADMIN), validateId, asyncHandler(updateTaskStatus));
router.post('/:id/photos', authorize(ROLES.DESIGNER, ROLES.ADMIN), validateId, asyncHandler(addTaskPhoto));
router.post('/:id/measurements', authorize(ROLES.DESIGNER, ROLES.ADMIN), validateId, asyncHandler(addMeasurement));

// Назначение дизайнера (только менеджер или админ)
router.patch('/:id/assign', authorize(ROLES.MANAGER, ROLES.ADMIN), validateId, asyncHandler(assignDesigner));

// Удаление (только админ)
router.delete('/:id', authorize(ROLES.ADMIN), validateId, asyncHandler(deleteTask));

export default router;
