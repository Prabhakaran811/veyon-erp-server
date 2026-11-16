
import { Router } from "express";

import {
  createDeliveryChallan,
  getDeliveryChallans,
  getDeliveryChallanById,
  updateDeliveryChallan,
  deleteDeliveryChallan
} from "../controllers/deliveryChallan.controller";

const router = Router();

router.post("/", createDeliveryChallan);
router.get("/", getDeliveryChallans);
router.get("/:id", getDeliveryChallanById);
router.put("/:id", updateDeliveryChallan);
router.delete("/:id", deleteDeliveryChallan);

export default router;
