//Author - Vamshi


import { getDashboardStats,
         getClasses,
         createLiveClass,
         getLiveClassById,
         updateLiveClass,
         deleteLiveClass,
         searchLiveClasses,
         getModulesBySubject,
         getSubjectsByCourse,
         getTeacherCourses,
         startClassService,
         resumeClassService,
         endClassService,
         cancelClassService,
         joinClassService,
         leaveClassService,
         getAttendanceService,
         generateTeacherBroadcastTokenService,
         getStudentClasses,
         getStudentLiveNow,
         getStudentDashboardStats,
         getTeacherReminderForUser
} from "../services/liveClass.service.js";

// ─── Dashboard Stats ───────────────────────────────────────────────
export const dashboardStats = async (req, res) => {
 
    try {
 
        const  user_id  = req.user.id;
 
        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "user_id is required"
            });
        }
 
        const data = await getDashboardStats(user_id);
 
        return res.status(200).json({
            success: true,
            data
        });
 
    } catch (error) {
 
        console.error(error);
 
        return res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard stats"
        });
 
    }
 
};
 
// ─── Classes (Upcoming / Past) ─────────────────────────────────────

export const classes = async (req, res) => {
 
    try {
 
           if (!req.user || !req.user.id) {
                return res.status(401).json({
                success: false,
                message: "Unauthorized"
                });
            }
        const user_id=req.user.id;
        const { type }    = req.query;
 
        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "user_id is required"
            });
        }
 
        if (!type || !["upcoming", "past"].includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Query param 'type' is required and must be 'upcoming' or 'past'"
            });
        }
 
        const data = await getClasses(user_id, type);
 
        return res.status(200).json({
            success: true,
            type,
            data
        });
 
    } catch (error) {
 
        console.error(error);
 
        return res.status(500).json({
            success: false,
            message: "Failed to fetch classes"
        });
 
    }
 
};

export const fetchTeacherCourses = async (req, res) => {

    try {

        const user_id = req.user.id;

        const courses = await getTeacherCourses(user_id);

        return res.status(200).json({
            success: true,
            message:"Courses fetched Successfully",
            data: courses
        });

    } catch (error) {

        console.error(error);

        if (error.message === "Teacher not found") {
            return res.status(403).json({
                success: false,
                message: "User is not a teacher"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to fetch courses"
        });
    }
};

export const fetchSubjectsByCourse = async (req, res) => {
    try {

        
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const user_id = req.user.id;
        const { course_id } = req.params;

        
        if (!course_id) {
            return res.status(400).json({
                success: false,
                message: "course_id is required"
            });
        }

        
        const subjects = await getSubjectsByCourse(course_id, user_id);

        if (!subjects.length) {
            return res.status(200).json({
                success: true,
                data: [],
                message: "No subjects found"
            });
        }

        return res.status(200).json({
            success: true,
            data: subjects
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch subjects"
        });

    }
};

export const fetchModulesBySubject = async (req, res) => {
    try {

        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const user_id = req.user.id;
        const { subject_id } = req.params;

        
        if (!subject_id) {
            return res.status(400).json({
                success: false,
                message: "subject_id is required"
            });
        }

        
        const modules = await getModulesBySubject(subject_id, user_id);

        if (!modules.length) {
            return res.status(200).json({
            success: true,
            data: [],
            message: "No modules found"
            });
       }

        return res.status(200).json({
            success: true,
            data: modules
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch modules"
        });

    }
};

export const scheduleLiveClass = async (req, res) => {

    try {

        const {
            course_id,
            subject_id,
            module_id,
            title,
            description,
            scheduled_start_time,
            scheduled_end_time,
            duration_minutes
        } = req.body;

        const user_id = req.user.id; //from JWT

        if (!course_id || !subject_id || !title || !scheduled_start_time || !duration_minutes) {
            return res.status(400).json({
                success: false,
                message: "course_id, subject_id, title, scheduled_start_time and duration_minutes are required"
            });
        }

        if (Number(duration_minutes) <= 0) {
            return res.status(400).json({
                success: false,
                message: "duration_minutes must be greater than 0"
            });
        }

        if (scheduled_end_time) {
            const start = new Date(scheduled_start_time);
            const end = new Date(scheduled_end_time);

            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid date format"
                });
            }

            if (start >= end) {
                return res.status(400).json({
                    success: false,
                    message: "End time must be after start time"
                });
            }
        }


        const result = await createLiveClass(req.body, user_id);

        return res.status(201).json({
            success: true,
            message: "Live class scheduled successfully",
            data: result
        });

    } catch (error) {

        console.error(error);

        //Clean error handling
        if (error.message === "UNAUTHORIZED_TEACHER") {
            return res.status(403).json({
                success: false,
                message: "User is not a teacher"
            });
        }

        if (error.message === "INVALID_SUBJECT") {
            return res.status(400).json({
                success: false,
                message: "Subject does not belong to course"
            });
        }

        if (error.message === "INVALID_MODULE") {
            return res.status(400).json({
                success: false,
                message: "Module does not belong to subject"
            });
        }

        if (error.message === "INVALID_DATETIME") {
            return res.status(400).json({
                success: false,
                message: "Invalid date format"
            });
        }

        if (error.message === "INVALID_TIME_RANGE") {
            return res.status(400).json({
                success: false,
                message: "End time must be after start time"
            });
        }


        return res.status(500).json({
            success: false,
            message: "Failed to schedule live class"
        });
    }
};



