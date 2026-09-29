import { Router, type IRouter } from "express";
import healthRouter from "./health";
import costguardRouter from "./costguard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(costguardRouter);

export default router;
