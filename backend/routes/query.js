import {Router } from 'express';
import { postQueries } from '../controllers/query';

const router = Router();

router.post('/', postQueries);

export default router;