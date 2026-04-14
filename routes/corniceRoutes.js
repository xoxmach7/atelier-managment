import express from 'express';
import {
    getCornices,
    getCorniceById,
    createCornice,
    updateCornice,
    deleteCornice
} from '../controllers/corniceController.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

router.get('/', asyncHandler(getCornices));
router.get('/:id', asyncHandler(getCorniceById));
router.post('/', asyncHandler(createCornice));
router.patch('/:id', asyncHandler(updateCornice));
router.delete('/:id', asyncHandler(deleteCornice));

export default router;
