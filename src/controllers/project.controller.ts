
import { Request, Response } from "express";
import mongoose from "mongoose";

import Project from "../models/project.model";
import Customer from "../models/customer.model";

// CREATE PROJECT
export const createProject = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      projectCode,
      projectName,
      customer,
      projectStatus,
      customerPONumber,
      poDate,
      poValue,
      projectStartDate,
      projectEndDate,
      siteLocation,
      projectScopeAndEngineeringNotes
    } = req.body;

    // Required field check
    if (!projectCode || !projectName || !customer) {
      res.status(400).json({
        success: false,
        message: "Project code, project name and customer are required"
      });
      return;
    }

    // Validate customer ID
    if (!mongoose.isValidObjectId(customer)) {
      res.status(400).json({
        success: false,
        message: "Invalid customer ID"
      });
      return;
    }

    // Check customer exists
    const existingCustomer = await Customer.findById(customer);

    if (!existingCustomer) {
      res.status(404).json({
        success: false,
        message: "Customer not found"
      });
      return;
    }

    // Check duplicate project code
    const existingProject = await Project.findOne({
      projectCode: projectCode.trim().toUpperCase()
    });

    if (existingProject) {
      res.status(409).json({
        success: false,
        message: "Project code already exists"
      });
      return;
    }

    const project = await Project.create({
      projectCode,
      projectName,
      customer,
      projectStatus,
      customerPONumber,
      poDate,
      poValue,
      projectStartDate,
      projectEndDate,
      siteLocation,
      projectScopeAndEngineeringNotes
    });

    const populatedProject = await Project.findById(project._id)
      .populate("customer", "customerCode customerLegalName");

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: populatedProject
    });

  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: "Project code already exists"
      });
      return;
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to create project",
      error: error.message
    });
  }
};


// GET ALL PROJECTS
export const getProjects = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projects = await Project.find()
      .populate("customer", "customerCode customerLegalName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
      error: error.message
    });
  }
};


// GET PROJECT BY ID
export const getProjectById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
      return;
    }

    const project = await Project.findById(id)
      .populate("customer", "customerCode customerLegalName gstin");

    if (!project) {
      res.status(404).json({
        success: false,
        message: "Project not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: project
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch project",
      error: error.message
    });
  }
};


// UPDATE PROJECT
export const updateProject = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
      return;
    }

    const {
      projectCode,
      projectName,
      customer,
      projectStatus,
      customerPONumber,
      poDate,
      poValue,
      projectStartDate,
      projectEndDate,
      siteLocation,
      projectScopeAndEngineeringNotes
    } = req.body;

    // Check customer only when supplied
    if (customer !== undefined) {
      if (!mongoose.isValidObjectId(customer)) {
        res.status(400).json({
          success: false,
          message: "Invalid customer ID"
        });
        return;
      }

      const existingCustomer = await Customer.findById(customer);

      if (!existingCustomer) {
        res.status(404).json({
          success: false,
          message: "Customer not found"
        });
        return;
      }
    }

    const updateData = {
      projectCode,
      projectName,
      customer,
      projectStatus,
      customerPONumber,
      poDate,
      poValue,
      projectStartDate,
      projectEndDate,
      siteLocation,
      projectScopeAndEngineeringNotes
    };

    const filteredData = Object.fromEntries(
      Object.entries(updateData).filter(
        ([, value]) => value !== undefined
      )
    );

    const project = await Project.findByIdAndUpdate(
      id,
      filteredData,
      {
        new: true,
        runValidators: true
      }
    ).populate("customer", "customerCode customerLegalName");

    if (!project) {
      res.status(404).json({
        success: false,
        message: "Project not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: project
    });

  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: "Project code already exists"
      });
      return;
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to update project",
      error: error.message
    });
  }
};


// DELETE PROJECT (PERMANENT DELETE)
export const deleteProject = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
      return;
    }

    const project = await Project.findByIdAndDelete(id);

    if (!project) {
      res.status(404).json({
        success: false,
        message: "Project not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Project permanently deleted successfully",
      data: {
        id: project._id,
        projectCode: project.projectCode
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to delete project",
      error: error.message
    });
  }
};
