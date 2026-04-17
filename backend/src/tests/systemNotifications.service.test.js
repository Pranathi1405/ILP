import { jest } from "@jest/globals";

/* ---------------- MOCKS ---------------- */

const sendToUsersMock = jest.fn();
const getAllAdminUserIdsMock = jest.fn();

jest.unstable_mockModule("../services/notification.service.js", () => ({
  sendToUsers: sendToUsersMock
}));

jest.unstable_mockModule("../models/targetResolution.model.js", () => ({
  getAllAdminUserIds: getAllAdminUserIdsMock
}));

const notifications = await import("../services/systemNotifications.service.js");

/* ---------------- TEST SUITE ---------------- */

describe("System Notifications Service", () => {

  beforeEach(() => {
    sendToUsersMock.mockClear();
    getAllAdminUserIdsMock.mockClear();
  });

  /* ---------------- STUDENT + TEACHER TESTS ---------------- */

  const directUserTests = [

    /* STUDENT */

    ["notifyStudentCourseEnrollment",[10,5,"Node Course"],"enrollment",5],
    ["notifyStudentNewCourseInStream",[10,5,"Node Course","John"],"course",5],
    ["notifyStudentCourseAssignedByAdmin",[10,7,"Python"],"course",7],
    ["notifyStudentNewContentAdded",[10,7,"Node","Async"],"course",7],
    ["notifyStudentCourseCompletionReminder",[10,5,"Node",60],"course",5],
    ["notifyStudentCertificateReady",[10,5,"Node"],"achievement",5],
    ["notifyStudentTestScheduled",[10,2,"Midterm","12 Mar"],"test",2],
    ["notifyStudentTestReminder",[10,2,"Midterm","Tomorrow"],"test",2],
    ["notifyStudentTestSubmissionSuccessful",[10,2,"Midterm"],"test",2],
    ["notifyStudentLiveClassScheduled",[10,11,"Math","3PM"],"live_class",11],
    ["notifyStudentDoubtPosted",[10,20,"Async Await"],"doubt",20],
    ["notifyStudentAchievementEarned",[10,3,"Quiz Master"],"achievement",3],
    ["notifyStudentPaymentSuccessful",[10,50,2999,"Node"],"payment",50],
    ["notifyStudentSubscriptionActivated",[10,100,"Pro","2027"],"payment",100],
    ["notifyStudentNewAnnouncement",[10,12,"Holiday"],"announcement",12],
    ["notifyStudentProfileUpdated",[10],"system",null],
    ["notifyStudentPasswordChanged",[10],"system",null],

    /* TEACHER */

    ["notifyTeacherRegistrationPending",[20],"system",null],
    ["notifyTeacherAccountApproved",[20],"system",null],
    ["notifyTeacherAccountRejected",[20,"Incomplete Docs"],"system",null],
    ["notifyTeacherSubjectAssigned",[20,7,"Math"],"course",7],
    ["notifyTeacherCourseAssigned",[20,5,"Node"],"course",5],
    ["notifyTeacherNewDoubtPosted",[20,11,"Async","John","Node"],"doubt",11],
    ["notifyTeacherDoubtDeadlineApproaching",[20,11,"Async","Today"],"doubt",11],
    ["notifyTeacherDoubtUnresolvedLong",[20,11,"Async",3],"doubt",11],
    ["notifyTeacherDoubtClosedByStudent",[20,11,"Async","John"],"doubt",11],
    ["notifyTeacherTestSubmissionDeadlineReached",[20,4,"Midterm","Node"],"test",4],
    ["notifyTeacherSuspiciousTestActivity",[20,4,"Midterm","John"],"test",4],
    ["notifyTeacherLiveClassScheduled",[20,9,"React","4PM"],"live_class",9],
    ["notifyTeacherLiveClassReminder",[20,9,"React","4PM"],"live_class",9],
    ["notifyTeacherBulkOperationCompleted",[20,"Import",200],"system",null],
    ["notifyTeacherNewAdminAnnouncement",[20,15,"Policy"],"announcement",15],
    ["notifyTeacherMaintenanceScheduled",[20,"15 Mar","Upgrade"],"system",null]

  ];

  test.each(directUserTests)(
    "%s should call sendToUsers",
    async (fn,args,type,relatedId) => {

      await notifications[fn](...args);

      expect(sendToUsersMock).toHaveBeenCalled();

      const [userIds,payload] = sendToUsersMock.mock.calls[0];

      expect(userIds).toEqual([args[0]]);
      expect(payload.notification_type).toBe(type);

      if(relatedId!==null){
        expect(payload.related_id).toBe(relatedId);
      }

    }
  );


  /* ---------------- ADMIN TESTS ---------------- */

  const adminTests = [

    ["notifyAdminNewTeacherRegistration",[99,"Alice"],"system",99],
    ["notifyAdminTeacherApprovalRequired",[99,"Alice",12],"system",99],
    ["notifyAdminNewStudentRegistration",[50,"Bob"],"system",50],
    ["notifyAdminSuspiciousAccountActivity",[50,"Bob","Multiple logins"],"system",50],
    ["notifyAdminPaymentDisputeRaised",[77,2000,"Bob"],"payment",77],
    ["notifyAdminLargeTransactionAlert",[77,50000,"Bob"],"payment",77],
    ["notifyAdminBulkImportCompleted",["Student Import",200,5],"system",null],
    ["notifyAdminScheduledJobFailed",["cronJob","DB error"],"system",null],
    ["notifyAdminSystemErrorDetected",["Server crash","Payment service"],"system",null],
    ["notifyAdminHighSystemLoad",[92,"Server1"],"system",null]

  ];

  test.each(adminTests)(
    "%s should notify all admins",
    async (fn,args,type,relatedId) => {

      getAllAdminUserIdsMock.mockResolvedValue([1,2,3]);

      await notifications[fn](...args);

      expect(sendToUsersMock).toHaveBeenCalled();

      const [adminIds,payload] = sendToUsersMock.mock.calls[0];

      expect(adminIds).toEqual([1,2,3]);
      expect(payload.notification_type).toBe(type);

      if(relatedId!==null){
        expect(payload.related_id).toBe(relatedId);
      }

    }
  );

});