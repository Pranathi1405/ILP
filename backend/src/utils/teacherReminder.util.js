const createStatusError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parseStoredUtcDateTime = (value) => {
  if (value instanceof Date) {
    return value;
  }

  const normalized = String(value).trim();

  const parsedDate = new Date(normalized);

  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  const fallbackValue = normalized.includes(" ")
    ? `${normalized.replace(" ", "T")}Z`
    : normalized;

  const fallbackDate = new Date(fallbackValue);

  if (Number.isNaN(fallbackDate.getTime())) {
    throw createStatusError(500, "Invalid live class schedule found in storage.");
  }

  return fallbackDate;
};

const generateRelativeMinutes = (targetDate, now = new Date()) => {
  const diffMs = targetDate.getTime() - now.getTime();
  const diffMinutes = diffMs / (60 * 1000);

  return diffMinutes >= 0 ? Math.ceil(diffMinutes) : Math.floor(diffMinutes);
};

const formatStartsInLabel = (status, startsInMinutes) => {
  if (status === "live") {
    return "Live now";
  }

  if (startsInMinutes === 0) {
    return "Starting now";
  }

  if (startsInMinutes > 0) {
    return `Starts in ${startsInMinutes} min`;
  }

  return `${Math.abs(startsInMinutes)} min overdue`;
};

export const selectTeacherReminderClass = (classes) => {
  const now = new Date();

  const liveClass = classes.find((item) => item.status === "live");
  if (liveClass) {
    return liveClass;
  }

  const scheduledClasses = classes.filter((item) => item.status === "scheduled");

  const upcomingScheduled = scheduledClasses
    .filter((item) => parseStoredUtcDateTime(item.scheduled_start_time) >= now)
    .sort(
      (a, b) =>
        parseStoredUtcDateTime(a.scheduled_start_time).getTime() -
        parseStoredUtcDateTime(b.scheduled_start_time).getTime()
    );

  if (upcomingScheduled.length) {
    return upcomingScheduled[0];
  }

  const overdueScheduled = scheduledClasses
    .filter((item) => parseStoredUtcDateTime(item.scheduled_start_time) < now)
    .sort(
      (a, b) =>
        parseStoredUtcDateTime(b.scheduled_start_time).getTime() -
        parseStoredUtcDateTime(a.scheduled_start_time).getTime()
    );

  return overdueScheduled[0] || null;
};

export const buildTeacherReminderPayload = (liveClass) => {
  if (!liveClass) {
    return {
      has_reminder: false,
      next_class: null,
    };
  }

  const startDate = parseStoredUtcDateTime(liveClass.scheduled_start_time);
  const startsInMinutes =
    liveClass.status === "live" ? 0 : generateRelativeMinutes(startDate);

  const reminderState =
    liveClass.status === "live"
      ? "live"
      : startsInMinutes < 0
        ? "overdue"
        : "upcoming";

  return {
    has_reminder: true,
    next_class: {
      ...liveClass,
      reminder_state: reminderState,
      is_live: liveClass.status === "live",
      is_overdue: reminderState === "overdue",
      can_go_live: ["scheduled", "live"].includes(liveClass.status),
      starts_in_minutes: startsInMinutes,
      starts_in_label: formatStartsInLabel(liveClass.status, startsInMinutes),
      go_live_endpoint: `/api/live-classes/${liveClass.class_id}/start`,
    },
  };
};
