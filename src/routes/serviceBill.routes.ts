
import { Router } from "express";

import {
  createServiceBill,
  getServiceBills,
  getServiceBillById,
  updateServiceBill,
  deleteServiceBill
} from "../controllers/serviceBill.controller";

const router = Router();

router.post("/", createServiceBill);
router.get("/", getServiceBills);
router.get("/:id", getServiceBillById);
router.put("/:id", updateServiceBill);
router.delete("/:id", deleteServiceBill);

export default router;
