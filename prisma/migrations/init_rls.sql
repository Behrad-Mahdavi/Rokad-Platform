-- Row Level Security (RLS) Policies for Rokad Platform
-- Layer 2 Multi-Tenant Defense in Depth (Phase 1, 2, 3, 4, 5, 6)

-- 1. Enable RLS on Tenant-bound tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RefreshTokenFamily" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantFeatureFlag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Phase 2 Tables
ALTER TABLE "AcademicYear" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Term" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EducationalLevel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudyField" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Classroom" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassEnrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassSchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SchoolRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserSchoolRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CoachProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StaffProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ParentProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ParentStudentLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileBlog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SchoolProfile" ENABLE ROW LEVEL SECURITY;

-- Phase 3 Tables
ALTER TABLE "StudentAttendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherAttendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Homework" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HomeworkSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SchoolEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Poll" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PollVote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ParentVisitSlot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ParentVisitBooking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DisciplinaryMatter" ENABLE ROW LEVEL SECURITY;

-- Phase 4 Tables
ALTER TABLE "LessonPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuestionCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Question" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Exam" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExamClassroom" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExamParticipation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GradeEntry" ENABLE ROW LEVEL SECURITY;

-- Phase 5 Tables
ALTER TABLE "CourseMaterial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MaterialClassroom" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatChannel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatChannelMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;

-- Phase 6 Tables
ALTER TABLE "StudentFeeContract" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeeInstallment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeeReceipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StaffPayrollProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayrollSlip" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayrollItem" ENABLE ROW LEVEL SECURITY;

-- 2. Force RLS for all table owners (prevents bypass)
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "RefreshTokenFamily" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TenantFeatureFlag" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AcademicYear" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Term" FORCE ROW LEVEL SECURITY;
ALTER TABLE "EducationalLevel" FORCE ROW LEVEL SECURITY;
ALTER TABLE "StudyField" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Lesson" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Classroom" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ClassEnrollment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ClassSchedule" FORCE ROW LEVEL SECURITY;
ALTER TABLE "SchoolRole" FORCE ROW LEVEL SECURITY;
ALTER TABLE "UserSchoolRole" FORCE ROW LEVEL SECURITY;
ALTER TABLE "StudentProfile" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TeacherProfile" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CoachProfile" FORCE ROW LEVEL SECURITY;
ALTER TABLE "StaffProfile" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ParentProfile" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ParentStudentLink" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ProfileBlog" FORCE ROW LEVEL SECURITY;
ALTER TABLE "SchoolProfile" FORCE ROW LEVEL SECURITY;

ALTER TABLE "StudentAttendance" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TeacherAttendance" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Homework" FORCE ROW LEVEL SECURITY;
ALTER TABLE "HomeworkSubmission" FORCE ROW LEVEL SECURITY;
ALTER TABLE "SchoolEvent" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Poll" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PollVote" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ParentVisitSlot" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ParentVisitBooking" FORCE ROW LEVEL SECURITY;
ALTER TABLE "DisciplinaryMatter" FORCE ROW LEVEL SECURITY;

ALTER TABLE "LessonPlan" FORCE ROW LEVEL SECURITY;
ALTER TABLE "QuestionCategory" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Question" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Exam" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ExamClassroom" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ExamParticipation" FORCE ROW LEVEL SECURITY;
ALTER TABLE "GradeEntry" FORCE ROW LEVEL SECURITY;

ALTER TABLE "CourseMaterial" FORCE ROW LEVEL SECURITY;
ALTER TABLE "MaterialClassroom" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ChatChannel" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ChatChannelMember" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" FORCE ROW LEVEL SECURITY;

ALTER TABLE "StudentFeeContract" FORCE ROW LEVEL SECURITY;
ALTER TABLE "FeeInstallment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PaymentTransaction" FORCE ROW LEVEL SECURITY;
ALTER TABLE "FeeReceipt" FORCE ROW LEVEL SECURITY;
ALTER TABLE "StaffPayrollProfile" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PayrollSlip" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PayrollItem" FORCE ROW LEVEL SECURITY;

-- 3. Dynamic helper function for creating tenant isolation policies
DO $$
DECLARE
  tbl text;
  policy_name text;
  tables text[] := ARRAY[
    'User',
    'RefreshTokenFamily',
    'TenantFeatureFlag',
    'AuditLog',
    'AcademicYear',
    'Term',
    'EducationalLevel',
    'StudyField',
    'Lesson',
    'Classroom',
    'ClassEnrollment',
    'ClassSchedule',
    'SchoolRole',
    'UserSchoolRole',
    'StudentProfile',
    'TeacherProfile',
    'CoachProfile',
    'StaffProfile',
    'ParentProfile',
    'ParentStudentLink',
    'ProfileBlog',
    'SchoolProfile',
    'StudentAttendance',
    'TeacherAttendance',
    'Homework',
    'HomeworkSubmission',
    'SchoolEvent',
    'Poll',
    'PollVote',
    'ParentVisitSlot',
    'ParentVisitBooking',
    'DisciplinaryMatter',
    'LessonPlan',
    'QuestionCategory',
    'Question',
    'Exam',
    'ExamClassroom',
    'ExamParticipation',
    'GradeEntry',
    'CourseMaterial',
    'MaterialClassroom',
    'ChatChannel',
    'ChatChannelMember',
    'ChatMessage',
    'StudentFeeContract',
    'FeeInstallment',
    'PaymentTransaction',
    'FeeReceipt',
    'StaffPayrollProfile',
    'PayrollSlip',
    'PayrollItem'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    policy_name := 'tenant_isolation_' || lower(tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', policy_name, tbl);
    EXECUTE format('
      CREATE POLICY %I ON %I
      FOR ALL
      USING (
        "tenantId" = current_setting(''app.current_tenant_id'', true)
        OR current_setting(''app.is_platform_admin'', true) = ''true''
      )
      WITH CHECK (
        "tenantId" = current_setting(''app.current_tenant_id'', true)
        OR current_setting(''app.is_platform_admin'', true) = ''true''
      );
    ', policy_name, tbl);
  END LOOP;
END $$;
