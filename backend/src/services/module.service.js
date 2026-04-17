/**
 * AUTHORS: Preethi Deevanapelli,
 * Modules Service     
 * */
import pool from "../config/database.config.js";
import { 
  checkModuleExistsQuery, 
  checkSubjectExistsQuery, 
  countModulesQuery, 
  deleteModuleByIdQuery, 
  fixNewSubjectOrdering, 
  fixOldSubjectOrdering, 
  getAllModulesQuery, 
  getMaxDisplayOrderQuery, 
  getModuleByIdQuery, 
  insertModuleQuery, 
  reorderModulesAfterDeleteQuery, 
  shiftDisplayOrderDownQuery, 
  shiftDisplayOrderUpQuery, 
  updateModuleByIdQuery 
} from "../models/module.model.js";


/**
 * CREATE MODULE
 */
export const createModuleService = async (data) => {

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const {
      subjectId,
      moduleName,
      moduleDescription,
      displayOrder,
      isPublished = false
    } = data;
  
  
    //Input Validation
   
    if (!subjectId) {
      throw { status: 400, message: "subjectId is required" };
    }

    const parsedSubjectId = parseInt(subjectId);

    if (isNaN(parsedSubjectId) || parsedSubjectId <= 0) {
      throw { status: 400, message: "Invalid subjectId" };
    }

    if (!moduleName || moduleName.trim() === "") {
      throw { status: 400, message: "Module name is required" };
    }
  
    const trimmedName = moduleName.trim();

    if (trimmedName.length > 255) {
      throw { status: 400, message: "Module name exceeds 255 characters" };
    }
  
    let parsedOrder = displayOrder !== undefined ? parseInt(displayOrder) : undefined;
    if (displayOrder !== undefined) {
      if (isNaN(parsedOrder) || parsedOrder < 1) {
        throw { status: 400, message: "displayOrder must be a positive number" };
      }
    }
  
    if (moduleDescription && moduleDescription.length > 1000) {
      throw { status: 400, message: "Description too long" };
    }

    //Check Subject Exists

    const [subject] = await connection.execute(
      checkSubjectExistsQuery,
      [subjectId]
    );

    if (subject.length === 0) {
      throw { status: 404, message: "Subject not found" };
    }

    //Determine Display Order

    const [orderResult] = await connection.execute(
      getMaxDisplayOrderQuery,
      [subjectId]
    );

    const maxOrder = orderResult[0].maxOrder;

    let finalOrder;

    if (displayOrder === undefined) {
      finalOrder = maxOrder + 1;
    } else {
      if (parsedOrder > maxOrder + 1) {
        finalOrder = maxOrder + 1;
      } else {
        finalOrder = parsedOrder;

        /* Moving up */
        await connection.execute(
          shiftDisplayOrderUpQuery,
          [subjectId, finalOrder, maxOrder + 1]
        );
      }
    }

    //Insert Module

    const [result] = await connection.execute(
      insertModuleQuery,
      [
        subjectId,
        trimmedName,
        moduleDescription || null,
        finalOrder,
        isPublished
      ]
    );

    await connection.commit();

    return {
      moduleId: result.insertId
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

};

/**
 * GET ALL MODULES
 */
export const getAllModulesService = async (query) => {

  let {
    page = 1,
    limit = 10,
    search,
    subjectId,
    sortBy = "display_order",
    order = "ASC"
  } = query;

  page = parseInt(page);
  limit = parseInt(limit);

  if (isNaN(page) || page <= 0) throw {status: 400 , message: "Invalid page number"};
  if (isNaN(limit) || limit <= 0) throw {status: 400 , message: "Invalid limit value"};

  const offset = (page - 1) * limit;

  let sql = getAllModulesQuery;
  let countSql = countModulesQuery;

  let conditions = [];
  let params = [];
  let countParams = [];

  // search
  if (search) {
    conditions.push("module_name LIKE ?");
    params.push(`%${search}%`);
    countParams.push(`%${search}%`);
  }

  // filter by subject
  if (subjectId) {
    conditions.push("subject_id = ?");
    params.push(subjectId);
    countParams.push(subjectId);
  }

  // apply conditions
  if (conditions.length > 0) {
    const whereClause = " WHERE " + conditions.join(" AND ");
    sql += whereClause;
    countSql += whereClause;
  }

  // allowed sorting fields
  const allowedSortFields = [
    "created_at",
    "module_name",
    "display_order"
  ];

  if (!allowedSortFields.includes(sortBy)) {
    sortBy = "display_order";
  }

  order = order.toUpperCase() === "DESC" ? "DESC" : "ASC";

  sql += ` ORDER BY ${sortBy} ${order} LIMIT ${limit} OFFSET ${offset}`;

  const [modules] = await pool.execute(sql, params);
  const [countResult] = await pool.execute(countSql, countParams);

  const total = countResult[0].total;

  return {
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    modules
  };

};

/**
 * GET MODULE BY ID
 */
export const getModuleByIdService = async (moduleId) => {

  // Edge Case 1: moduleId missing
  if (moduleId === undefined || moduleId === null) {
    throw {status: 400, message: "Module ID is required"};
  }

  // Edge Case 2: Invalid moduleId
  if (isNaN(moduleId)) {
    throw {status: 400, message: "Invalid Module ID"};
  }

  const [rows] = await pool.execute(getModuleByIdQuery, [moduleId]);

  // Edge Case 3: Module not found
  if (!rows || rows.length === 0) {
    throw {
      status: 404,
      message: "Module not found"
    };
  }

  return rows[0];
};

/**
 * UPDATE MODULE BY ID
 */
export const updateModuleByIdService = async (moduleId, body) => {

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    if (!moduleId) {
      throw {status: 400 , message: "Module ID is required"};
    }
  
    const parsedId = parseInt(moduleId);
  
    if (isNaN(parsedId) || parsedId <= 0) {
      throw {status: 400 , message: "Invalid Module ID"};
    }
  
    const { subjectId, moduleName, moduleDescription, displayOrder, isPublished } = body;
  
    if (
      subjectId === undefined &&
      moduleName === undefined &&
      moduleDescription === undefined &&
      displayOrder === undefined &&
      isPublished == undefined
    ) {
      throw {status: 400 , message: "At least one field is required to update"};
    }
  
    /* Get existing module */
    const [moduleRows] = await connection.execute(getModuleByIdQuery, [parsedId]);
  
    if (!moduleRows.length) {
      throw {status: 404 , message: "Module not found"};
    }
  
    const existing = moduleRows[0];
  
    const oldSubjectId = existing.subject_id;
    const oldOrder = existing.display_order;
    const oldPublishedStatus = existing.is_published;

    if(oldPublishedStatus === 1){
      throw {status: 400, message: "cannot republish or draft a published module"};
    }
    
    /* Determine new subject */
    let newSubjectId = oldSubjectId;
  
    if (subjectId !== undefined) {
      const parsedSubjectId = parseInt(subjectId);
  
      if (isNaN(parsedSubjectId) || parsedSubjectId <= 0) {
        throw {status: 400 , message: "Invalid subject ID"};
      }
  
      const [subjectRows] = await connection.execute(
        checkSubjectExistsQuery,
        [parsedSubjectId]
      );
  
      if (!subjectRows.length) {
        throw {status: 404 , message: "Subject not found"};
      }
  
      newSubjectId = parsedSubjectId;
    }
  
    /* Determine new order */
    let newOrder = oldOrder;
  
    if (displayOrder !== undefined) {
      const parsedOrder = parseInt(displayOrder);
  
      if (isNaN(parsedOrder) || parsedOrder <= 0) {
        throw {status: 400 , message: "Invalid display order"};
      }
  
      newOrder = parsedOrder;
    }
  
    /* Get max order of new subject */
    const [maxResult] = await connection.execute(
      getMaxDisplayOrderQuery,
      [newSubjectId]
    );
  
    let maxOrder = maxResult[0].maxOrder;
  
    /* if same subject, exclude current module */
    if (newSubjectId === oldSubjectId) {
      maxOrder = Math.max(0, maxOrder - 1);
    }
  
    if (newOrder > maxOrder + 1) {
      newOrder = maxOrder + 1;
    }
  
    /* ---------------- ORDERING LOGIC ---------------- */
  
    if (newSubjectId !== oldSubjectId) {
  
      /* Fix old subject ordering */
      await connection.execute(
        fixOldSubjectOrdering,
        [oldSubjectId, oldOrder]
      );
  
      /* Create space in new subject */
      await connection.execute(
        fixNewSubjectOrdering,
        [newSubjectId, newOrder]
      );
  
    } else if (newOrder !== oldOrder) {
  
      if (newOrder > oldOrder) {
  
        /* Moving down */
        await connection.execute(
          shiftDisplayOrderDownQuery,
          [oldSubjectId, oldOrder, newOrder]
        );
  
      } else {
  
        /* Moving up */
        await connection.execute(
          shiftDisplayOrderUpQuery,
          [oldSubjectId, newOrder, oldOrder]
        );
      }
    }
  
    /* ---------------- FIELD UPDATE ---------------- */
  
    let fields = [];
    let values = [];
  
    if (moduleName !== undefined) {
      const trimmed = moduleName.trim();

      if (typeof moduleName !== "string" || trimmed === "") {
        throw {status: 400 , message: "Invalid module Name"};
      }
      if (trimmed.length > 255) {
        throw { status: 400, message: "Module name exceeds 255 characters" };
      }

      fields.push("module_name = ?");
      values.push(trimmed);
    }
  
    if (moduleDescription !== undefined) {
      if (moduleDescription !== null && typeof moduleDescription !== "string") {
        throw { status: 400, message: "Invalid description" };
      }

      fields.push("description = ?");
      values.push(moduleDescription?.trim() || null);
    }

    if (newSubjectId !== oldSubjectId) {
      fields.push("subject_id = ?");
      values.push(newSubjectId);
    }
  
    if (newOrder !== oldOrder) {
      fields.push("display_order = ?");
      values.push(newOrder);
    }

    if (isPublished === 1) {
      fields.push("is_published = ?");
      values.push(1);
    }
  
    if (!fields.length) {
       throw { status: 400, message: "No valid fields provided for update" };
    }
  
    const sql = `
      UPDATE subject_modules
      SET ${fields.join(", ")}
      WHERE module_id = ?
    `;
  
    values.push(parsedId);
  
    const [result] = await connection.execute(sql, values);
  
    if (!result.affectedRows) {
      throw {status: 400 , message: "Failed to update module"};
    }
  
    await connection.commit();

    return { moduleId: parsedId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * DELETE MODULE BY ID
 */
export const deleteModuleByIdService = async (moduleId) => {

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    /* ---------------- VALIDATE MODULE ID ---------------- */
  
    if (!moduleId) {
      throw {status: 400 , message: "Module ID is required"};
    }
  
    const parsedId = parseInt(moduleId);
  
    if (isNaN(parsedId) || parsedId <= 0) {
      throw {status: 400 , message: "Invalid module ID"};
    }
  
    /* ---------------- CHECK MODULE EXISTS ---------------- */
  
    const [moduleRows] = await connection.execute(
      getModuleByIdQuery,
      [parsedId]
    );
  
    if (!moduleRows.length) {
      throw {status: 404 , message: "Module not found"};
    }
  
    const module = moduleRows[0];
  
    const subjectId = module.subject_id;
    const displayOrder = module.display_order;
  
    /* ---------------- DELETE MODULE ---------------- */
  
    const [deleteResult] = await connection.execute(
      deleteModuleByIdQuery,
      [parsedId]
    );
  
    if (!deleteResult.affectedRows) {
      throw {status: 400 , message: "Failed to delete module"};
    }
  
    /* ---------------- FIX DISPLAY ORDER ---------------- */
  
    await connection.execute(
      reorderModulesAfterDeleteQuery,
      [subjectId, displayOrder]
    );
  
    await connection.commit();

    return {
      moduleId: parsedId,
      deleted: true
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};