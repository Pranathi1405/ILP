/**
 * AUTHORS: Preethi Deevanapelli,
 * categories Model
 * ================================
 * Database queries for the `categories` table.
 */

//insert category into categories table
export const insertCategory = `
  INSERT INTO categories
  (category_name, description, thumbnail, display_order)
  VALUES (?, ?, ?, ?)
`;

//find all categories from categories table
// Supports optional search by category_name
// Results should ideally be sorted by display_order
export const findAllCategories = `
  SELECT 
    category_id,
    category_name,
    description,
    thumbnail,
    display_order,
    is_active,
    created_at,
    updated_at
  FROM categories
  WHERE (? IS NULL OR category_name LIKE ?)
  ORDER BY display_order ASC
`;

// Fetch a single category using category_id
export const findCategoryById = `
  SELECT 
    category_id,
    category_name,
    description,
    thumbnail,
    display_order,
    is_active,
    created_at,
    updated_at
  FROM categories
  WHERE category_id = ?
`;


// Dynamically builds UPDATE query based on fields provided
export const updateCategoryById = (updates) => `
  UPDATE categories
  SET ${updates.join(", ")}
  WHERE category_id = ?
`;

//delete a category by id
export const deleteCategoryQuery = `
  DELETE FROM categories
  WHERE category_id = ?
`;

// Returns the highest display_order currently present
export const getMaxDisplayOrderQuery = `
  SELECT COALESCE(MAX(display_order), 0) AS maxOrder
  FROM categories
`;

// Shifts display order of categories downward
// Example:
// Before: 1,2,3
// Insert at 2
// After shift: 1,3,4
export const shiftDisplayOrderQuery = `
  UPDATE categories
  SET display_order = display_order + 1;
  WHERE display_order >= ?
`;

// Moves categories up when a category moves downward
// Example:
// Move category from position 2 → 5
// categories 3,4,5 shift up
export const shiftDisplayOrderDownQuery = `
  UPDATE categories
  SET display_order = display_order - 1
  WHERE display_order > ?
  AND display_order <= ?
`;

// Moves categories down when a category moves upward
// Example:
// Move category from position 5 → 2
// categories 2,3,4 shift down
export const shiftDisplayOrderUpQuery = `
  UPDATE categories
  SET display_order = display_order + 1
  WHERE display_order >= ?
  AND display_order < ?
`;

// Adjust display order after deleting a category
// All categories after deleted position shift up by 1
export const reorderCategoriesAfterDeleteQuery = `
  UPDATE categories
  SET display_order = display_order - 1
  WHERE display_order > ?
`;