export const getLiveClassDetails = async (req, res) => {
    try {

        const user_id = req.user?.id;  
        const { id } = req.params;

        
        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

       
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "class id is required"
            });
        }

        const liveClass = await getLiveClassById(id, user_id);

        
        if (!liveClass) {
            return res.status(404).json({
                success: false,
                message: "Live class not found or access denied"
            });
        }

        return res.status(200).json({
            success: true,
            message:"Live Class Details fetched Successfully",
            data: liveClass
        });

    } catch (error) {

        console.error("Controller Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch class details"
        });

    }
};


export const editLiveClass = async (req, res) => {
    try {

        const user_id = req.user?.id;
        const { id } = req.params;

        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "class id is required"
            });
        }

        const {
            scheduled_start_time,
            scheduled_end_time
        } = req.body;

        //Time validation
        if (scheduled_start_time && scheduled_end_time) {

            const start = new Date(scheduled_start_time);
            const end   = new Date(scheduled_end_time);

            if (start >= end) {
                return res.status(400).json({
                    success: false,
                    message: "End time must be after start time"
                });
            }
        }

        const affectedRows = await updateLiveClass(id, user_id, req.body);

        if (!affectedRows) {
            return res.status(404).json({
                success: false,
                message: "Live class not found or access denied"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Live class updated successfully"
        });

    } catch (error) {

        console.error("Controller Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update live class"
        });

    }
};

export const removeLiveClass = async (req, res) => {
    try {

        const user_id = req.user?.id;
        const { id } = req.params;

        //Auth check
        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

       
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "class id is required"
            });
        }

        const affectedRows = await deleteLiveClass(id, user_id);

       //Not found OR not owner OR already deleted
        if (!affectedRows) {
            return res.status(404).json({
                success: false,
                message: "Live class not found, already deleted, or access denied"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Live class deleted successfully"
        });

    } catch (error) {

        console.error("Controller Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete live class"
        });

    }
};


export const searchClasses = async (req, res) => {

    try {

           if (!req.user || !req.user.id) {
                return res.status(401).json({
                success: false,
                message: "Unauthorized"
                });
            }

        const user_id = req.user.id;  
        const { q , type} = req.query;

        if (!q || q.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Search query 'q' is required"
            });
        }

         if (!type || !["upcoming", "past"].includes(type)) {
            return res.status(400).json({ 
                success: false, 
                message: "Query param 'type' must be 'upcoming' or 'past'" 
            });
        }

        const data = await searchLiveClasses(user_id, q.trim(),type);

        return res.status(200).json({
            success: true,
            query: q.trim(),
            count: data.length,
            data
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to search classes"
        });

    }

};










export const startClass = async (req, res) => {
    try {
        const data = await startClassService(req.params.id, req.user.id);
        return res.status(200).json({
            success: true,
            message: "Class started",
            data
        });
    } catch (e) {
        if (e.message === "CLASS_NOT_FOUND") {
            return res.status(404).json({ success: false, message: "Class not found" });
        }
        if (e.message === "UNAUTHORIZED" || e.message === "UNAUTHORIZED_TEACHER") {
            return res.status(403).json({ success: false, message: "Not allowed to start this class" });
        }
        if (e.message === "CLASS_ALREADY_LIVE") {
            return res.status(400).json({ success: false, message: "Class is already live" });
        }
        if (e.message === "CLASS_ALREADY_COMPLETED") {
            return res.status(400).json({ success: false, message: "Class is already completed" });
        }
        if (e.message === "CLASS_CANCELLED") {
            return res.status(400).json({ success: false, message: "Class is cancelled" });
        }
        if (e.message === "INVALID_CLASS_STATUS") {
            return res.status(400).json({ success: false, message: "Only scheduled classes can be started" });
        }

        return res.status(400).json({ success: false, message: e.message });
    }
};



export const resumeClass = async (req, res) => {
    try {
        const data = await resumeClassService(req.params.id, req.user.id);
        return res.status(200).json({
            success: true,
            message: "Class resumed",
            data
        });
    } catch (e) {
        if (e.message === "CLASS_NOT_FOUND") {
            return res.status(404).json({ success: false, message: "Class not found" });
        }
        if (e.message === "UNAUTHORIZED" || e.message === "UNAUTHORIZED_TEACHER") {
            return res.status(403).json({ success: false, message: "Not allowed to resume this class" });
        }
        if (e.message === "CLASS_ALREADY_LIVE") {
            return res.status(400).json({ success: false, message: "Class is already live" });
        }
        if (e.message === "CLASS_ALREADY_COMPLETED") {
            return res.status(400).json({ success: false, message: "Class is already completed" });
        }
        if (e.message === "CLASS_CANCELLED") {
            return res.status(400).json({ success: false, message: "Class is cancelled" });
        }
        if (e.message === "INVALID_CLASS_STATUS") {
            return res.status(400).json({ success: false, message: "Only scheduled classes can be resumed" });
        }

        return res.status(400).json({ success: false, message: e.message });
    }
};

