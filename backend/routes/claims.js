import { Router } from "express";
import { getClaimDetailsById, getClaimDetails } from "../controllers/claims.js";
const router = Router();

router.get('/:id', getClaimDetailsById);
router.get('/', getClaimDetails);

export default router;