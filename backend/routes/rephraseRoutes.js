import { Router } from "express";
import { rephrase } from "../controllers/rephraseController.js";

const router = Router();

router.post('/', rephrase);

export default router;