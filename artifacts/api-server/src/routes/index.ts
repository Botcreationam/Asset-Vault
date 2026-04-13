import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import foldersRouter from "./folders";
import resourcesRouter from "./resources";
import unitsRouter from "./units";
import socialRouter from "./social";
import chatRouter from "./chat";
import ratingsRouter from "./ratings";
import notificationsRouter from "./notifications";
import materialRequestsRouter from "./material-requests";
import analyticsRouter from "./analytics";
import bookmarksRouter from "./bookmarks";
import discoveryRouter from "./discovery";
import schoolsRouter from "./schools";
import { apiRateLimit } from "../lib/rate-limit";

const router: IRouter = Router();

router.use(apiRateLimit);
router.use(healthRouter);
router.use(authRouter);
router.use(foldersRouter);
router.use(resourcesRouter);
router.use(unitsRouter);
router.use(socialRouter);
router.use(chatRouter);
router.use(ratingsRouter);
router.use(notificationsRouter);
router.use(materialRequestsRouter);
router.use(analyticsRouter);
router.use(bookmarksRouter);
router.use(discoveryRouter);
router.use(schoolsRouter);

export default router;
