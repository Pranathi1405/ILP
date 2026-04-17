/**
 * AUTHORS: Preethi Deevanapelli
 * Category Service
 *
 * This service handles all business logic related to categories including:
 * - Creating categories with correct display order
 * - Fetching categories
 * - Updating category details and display order
 * - Deleting categories and maintaining order consistency
 *
 */

import  pool  from "../config/database.config.js";
import {
  deleteCategoryQuery,
  findAllCategories,
  findCategoryById,
  getMaxDisplayOrderQuery,
  insertCategory,
  reorderCategoriesAfterDeleteQuery,
  shiftDisplayOrderDownQuery,
  shiftDisplayOrderQuery,
  shiftDisplayOrderUpQuery,
  updateCategoryById,
} from "../models/categories.model.js";

/* ================================
   CREATE CATEGORY
================================ */
export const createCategory = async (categoryData = {}) => {
  const connection = await pool.getConnection();

  try {
    const {
      categoryName,
      description = null,
      thumbnail = null,
      displayOrder = null,
    } = categoryData;

    // Validate category name
    // Category name is mandatory and cannot be empty
    if (!categoryName || !categoryName.trim()) {
      throw { status: 400, message: "Category name is required" };
    }
    
    // Validate displayOrder type if provided
    // displayOrder must be a numeric value
    if (displayOrder !== null && typeof displayOrder !== "number") {
      throw { status: 400, message: "displayOrder must be a number" };
    }

    // Prevent invalid ordering
    // Display order must always be greater than 0
    if(displayOrder !== null && displayOrder <= 0)
        throw {status: 400, message:"Display order must be greater than 0"};

    await connection.beginTransaction();

    // Fetch the current maximum display order
    // This helps determine where the new category should be placed
    const [orderResult] = await connection.execute(getMaxDisplayOrderQuery);
    const maxOrder = orderResult[0].maxOrder

    let finalOrder;

    // Determine the final display order
    // If no displayOrder provided → add category at the end
    if(!displayOrder) {

      finalOrder = maxOrder + 1;

    } else {

      // If provided displayOrder exceeds maximum possible order
      // place the category at the end
      if (displayOrder > maxOrder + 1) {

        finalOrder = maxOrder + 1;

      } else {

        finalOrder = displayOrder;

        // shift all categories from that position down by 1
        // to create space for the new category
        await connection.execute(shiftDisplayOrderQuery, [displayOrder]);
      }
    }

    // Insert new category with calculated display order
    const [result] = await connection.execute(insertCategory, [
      categoryName.trim(),
      description?.trim() || null,
      thumbnail?.trim() || null,
      finalOrder,
    ]);

    await connection.commit();

    return { categoryId: result.insertId };
  } catch (error) {
    await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      throw { status: 400, message: "Category name already exists" };
    }

    throw error;
  } finally {
    connection.release();
  }
};

/* ================================
   GET ALL
================================ */
export const getAllCategories = async (query) => {
  let {search} = query;
  let searchValue = null;

  // Add wildcard search for partial matching
  // Example: "math" → "%math%"
  if (search) {
    searchValue = `%${search.trim()}%`;
  }
  const [rows] = await pool.execute(findAllCategories, [searchValue, searchValue]);
  
  return rows;
};

/* ================================
   GET BY ID
================================ */
export const getCategoryById = async (categoryId) => {

  // Validate category ID
  // ID must be a positive integer
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw { status: 400, message: "Invalid category ID" };
  }

  const [rows] = await pool.execute(findCategoryById, [categoryId]);

  if (rows.length === 0) {
    throw { status: 404, message: "Category not found" };
  }

  return rows[0];
};

/* ================================
   UPDATE CATEGORY
================================ */
export const updateCategory = async (categoryId, data = {}) => {
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw { status: 400, message: "Invalid category ID" };
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const {
      categoryName,
      description,
      thumbnail,
      displayOrder,
    } = data;

    const [orderResult] = await connection.execute(getMaxDisplayOrderQuery);
    let maxOrder = orderResult[0].maxOrder;

    const [categoryRows] = await connection.execute(findCategoryById, [categoryId]);

    if (!categoryRows.length) {
      throw { status: 404, message: "Category not found" };
    }

    // Fetch current display order of the category
    // Required to determine if reordering is needed
    const oldOrder = categoryRows[0].display_order;

    let newOrder = oldOrder;

    if (displayOrder !== undefined) {
      const parsedOrder = parseInt(displayOrder);
      if (isNaN(parsedOrder) || parsedOrder <= 0) {
        throw {status: 400, message:"Invalid display order"};
      }
      
      newOrder = parsedOrder;
    }

    if (newOrder > maxOrder + 1) 
      newOrder = maxOrder;

    // If display order changes, adjust other categories accordingly
    if(newOrder !== oldOrder) {

      if (newOrder > oldOrder) {

        // When moving category to a larger position
        // Example: order 2 → 5
        // categories 3,4,5 move up
        await connection.execute(
          shiftDisplayOrderDownQuery, 
          [oldOrder, newOrder]
        );

      } else if (newOrder < oldOrder) {

        // When moving category to a smaller position
        // Example: order 5 → 2
        // categories 2,3,4 move down
        await connection.execute (
          shiftDisplayOrderUpQuery,
          [newOrder, oldOrder]
        );
      }
    }

    // Build update query dynamically
    // Only fields provided in request body will be updated
    const updates = [];
    const values = [];


    if (categoryName !== undefined) {
      if (!categoryName.trim()) {
        throw { status: 400, message: "Invalid categoryName" };
      }
      updates.push("category_name = ?");
      values.push(categoryName.trim());
    }

    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description?.trim() || null);
    }

    if (thumbnail !== undefined) {
      updates.push("thumbnail = ?");
      values.push(thumbnail?.trim() || null);
    }

    if (newOrder !== oldOrder) {
      updates.push("display_order = ?");
      values.push(newOrder);
    }

    if (updates.length === 0) {
      throw { status: 400, message: "No fields provided to update" };
    }

    const [result] = await connection.execute(
      updateCategoryById(updates),
      [...values, categoryId]
    );

    if (result.affectedRows === 0) {
      throw { status: 404, message: "Category not found" };
    }

    await connection.commit();

    return { message: "Category updated successfully" };
  } catch (error) {
    await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      throw { status: 400, message: "Category name already exists" };
    }

    throw error;
  } finally {
    connection.release();
  }
};

/* ================================
   DELETE CATEGORY
================================ */
export const deleteCategory = async (categoryId) => {
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw { status: 400, message: "Invalid category ID" };
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Retrieve category to get its display order
    // Required to reorder remaining categories after deletion
    const [categoryRows] = await connection.execute(findCategoryById, [categoryId]);

    if (!categoryRows.length) {
      throw {status: 404, message:"Category not found"};
    }

    const displayOrder = categoryRows[0].display_order;

    const [result] = await connection.execute(deleteCategoryQuery, [
      categoryId,
    ]);

    // Reorder remaining categories
    // All categories with order greater than deleted category
    // will shift up by 1    
    await connection.execute(
      reorderCategoriesAfterDeleteQuery,
      [displayOrder]
    );
    
    await connection.commit();

    return { message: "Category deleted successfully" };
    
  } catch (error) {

    await connection.rollback();
    throw error;

  } finally {
    connection.release();
  }
};

export default {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};