export const generateTeacherBroadcastToken = async (req, res) => {
  try {
    const data = await generateTeacherBroadcastTokenService(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      message: "Broadcast token generated",
      data,
    });
  } catch (e) {
    return res.status(400).json({
      success: false,
      message: e.message,
    });
  }
};

export const endClass = async (req, res) => {
    try {
        await endClassService(req.params.id, req.user.id);
        return res.status(200).json({
            success: true,
            message: "Class ended",
            data: null
        });
    } catch (e) {
        return res.status(400).json({ success: false, message: e.message });
    }
};


export const cancelClass = async (req, res) => {
    try {
        await cancelClassService(req.params.id, req.user.id);
        return res.status(200).json({
            success: true,
            message: "Class cancelled",
            data: null
        });
    } catch (e) {
         if (e.message === "CLASS_NOT_FOUND") {
            return res.status(404).json({ success: false, message: "Class not found" });
        }
        if (e.message === "UNAUTHORIZED" || e.message === "UNAUTHORIZED_TEACHER") {
            return res.status(403).json({ success: false, message: "Not allowed to cancel this class" });
        }
        if (e.message === "CLASS_ALREADY_COMPLETED") {
            return res.status(400).json({ success: false, message: "Completed class cannot be cancelled" });
        }
        if (e.message === "CLASS_ALREADY_CANCELLED") {
            return res.status(400).json({ success: false, message: "Class is already cancelled" });
        }

        return res.status(400).json({ success: false, message: e.message });
    }
};


export const joinClass = async (req, res) => {
    try {
        const data = await joinClassService(req.params.id, req.user);
        return res.status(200).json({
            success: true,
            message: "Joined class",
            data
        });
    } catch (e) {
          if (e.message === "STUDENT_NOT_ENROLLED") {
            return res.status(403).json({
                success: false,
                message: "Student is not enrolled in this course"
            });
        }

        return res.status(400).json({ success: false, message: e.message });
    }
};


export const leaveClass = async (req, res) => {
    try {
        await leaveClassService(req.params.id, req.user.id);
        return res.status(200).json({
            success: true,
            message: "Left class",
            data: null
        });
    } catch (e) {
        return res.status(400).json({ success: false, message: e.message });
    }
};



export const getAttendance = async (req, res) => {
    try {
        const data = await getAttendanceService(req.params.id, req.user.id);

        return res.status(200).json({
            success: true,
            message: "Attendance fetched",
            data
        });
    } catch (e) {
        if (e.message === "CLASS_NOT_FOUND") {
            return res.status(404).json({ success: false, message: "Class not found" });
        }

        if (e.message === "UNAUTHORIZED" || e.message === "UNAUTHORIZED_TEACHER") {
            return res.status(403).json({ success: false, message: "You are not allowed to view attendance for this class" });
        }

        return res.status(400).json({ success: false, message: e.message });
    }
};


export const studentClasses = async (req, res) => {
 
    try {
 
           if (!req.user || !req.user.id) {
                return res.status(401).json({
                success: false,
                message: "Unauthorized"
                });
            }
        const user_id=req.user.id;
        const { type }    = req.query;
 
        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "user_id is required"
            });
        }
 
        if (!type || !["upcoming", "past"].includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Query param 'type' is required and must be 'upcoming' or 'past'"
            });
        }
 
        const data = await getStudentClasses(user_id, type);
 
        return res.status(200).json({
            success: true,
            type,
            data
        });
 
    } catch (error) {
 
        console.error(error);
 
        return res.status(500).json({
            success: false,
            message: "Failed to fetch student classes"
        });
 
    }
 
};







export const studentLiveNow = async (req, res) => {
 
    try {
 
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const user_id = req.user.id;
        const data = await getStudentLiveNow(user_id);
 
        return res.status(200).json({
            success: true,
            data
        });
 
    } catch (error) {
 
        console.error(error);
 
        return res.status(500).json({
            success: false,
            message: "Failed to fetch ongoing live class"
        });
 
    }
 
}






export const studentDashboardStats = async (req, res) => {
 
    try {
 
        const user_id = req.user.id;
 
        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "user_id is required"
            });
        }
 
        const data = await getStudentDashboardStats(user_id);
 
        return res.status(200).json({
            success: true,
            data
        });
 
    } catch (error) {
 
        console.error(error);
 
        return res.status(500).json({
            success: false,
            message: "Failed to fetch student dashboard stats"
        });
 
    }
 
};



export const getTeacherNextClassReminder = async (req, res, next) => {
  try {
    const data = await getTeacherReminderForUser(req.user);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};
