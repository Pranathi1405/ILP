/**
 * AUTHORS: Preethi Deevanapelli,
 * Modules Controller
 * ========================
 * Handles HTTP requests and responses for all module endpoints.
 *
 * This layer ONLY:
 * - Reads from req (body, params, query, user)
 * - Calls the service layer
 * - Sends back the response
 *
 * NO business logic here. NO direct DB calls. Keep it thin.
 */

import { createModuleService, deleteModuleByIdService, getAllModulesService, getModuleByIdService, updateModuleByIdService } from "../services/module.service.js";

/**
 * POST /api/modules
 * create modules
 */
export const createModuleController = async (req, res) => {

  try {

    const result = await createModuleService(req.body);

    return res.status(201).json({
      success: true,
      message: "Module created successfully",
      moduleId: result.moduleId
    });

  } catch (error) {

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });

  }
};

/**
 * get all modules
 * GET /api/modules
 * GET /api/modules?search=
 * GET /api/modules?limit=
 * GET /api/modules?page=2
 * GET /api/modules?sortBy=display_order
 * GET /api/modules?order=ASC
 * GET /api/modules?subject_id=1
 */
export const getAllModulesController = async (req, res) => {

  try {

    const result = await getAllModulesService(req.query);

    return res.status(200).json({
      success: true,
      pagination: result.pagination,
      data: result.modules,
    });

  } catch (error) {

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });

  }

};

/**
 * GET /api/modules/:id
 * get module by id
 */
export const getModuleByIdController = async (req, res) => {

  try {

    const  moduleId  = req.params.id;

    const module = await getModuleByIdService(moduleId);

    return res.status(200).json({
      success: true,
      message: "Module fetched successfully",
      data: module
    });

  } catch (error) {

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });

  }

};

/**
 * UPDATE /api/modules/:id
 * update module by id
 */
export const updateModuleByIdController = async (req, res) => {

  try {

    const moduleId  = req.params.id;
    const data = req.body;

    const result = await updateModuleByIdService(moduleId, data);

    return res.status(200).json({
      success: true,
      message: "Module updated successfully",
      data: result
    });

  } catch (error) {

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });

  }

};

/**
 * DELETE /api/modules/:id
 * delete module by id
 */
export const deleteModuleByIdController = async (req, res) => {

  try {

    const  moduleId  = req.params.id;

    const result = await deleteModuleByIdService(moduleId);

    return res.status(200).json({
      success: true,
      message: "Module deleted successfully",
      data: result
    });

  } catch (error) {

    return res.status(400).json({
      success: false,
      message: error.message
    });

  }
};