import {Router } from 'express';
import { postQueries } from '../controllers/queryController.js';

const router = Router();

router.post('/', postQueries);

export default router;