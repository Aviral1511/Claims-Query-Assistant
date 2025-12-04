import { Router } from "express";
import { queryRoll } from "../controllers/QueryLogController.js";
const router = Router();

router.post('/', queryRoll);

export default router;