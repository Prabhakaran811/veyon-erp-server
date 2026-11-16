
import { Router } from "express";

import {
  createServiceReport,
  getServiceReports,
  getServiceReportById,
  updateServiceReport,
  deleteServiceReport
} from "../controllers/serviceReport.controller";

const router = Router();

router.post("/", createServiceReport);
router.get("/", getServiceReports);
router.get("/:id", getServiceReportById);
router.put("/:id", updateServiceReport);
router.delete("/:id", deleteServiceReport);

export default router;
