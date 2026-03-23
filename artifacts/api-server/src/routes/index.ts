import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import foldersRouter from "./folders";
import resourcesRouter from "./resources";
import unitsRouter from "./units";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(foldersRouter);
router.use(resourcesRouter);
router.use(unitsRouter);

export default router;
