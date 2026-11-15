
import { Router } from "express";

import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
} from "../controllers/customer.controller";

const router = Router();

// Create customer
router.post("/", createCustomer);

// Get all customers
router.get("/", getCustomers);

// Get customer by ID
router.get("/:id", getCustomerById);

// Update customer
router.put("/:id", updateCustomer);

// Delete customer
router.delete("/:id", deleteCustomer);

export default router;
