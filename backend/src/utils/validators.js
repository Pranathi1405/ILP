export const emailRegex =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;

export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]{8,}$/;

export const phoneRegex =
  /^(\+91[\-\s]?)?[6-9]\d{9}$/;

// Student Link Code (Example: STU-A8F9K2)
// export const linkCodeRegex =
//   /^STU-[A-Z0-9]{6}$/;


// OTP Validation (6 digit number)
export const otpRegex =
  /^\d{6}$/;
