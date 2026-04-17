//Author : Sathvik Goli
//Queries that are used for making profile changes

export const CHANGE_PASSWORD = `
    UPDATE users SET password_hash = ? where user_id = ?
`

export const CHECK_CURRENT_PASSWORD = `
    SELECT password_hash FROM users WHERE user_id = ?
`

export const UPDATE_MY_PROFILE = `
  UPDATE users
  SET first_name = COALESCE(?, first_name),
      last_name  = COALESCE(?, last_name),
      phone = COALESCE(?, phone)
  WHERE user_id = ?;
`;

export const CHANGE_GRADE_SECTION = `
    UPDATE students 
    SET grade_level = COALESCE(?, grade_level),
        section = COALESCE(?, section)
    where user_id = ?
`
export const ADD_NEW_CHILD = `
    INSERT INTO parent_student_relationship
    (parent_id, student_id, relationship_type)
  VALUES (?, ?, ?)
`

export const GET_STUDENTID_BY_LINKCODE = `
    SELECT student_id from students where parent_link_code = ?
`

export const CHANGE_EMAIL = `
    UPDATE users SET email = ? where user_id = ?
`
export const GET_PARENTID = `
    SELECT parent_id FROM parents WHERE user_id = ?
`

export const GET_MY_PROFILE = `
    SELECT first_name, last_name, phone, email FROM users WHERE user_id = ?
`