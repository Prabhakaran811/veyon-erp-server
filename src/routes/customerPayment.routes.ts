
import { Router } from "express";

import {
  createCustomerPayment,
  getCustomerPayments,
  getCustomerPaymentById,
  getOutstandingInvoices,
  updateCustomerPayment
} from "../controllers/customerPayment.controller";

const router = Router();

// Keep this route before /:id.
router.get("/outstanding-invoices", getOutstandingInvoices);

router.post("/", createCustomerPayment);
router.get("/", getCustomerPayments);
router.get("/:id", getCustomerPaymentById);
router.put("/:id", updateCustomerPayment);

export default router;
