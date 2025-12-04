import { Router } from "express";
import { getClaimDetailsById, getClaimDetails } from "../controllers/claimController.js";
const router = Router();

router.get('/:id', getClaimDetailsById);
router.get('/', getClaimDetails);

export default router;