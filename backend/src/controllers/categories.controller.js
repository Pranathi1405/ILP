/**
 * AUTHORS: Preethi Deevanapelli,
 * Categories Controller
 * ========================
 * Handles HTTP requests and responses for all categories endpoints.
 *
 * This layer ONLY:
 * - Reads from req (body, params, query, user)
 * - Calls the service layer
 * - Sends back the response
 *
 * NO business logic here. NO direct DB calls. Keep it thin.
 */


import categoryService from "../services/categories.service.js";

/**
 * POST /api/categories
 * create categories
 */
export const createCategory = async (req, res) => {
  try {
    const result = await categoryService.createCategory(req.body);

    res.status(201).json({
      success: true,
      message: "New category created",
      category_id: result.categoryId,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * GET /api/categories
 * get all categories
 */
export const getAllCategories = async (req, res) => {
  try {
    const categories = await categoryService.getAllCategories(req.query);

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * GET /api/categories/:id
 * get a category by id
 */
export const getCategoryById = async (req, res) => {
  try {
    const categoryId = Number(req.params.id);

    const category = await categoryService.getCategoryById(categoryId);

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * PATCH /api/categories/:id
 * update a category by id
 */
export const updateCategory = async (req, res) => {
  try {
    const categoryId = Number(req.params.id);

    const result = await categoryService.updateCategory(
      categoryId,
      req.body
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * DELETE /api/categories/:id
 * delete a category by id
 */
export const deleteCategory = async (req, res) => {
  try {
    const categoryId = Number(req.params.id);

    const result = await categoryService.deleteCategory(categoryId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};