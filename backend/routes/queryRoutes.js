import {Router } from 'express';
import { postQueries } from '../controllers/queryController';

const router = Router();

router.post('/', postQueries);

export default router;