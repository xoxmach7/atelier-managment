import express from 'express';
import {
    getFabrics,
    getFabricById,
    getFabricByHanger,
    createFabric,
    updateFabric,
    addStock,
    deleteFabric
} from '../controllers/fabricController.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { fabricValidators } from '../middleware/validator.js';

const router = express.Router();

router.get('/', asyncHandler(getFabrics));
router.get('/by-hanger/:hanger_number', asyncHandler(getFabricByHanger));
router.get('/:id', asyncHandler(getFabricById));
router.post('/', fabricValidators.create, asyncHandler(createFabric));
router.patch('/:id', asyncHandler(updateFabric));
router.post('/:id/add-stock', asyncHandler(addStock));
router.delete('/:id', asyncHandler(deleteFabric));

export default router;
