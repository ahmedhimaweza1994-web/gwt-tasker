import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal, uuid, pgEnum, jsonb, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum('role', ['admin', 'sub-admin', 'employee']);
export const auxStatusEnum = pgEnum('aux_status', ['ready', 'working_on_project', 'personal', 'break', 'waiting']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'under_review', 'completed']);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high']);
export const leaveTypeEnum = pgEnum('leave_type', ['annual', 'sick', 'maternity', 'emergency']);
export const leaveStatusEnum = pgEnum('leave_status', ['pending', 'approved', 'rejected']);
export const advanceStatusEnum = pgEnum('advance_status', ['pending', 'approved', 'rejected']);
export const chatRoomTypeEnum = pgEnum('chat_room_type', ['private', 'group']);
export const messageTypeEnum = pgEnum('message_type', ['text', 'image', 'file', 'meeting_link']);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  department: text("department").notNull(),
  role: roleEnum("role").notNull().default('employee'),
  profilePicture: text("profile_picture"),
  coverImage: text("cover_image"),
  bio: text("bio"),
  jobTitle: text("job_title"),
  phoneNumber: text("phone_number"),
  address: text("address"),
  dateOfBirth: timestamp("date_of_birth"),
  hireDate: timestamp("hire_date").notNull().defaultNow(),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  totalPoints: integer("total_points").notNull().default(0), // إجمالي النقاط المكتسبة
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// AUX Status tracking
export const auxSessions = pgTable("aux_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: auxStatusEnum("status").notNull(),
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tasks
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  companyName: text("company_name"), // الحقل الجديد: اسم الشركة
  status: taskStatusEnum("status").notNull().default('pending'),
  priority: taskPriorityEnum("priority").notNull().default('medium'),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  performanceRating: integer("performance_rating"), // نقاط الأداء من 1 إلى 5
  rewardPoints: integer("reward_points").default(0), // نقاط المكافأة للمهمة
  ratedBy: uuid("rated_by").references(() => users.id, { onDelete: "set null" }),
  ratedAt: timestamp("rated_at"),
  tags: text("tags").array(),
  attachments: jsonb("attachments").$type<{ name: string; url: string; type: string }[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Task collaborators
export const taskCollaborators = pgTable("task_collaborators", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Task comments/notes
export const taskNotes = pgTable("task_notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  attachments: jsonb("attachments").$type<{ name: string; url: string; type: string }[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Leave requests
export const leaveRequests = pgTable("leave_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: leaveTypeEnum("type").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  days: integer("days").notNull(),
  reason: text("reason"),
  status: leaveStatusEnum("status").notNull().default('pending'),
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Salary advance requests
export const salaryAdvanceRequests = pgTable("salary_advance_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  status: advanceStatusEnum("status").notNull().default('pending'),
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  repaymentDate: timestamp("repayment_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Shifts
export const shifts = pgTable("shifts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  breakDuration: integer("break_duration"), // in minutes
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'info', 'warning', 'error', 'success'
  isRead: boolean("is_read").notNull().default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Chat Rooms
export const chatRooms = pgTable("chat_rooms", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  type: chatRoomTypeEnum("type").notNull().default('group'),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Chat Room Members
export const chatRoomMembers = pgTable("chat_room_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: uuid("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

// Chat Messages
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: uuid("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content"),
  messageType: messageTypeEnum("message_type").notNull().default('text'),
  attachments: jsonb("attachments").$type<{ name: string; url: string; type: string }[]>(),
  replyTo: uuid("reply_to"),
  isEdited: boolean("is_edited").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Message Reactions
export const messageReactions = pgTable("message_reactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: uuid("message_id").notNull().references(() => chatMessages.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraint: one reaction per user per message
  uniqueUserMessageReaction: unique().on(table.messageId, table.userId),
}));

// Meetings
export const meetings = pgTable("meetings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  meetingLink: text("meeting_link").notNull(),
  scheduledBy: uuid("scheduled_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Meeting Participants
export const meetingParticipants = pgTable("meeting_participants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: uuid("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Google Calendar OAuth Tokens
export const googleCalendarTokens = pgTable("google_calendar_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  scope: text("scope").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  auxSessions: many(auxSessions),
  createdTasks: many(tasks, { relationName: "createdTasks" }),
  assignedTasks: many(tasks, { relationName: "assignedTasks" }),
  taskCollaborators: many(taskCollaborators),
  taskNotes: many(taskNotes),
  leaveRequests: many(leaveRequests),
  salaryAdvanceRequests: many(salaryAdvanceRequests),
  shifts: many(shifts),
  notifications: many(notifications),
  createdChatRooms: many(chatRooms),
  chatRoomMemberships: many(chatRoomMembers),
  chatMessages: many(chatMessages),
  messageReactions: many(messageReactions),
  scheduledMeetings: many(meetings),
  meetingParticipations: many(meetingParticipants),
  googleCalendarToken: one(googleCalendarTokens),
}));

export const auxSessionsRelations = relations(auxSessions, ({ one }) => ({
  user: one(users, { fields: [auxSessions.userId], references: [users.id] }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  createdBy: one(users, { fields: [tasks.createdBy], references: [users.id], relationName: "createdTasks" }),
  assignedTo: one(users, { fields: [tasks.assignedTo], references: [users.id], relationName: "assignedTasks" }),
  ratedBy: one(users, { fields: [tasks.ratedBy], references: [users.id] }),
  collaborators: many(taskCollaborators),
  notes: many(taskNotes),
}));

export const taskCollaboratorsRelations = relations(taskCollaborators, ({ one }) => ({
  task: one(tasks, { fields: [taskCollaborators.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskCollaborators.userId], references: [users.id] }),
}));

export const taskNotesRelations = relations(taskNotes, ({ one }) => ({
  task: one(tasks, { fields: [taskNotes.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskNotes.userId], references: [users.id] }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  user: one(users, { fields: [leaveRequests.userId], references: [users.id] }),
  approvedBy: one(users, { fields: [leaveRequests.approvedBy], references: [users.id] }),
}));

export const salaryAdvanceRequestsRelations = relations(salaryAdvanceRequests, ({ one }) => ({
  user: one(users, { fields: [salaryAdvanceRequests.userId], references: [users.id] }),
  approvedBy: one(users, { fields: [salaryAdvanceRequests.approvedBy], references: [users.id] }),
}));

export const shiftsRelations = relations(shifts, ({ one }) => ({
  user: one(users, { fields: [shifts.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const chatRoomsRelations = relations(chatRooms, ({ one, many }) => ({
  createdBy: one(users, { fields: [chatRooms.createdBy], references: [users.id] }),
  members: many(chatRoomMembers),
  messages: many(chatMessages),
}));

export const chatRoomMembersRelations = relations(chatRoomMembers, ({ one }) => ({
  room: one(chatRooms, { fields: [chatRoomMembers.roomId], references: [chatRooms.id] }),
  user: one(users, { fields: [chatRoomMembers.userId], references: [users.id] }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one, many }) => ({
  room: one(chatRooms, { fields: [chatMessages.roomId], references: [chatRooms.id] }),
  sender: one(users, { fields: [chatMessages.senderId], references: [users.id] }),
  reactions: many(messageReactions),
}));

export const messageReactionsRelations = relations(messageReactions, ({ one }) => ({
  message: one(chatMessages, { fields: [messageReactions.messageId], references: [chatMessages.id] }),
  user: one(users, { fields: [messageReactions.userId], references: [users.id] }),
}));

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  scheduledBy: one(users, { fields: [meetings.scheduledBy], references: [users.id] }),
  participants: many(meetingParticipants),
}));

export const meetingParticipantsRelations = relations(meetingParticipants, ({ one }) => ({
  meeting: one(meetings, { fields: [meetingParticipants.meetingId], references: [meetings.id] }),
  user: one(users, { fields: [meetingParticipants.userId], references: [users.id] }),
}));

export const googleCalendarTokensRelations = relations(googleCalendarTokens, ({ one }) => ({
  user: one(users, { fields: [googleCalendarTokens.userId], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
  totalPoints: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  performanceRating: true,
  ratedBy: true,
  ratedAt: true,
});

export const insertAuxSessionSchema = createInsertSchema(auxSessions).omit({
  id: true,
  createdAt: true,
  endTime: true,
  duration: true,
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
  approvedBy: true,
});

export const insertSalaryAdvanceRequestSchema = createInsertSchema(salaryAdvanceRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
  approvedBy: true,
});

export const insertChatRoomSchema = createInsertSchema(chatRooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isEdited: true,
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  id: true,
  createdAt: true,
});

export const insertGoogleCalendarTokenSchema = createInsertSchema(googleCalendarTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type AuxSession = typeof auxSessions.$inferSelect;
export type InsertAuxSession = z.infer<typeof insertAuxSessionSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type SalaryAdvanceRequest = typeof salaryAdvanceRequests.$inferSelect;
export type InsertSalaryAdvanceRequest = z.infer<typeof insertSalaryAdvanceRequestSchema>;
export type TaskNote = typeof taskNotes.$inferSelect;
export type TaskCollaborator = typeof taskCollaborators.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatRoomMember = typeof chatRoomMembers.$inferSelect;
export type MessageReaction = typeof messageReactions.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type MeetingParticipant = typeof meetingParticipants.$inferSelect;
export type GoogleCalendarToken = typeof googleCalendarTokens.$inferSelect;
export type InsertGoogleCalendarToken = z.infer<typeof insertGoogleCalendarTokenSchema>;
