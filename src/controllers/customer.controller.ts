
import { Request, Response } from "express";
import mongoose from "mongoose";
import Customer from "../models/customer.model";

// CREATE CUSTOMER
export const createCustomer = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      customerCode,
      customerLegalName,
      gstin,
      gstState,
      stateCode,
      billingAddress,
      siteAddress,
      contactPerson,
      phoneNumber,
      emailAddress
    } = req.body;

    if (!customerCode || !customerLegalName) {
      res.status(400).json({
        success: false,
        message: "Customer code and legal name are required"
      });
      return;
    }

    const existingCustomer = await Customer.findOne({
      customerCode: customerCode.trim().toUpperCase()
    });

    if (existingCustomer) {
      res.status(409).json({
        success: false,
        message: "Customer code already exists"
      });
      return;
    }

    const customer = await Customer.create({
      customerCode,
      customerLegalName,
      gstin,
      gstState,
      stateCode,
      billingAddress,
      siteAddress,
      contactPerson,
      phoneNumber,
      emailAddress
    });

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer
    });

  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: "Customer code already exists"
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to create customer",
      error: error.message
    });
  }
};


// GET ALL CUSTOMERS
export const getCustomers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const customers = await Customer.find({
      isActive: true
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
      error: error.message
    });
  }
};


// GET CUSTOMER BY ID
export const getCustomerById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid customer ID"
      });
      return;
    }

    const customer = await Customer.findOne({
      _id: id,
      isActive: true
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "Customer not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: customer
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
      error: error.message
    });
  }
};


// UPDATE CUSTOMER
export const updateCustomer = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid customer ID"
      });
      return;
    }

    const {
      customerCode,
      customerLegalName,
      gstin,
      gstState,
      stateCode,
      billingAddress,
      siteAddress,
      contactPerson,
      phoneNumber,
      emailAddress
    } = req.body;

    const updateData = {
      customerCode,
      customerLegalName,
      gstin,
      gstState,
      stateCode,
      billingAddress,
      siteAddress,
      contactPerson,
      phoneNumber,
      emailAddress
    };

    // Remove fields not supplied by the frontend
    const filteredData = Object.fromEntries(
      Object.entries(updateData).filter(
        ([, value]) => value !== undefined
      )
    );

    const customer = await Customer.findOneAndUpdate(
      {
        _id: id,
        isActive: true
      },
      filteredData,
      {
        new: true,
        runValidators: true
      }
    );

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "Customer not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: customer
    });

  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: "Customer code already exists"
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to update customer",
      error: error.message
    });
  }
};


// DELETE CUSTOMER (PERMANENT DELETE)
export const deleteCustomer = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid customer ID"
      });
      return;
    }

    const customer = await Customer.findByIdAndDelete(id);

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "Customer not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Customer permanently deleted successfully",
      data: {
        id: customer._id,
        customerCode: customer.customerCode
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to permanently delete customer",
      error: error.message
    });
  }
};
