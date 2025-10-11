var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer } from "ws";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  advanceRequests: () => advanceRequests,
  advanceRequestsRelations: () => advanceRequestsRelations,
  advanceStatusEnum: () => advanceStatusEnum,
  auxSessions: () => auxSessions,
  auxSessionsRelations: () => auxSessionsRelations,
  auxStatusEnum: () => auxStatusEnum,
  insertAdvanceRequestSchema: () => insertAdvanceRequestSchema,
  insertAuxSessionSchema: () => insertAuxSessionSchema,
  insertLeaveRequestSchema: () => insertLeaveRequestSchema,
  insertTaskSchema: () => insertTaskSchema,
  insertUserSchema: () => insertUserSchema,
  leaveRequests: () => leaveRequests,
  leaveRequestsRelations: () => leaveRequestsRelations,
  leaveStatusEnum: () => leaveStatusEnum,
  leaveTypeEnum: () => leaveTypeEnum,
  notifications: () => notifications,
  notificationsRelations: () => notificationsRelations,
  roleEnum: () => roleEnum,
  shifts: () => shifts,
  shiftsRelations: () => shiftsRelations,
  taskCollaborators: () => taskCollaborators,
  taskCollaboratorsRelations: () => taskCollaboratorsRelations,
  taskNotes: () => taskNotes,
  taskNotesRelations: () => taskNotesRelations,
  taskPriorityEnum: () => taskPriorityEnum,
  taskStatusEnum: () => taskStatusEnum,
  tasks: () => tasks,
  tasksRelations: () => tasksRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, integer, boolean, decimal, uuid, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
var roleEnum = pgEnum("role", ["admin", "sub-admin", "employee"]);
var auxStatusEnum = pgEnum("aux_status", ["ready", "working_on_project", "personal", "break", "waiting"]);
var taskStatusEnum = pgEnum("task_status", ["pending", "in_progress", "completed"]);
var taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high"]);
var leaveTypeEnum = pgEnum("leave_type", ["annual", "sick", "maternity", "emergency"]);
var leaveStatusEnum = pgEnum("leave_status", ["pending", "approved", "rejected"]);
var advanceStatusEnum = pgEnum("advance_status", ["pending", "approved", "rejected"]);
var users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  department: text("department").notNull(),
  role: roleEnum("role").notNull().default("employee"),
  profilePicture: text("profile_picture"),
  bio: text("bio"),
  jobTitle: text("job_title"),
  phoneNumber: text("phone_number"),
  address: text("address"),
  dateOfBirth: timestamp("date_of_birth"),
  hireDate: timestamp("hire_date").notNull().defaultNow(),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var auxSessions = pgTable("aux_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: auxStatusEnum("status").notNull(),
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  duration: integer("duration"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  companyName: text("company_name"),
  status: taskStatusEnum("status").notNull().default("pending"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  tags: text("tags").array(),
  attachments: jsonb("attachments").$type(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var taskCollaborators = pgTable("task_collaborators", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var taskNotes = pgTable("task_notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  attachments: jsonb("attachments").$type(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var leaveRequests = pgTable("leave_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: leaveTypeEnum("type").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  days: integer("days").notNull(),
  reason: text("reason"),
  status: leaveStatusEnum("status").notNull().default("pending"),
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var advanceRequests = pgTable("advance_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  status: advanceStatusEnum("status").notNull().default("pending"),
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var shifts = pgTable("shifts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  breakDuration: integer("break_duration"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var usersRelations = relations(users, ({ many }) => ({
  auxSessions: many(auxSessions),
  createdTasks: many(tasks, { relationName: "createdTasks" }),
  assignedTasks: many(tasks, { relationName: "assignedTasks" }),
  taskCollaborators: many(taskCollaborators),
  taskNotes: many(taskNotes),
  leaveRequests: many(leaveRequests),
  advanceRequests: many(advanceRequests),
  shifts: many(shifts),
  notifications: many(notifications)
}));
var auxSessionsRelations = relations(auxSessions, ({ one }) => ({
  user: one(users, { fields: [auxSessions.userId], references: [users.id] })
}));
var tasksRelations = relations(tasks, ({ one, many }) => ({
  createdBy: one(users, { fields: [tasks.createdBy], references: [users.id], relationName: "createdTasks" }),
  assignedTo: one(users, { fields: [tasks.assignedTo], references: [users.id], relationName: "assignedTasks" }),
  collaborators: many(taskCollaborators),
  notes: many(taskNotes)
}));
var taskCollaboratorsRelations = relations(taskCollaborators, ({ one }) => ({
  task: one(tasks, { fields: [taskCollaborators.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskCollaborators.userId], references: [users.id] })
}));
var taskNotesRelations = relations(taskNotes, ({ one }) => ({
  task: one(tasks, { fields: [taskNotes.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskNotes.userId], references: [users.id] })
}));
var leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  user: one(users, { fields: [leaveRequests.userId], references: [users.id] }),
  approvedBy: one(users, { fields: [leaveRequests.approvedBy], references: [users.id] })
}));
var advanceRequestsRelations = relations(advanceRequests, ({ one }) => ({
  user: one(users, { fields: [advanceRequests.userId], references: [users.id] }),
  approvedBy: one(users, { fields: [advanceRequests.approvedBy], references: [users.id] })
}));
var shiftsRelations = relations(shifts, ({ one }) => ({
  user: one(users, { fields: [shifts.userId], references: [users.id] })
}));
var notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] })
}));
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true
});
var insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true
});
var insertAuxSessionSchema = createInsertSchema(auxSessions).omit({
  id: true,
  createdAt: true,
  endTime: true,
  duration: true
});
var insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
  approvedBy: true
});
var insertAdvanceRequestSchema = createInsertSchema(advanceRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
  approvedBy: true
});

// server/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
  // تعطيل SSL للـ local DB
});
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, desc, and, or, isNull, count, sql as sql2, gte, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
var PostgresSessionStore = connectPg(session);
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  // Auth & Users
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || void 0;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async updateUser(id, updates) {
    const [user] = await db.update(users).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
    return user || void 0;
  }
  async updateUserLastLogin(id) {
    await db.update(users).set({ lastLogin: /* @__PURE__ */ new Date() }).where(eq(users.id, id));
  }
  async getUsers() {
    return await db.select().from(users).where(eq(users.isActive, true));
  }
  // Tasks
  async createTask(task) {
    console.log("Raw task data:", task);
    const now = /* @__PURE__ */ new Date();
    const fixedTask = {
      ...task,
      createdAt: task.createdAt ? new Date(task.createdAt) : now,
      updatedAt: task.updatedAt ? new Date(task.updatedAt) : now,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      companyName: task.companyName || null
    };
    console.log("Fixed task data:", fixedTask);
    const [createdTask] = await db.insert(tasks).values([fixedTask]).returning();
    return createdTask;
  }
  async getTask(id) {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || void 0;
  }
  async getUserTasks(userId) {
    return await db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      companyName: tasks.companyName,
      status: tasks.status,
      priority: tasks.priority,
      createdBy: tasks.createdBy,
      assignedTo: tasks.assignedTo,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      estimatedHours: tasks.estimatedHours,
      actualHours: tasks.actualHours,
      tags: tasks.tags,
      attachments: tasks.attachments,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      createdByUser: users,
      assignedToUser: users
    }).from(tasks).leftJoin(users, eq(tasks.createdBy, users.id)).where(eq(tasks.createdBy, userId)).orderBy(desc(tasks.createdAt));
  }
  async getAssignedTasks(userId) {
    return await db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      companyName: tasks.companyName,
      status: tasks.status,
      priority: tasks.priority,
      createdBy: tasks.createdBy,
      assignedTo: tasks.assignedTo,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      estimatedHours: tasks.estimatedHours,
      actualHours: tasks.actualHours,
      tags: tasks.tags,
      attachments: tasks.attachments,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      createdByUser: users,
      assignedToUser: users
    }).from(tasks).leftJoin(users, eq(tasks.assignedTo, users.id)).where(eq(tasks.assignedTo, userId)).orderBy(desc(tasks.createdAt));
  }
  async updateTask(id, updates) {
    const now = /* @__PURE__ */ new Date();
    const fixedUpdates = {
      ...updates,
      updatedAt: updates.updatedAt ? new Date(updates.updatedAt) : now,
      dueDate: updates.dueDate ? new Date(updates.dueDate) : updates.dueDate,
      companyName: updates.companyName || null
    };
    const [task] = await db.update(tasks).set(fixedUpdates).where(eq(tasks.id, id)).returning();
    return task || void 0;
  }
  async deleteTask(id) {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result.rowCount > 0;
  }
  async getAllTasks() {
    return await db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      companyName: tasks.companyName,
      status: tasks.status,
      priority: tasks.priority,
      createdBy: tasks.createdBy,
      assignedTo: tasks.assignedTo,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      estimatedHours: tasks.estimatedHours,
      actualHours: tasks.actualHours,
      tags: tasks.tags,
      attachments: tasks.attachments,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      createdByUser: users,
      assignedToUser: users
    }).from(tasks).leftJoin(users, or(eq(tasks.createdBy, users.id), eq(tasks.assignedTo, users.id))).orderBy(desc(tasks.createdAt));
  }
  // Task Collaborators
  async addTaskCollaborator(taskId, userId) {
    await db.insert(taskCollaborators).values({ taskId, userId });
  }
  async removeTaskCollaborator(taskId, userId) {
    await db.delete(taskCollaborators).where(and(
      eq(taskCollaborators.taskId, taskId),
      eq(taskCollaborators.userId, userId)
    ));
  }
  async getTaskCollaborators(taskId) {
    const result = await db.select({ user: users }).from(taskCollaborators).innerJoin(users, eq(taskCollaborators.userId, users.id)).where(eq(taskCollaborators.taskId, taskId));
    return result.map((r) => r.user);
  }
  // Task Notes
  async createTaskNote(taskId, userId, content) {
    const [note] = await db.insert(taskNotes).values({ taskId, userId, content }).returning();
    return note;
  }
  async getTaskNotes(taskId) {
    return await db.select().from(taskNotes).where(eq(taskNotes.taskId, taskId)).orderBy(desc(taskNotes.createdAt));
  }
  // AUX Sessions
  async startAuxSession(session3) {
    await db.update(auxSessions).set({
      endTime: /* @__PURE__ */ new Date(),
      duration: sql2`EXTRACT(epoch FROM (NOW() - start_time))::integer`
    }).where(and(
      eq(auxSessions.userId, session3.userId),
      isNull(auxSessions.endTime)
    ));
    const [newSession] = await db.insert(auxSessions).values(session3).returning();
    return newSession;
  }
  async endAuxSession(sessionId, notes) {
    const [session3] = await db.update(auxSessions).set({
      endTime: /* @__PURE__ */ new Date(),
      duration: sql2`EXTRACT(epoch FROM (NOW() - start_time))::integer`,
      notes: notes || null
    }).where(eq(auxSessions.id, sessionId)).returning();
    return session3 || void 0;
  }
  async getCurrentAuxSession(userId) {
    const [session3] = await db.select().from(auxSessions).where(and(
      eq(auxSessions.userId, userId),
      isNull(auxSessions.endTime)
    ));
    return session3 || void 0;
  }
  async getUserAuxSessions(userId, startDate, endDate) {
    const conditions = [eq(auxSessions.userId, userId)];
    if (startDate) {
      conditions.push(gte(auxSessions.startTime, startDate));
    }
    if (endDate) {
      conditions.push(lte(auxSessions.startTime, endDate));
    }
    return await db.select().from(auxSessions).where(and(...conditions)).orderBy(desc(auxSessions.startTime));
  }
  async getAllActiveAuxSessions() {
    const result = await db.select({
      id: auxSessions.id,
      userId: auxSessions.userId,
      status: auxSessions.status,
      startTime: auxSessions.startTime,
      endTime: auxSessions.endTime,
      duration: auxSessions.duration,
      notes: auxSessions.notes,
      createdAt: auxSessions.createdAt,
      user: users
    }).from(auxSessions).innerJoin(users, eq(auxSessions.userId, users.id)).where(and(
      isNull(auxSessions.endTime),
      eq(users.isActive, true)
    )).orderBy(auxSessions.startTime);
    return result;
  }
  async getAllAuxSessions() {
    return await db.select().from(auxSessions).orderBy(desc(auxSessions.startTime));
  }
  // Leave Requests
  async createLeaveRequest(request) {
    const [leaveRequest] = await db.insert(leaveRequests).values(request).returning();
    return leaveRequest;
  }
  async getLeaveRequest(id) {
    const [request] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    return request || void 0;
  }
  async getUserLeaveRequests(userId) {
    return await db.select().from(leaveRequests).where(eq(leaveRequests.userId, userId)).orderBy(desc(leaveRequests.createdAt));
  }
  async getPendingLeaveRequests() {
    const result = await db.select({
      id: leaveRequests.id,
      userId: leaveRequests.userId,
      type: leaveRequests.type,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      days: leaveRequests.days,
      reason: leaveRequests.reason,
      status: leaveRequests.status,
      approvedBy: leaveRequests.approvedBy,
      approvedAt: leaveRequests.approvedAt,
      rejectionReason: leaveRequests.rejectionReason,
      createdAt: leaveRequests.createdAt,
      updatedAt: leaveRequests.updatedAt,
      user: users
    }).from(leaveRequests).innerJoin(users, eq(leaveRequests.userId, users.id)).where(eq(leaveRequests.status, "pending")).orderBy(desc(leaveRequests.createdAt));
    return result;
  }
  async getAllLeaveRequests() {
    return await db.select().from(leaveRequests).orderBy(desc(leaveRequests.createdAt));
  }
  async updateLeaveRequest(id, updates) {
    const now = /* @__PURE__ */ new Date();
    const fixedUpdates = {
      ...updates,
      updatedAt: updates.updatedAt ? new Date(updates.updatedAt) : now,
      startDate: updates.startDate ? new Date(updates.startDate) : updates.startDate,
      endDate: updates.endDate ? new Date(updates.endDate) : updates.endDate,
      approvedAt: updates.approvedAt ? new Date(updates.approvedAt) : updates.approvedAt
    };
    const [request] = await db.update(leaveRequests).set(fixedUpdates).where(eq(leaveRequests.id, id)).returning();
    return request || void 0;
  }
  // Advance Requests
  async createAdvanceRequest(request) {
    const [advanceRequest] = await db.insert(advanceRequests).values(request).returning();
    return advanceRequest;
  }
  async getAdvanceRequest(id) {
    const [request] = await db.select().from(advanceRequests).where(eq(advanceRequests.id, id));
    return request || void 0;
  }
  async getUserAdvanceRequests(userId) {
    return await db.select().from(advanceRequests).where(eq(advanceRequests.userId, userId)).orderBy(desc(advanceRequests.createdAt));
  }
  async getPendingAdvanceRequests() {
    const result = await db.select({
      id: advanceRequests.id,
      userId: advanceRequests.userId,
      amount: advanceRequests.amount,
      reason: advanceRequests.reason,
      status: advanceRequests.status,
      approvedBy: advanceRequests.approvedBy,
      approvedAt: advanceRequests.approvedAt,
      rejectionReason: advanceRequests.rejectionReason,
      createdAt: advanceRequests.createdAt,
      updatedAt: advanceRequests.updatedAt,
      user: users
    }).from(advanceRequests).innerJoin(users, eq(advanceRequests.userId, users.id)).where(eq(advanceRequests.status, "pending")).orderBy(desc(advanceRequests.createdAt));
    return result;
  }
  async getAllAdvanceRequests() {
    return await db.select().from(advanceRequests).orderBy(desc(advanceRequests.createdAt));
  }
  async updateAdvanceRequest(id, updates) {
    const now = /* @__PURE__ */ new Date();
    const fixedUpdates = {
      ...updates,
      updatedAt: updates.updatedAt ? new Date(updates.updatedAt) : now,
      approvedAt: updates.approvedAt ? new Date(updates.approvedAt) : updates.approvedAt
    };
    const [request] = await db.update(advanceRequests).set(fixedUpdates).where(eq(advanceRequests.id, id)).returning();
    return request || void 0;
  }
  // Notifications
  async createNotification(userId, title, message, type) {
    const [notification] = await db.insert(notifications).values({ userId, title, message, type }).returning();
    return notification;
  }
  async getUserNotifications(userId, unreadOnly) {
    const conditions = [eq(notifications.userId, userId)];
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }
    return await db.select().from(notifications).where(and(...conditions)).orderBy(desc(notifications.createdAt));
  }
  async markNotificationRead(id) {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }
  // Analytics
  async getUserProductivityStats(userId, startDate, endDate) {
    const result = await db.select({
      status: auxSessions.status,
      totalDuration: sql2`SUM(COALESCE(duration, EXTRACT(epoch FROM (NOW() - start_time))::integer))`,
      sessionCount: count()
    }).from(auxSessions).where(and(
      eq(auxSessions.userId, userId),
      gte(auxSessions.startTime, startDate),
      lte(auxSessions.startTime, endDate)
    )).groupBy(auxSessions.status);
    return result;
  }
  async getDepartmentStats() {
    const result = await db.select({
      department: users.department,
      employeeCount: count(),
      activeEmployees: sql2`COUNT(*) FILTER (WHERE is_active = true)`
    }).from(users).groupBy(users.department);
    return result;
  }
  async getSystemStats() {
    const [stats] = await db.select({
      totalUsers: count(users.id),
      activeUsers: sql2`COUNT(*) FILTER (WHERE is_active = true)`,
      totalTasks: sql2`(SELECT COUNT(*) FROM ${tasks})`,
      completedTasks: sql2`(SELECT COUNT(*) FROM ${tasks} WHERE status = 'completed')`,
      pendingLeaveRequests: sql2`(SELECT COUNT(*) FROM ${leaveRequests} WHERE status = 'pending')`,
      pendingAdvanceRequests: sql2`(SELECT COUNT(*) FROM ${advanceRequests} WHERE status = 'pending')`
    }).from(users);
    return stats;
  }
};
var storage = new DatabaseStorage();

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import connectPg2 from "connect-pg-simple";
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  const PostgresSessionStore2 = connectPg2(session2);
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "gwt-task-management-secret-key-12345",
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore2({
      pool,
      createTableIfMissing: true
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1e3,
      // 24 hours
      secure: process.env.NODE_ENV === "production",
      httpOnly: true
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user || !await comparePasswords(password, user.password)) {
          return done(null, false, { message: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
        }
        await storage.updateUserLastLogin(user.id);
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, fullName, department, jobTitle } = req.body;
      if (!email || !password || !fullName || !department) {
        return res.status(400).json({ message: "\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0644 \u0645\u0637\u0644\u0648\u0628\u0629" });
      }
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B" });
      }
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        fullName,
        department,
        jobTitle: jobTitle || "\u0645\u0648\u0638\u0641",
        role: "employee"
      });
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          department: user.department,
          jobTitle: user.jobTitle
        });
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({
          message: info?.message || "\u0641\u0634\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644"
        });
      }
      req.login(user, (err2) => {
        if (err2) return next(err2);
        res.status(200).json({
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          department: user.department,
          jobTitle: user.jobTitle
        });
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    const user = req.user;
    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      jobTitle: user.jobTitle,
      profilePicture: user.profilePicture,
      bio: user.bio
    });
  });
}

// server/routes.ts
function requireAuth(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "\u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629 \u0645\u0637\u0644\u0648\u0628\u0629" });
  }
  next();
}
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644" });
    }
    next();
  };
}
function registerRoutes(app2) {
  setupAuth(app2);
  app2.get("/api/tasks", requireAuth, requireRole(["admin", "sub-admin"]), async (req, res) => {
    try {
      const tasks2 = await storage.getAllTasks();
      res.json(tasks2);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0647\u0627\u0645" });
    }
  });
  app2.get("/api/tasks/my", requireAuth, async (req, res) => {
    try {
      const tasks2 = await storage.getUserTasks(req.user.id);
      res.json(tasks2);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0647\u0627\u0645" });
    }
  });
  app2.get("/api/tasks/assigned", requireAuth, async (req, res) => {
    try {
      const tasks2 = await storage.getAssignedTasks(req.user.id);
      res.json(tasks2);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0645\u0639\u064A\u0646\u0629" });
    }
  });
  app2.get("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "\u0627\u0644\u0645\u0647\u0645\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0647\u0645\u0629" });
    }
  });
  app2.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const taskData = {
        ...req.body,
        createdBy: req.user.id,
        companyName: req.body.companyName || null
      };
      const task = await storage.createTask(taskData);
      if (task.assignedTo && task.assignedTo !== req.user.id) {
        await storage.createNotification(
          task.assignedTo,
          "\u0645\u0647\u0645\u0629 \u062C\u062F\u064A\u062F\u0629 \u0645\u0639\u064A\u0646\u0629 \u0644\u0643",
          `\u062A\u0645 \u062A\u0639\u064A\u064A\u0646 \u0645\u0647\u0645\u0629 "${task.title}" \u0644\u0643`,
          "info"
        );
      }
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0647\u0645\u0629" });
    }
  });
  app2.put("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const task = await storage.updateTask(req.params.id, req.body);
      if (!task) {
        return res.status(404).json({ message: "\u0627\u0644\u0645\u0647\u0645\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0647\u0645\u0629" });
    }
  });
  app2.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteTask(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "\u0627\u0644\u0645\u0647\u0645\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      }
      res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0647\u0645\u0629 \u0628\u0646\u062C\u0627\u062D" });
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062D\u0630\u0641 \u0627\u0644\u0645\u0647\u0645\u0629" });
    }
  });
  app2.post("/api/aux/start", requireAuth, async (req, res) => {
    try {
      const session3 = await storage.startAuxSession({
        userId: req.user.id,
        status: req.body.status,
        notes: req.body.notes
      });
      res.json(session3);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u0628\u062F\u0621 \u0627\u0644\u062C\u0644\u0633\u0629" });
    }
  });
  app2.post("/api/aux/end/:id", requireAuth, async (req, res) => {
    try {
      const session3 = await storage.endAuxSession(req.params.id, req.body.notes);
      if (!session3) {
        return res.status(404).json({ message: "\u0627\u0644\u062C\u0644\u0633\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      }
      res.json(session3);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u062C\u0644\u0633\u0629" });
    }
  });
  app2.get("/api/aux/current", requireAuth, async (req, res) => {
    try {
      const session3 = await storage.getCurrentAuxSession(req.user.id);
      res.json(session3);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u062C\u0644\u0633\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629" });
    }
  });
  app2.get("/api/aux/sessions", requireAuth, async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate) : void 0;
      const endDate = req.query.endDate ? new Date(req.query.endDate) : void 0;
      const sessions = await storage.getUserAuxSessions(req.user.id, startDate, endDate);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u062C\u0644\u0633\u0627\u062A" });
    }
  });
  app2.get("/api/admin/employees", requireAuth, requireRole(["admin", "sub-admin"]), async (req, res) => {
    try {
      const employees = await storage.getAllActiveAuxSessions();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u0638\u0641\u064A\u0646" });
    }
  });
  app2.get("/api/admin/stats", requireAuth, requireRole(["admin", "sub-admin"]), async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A" });
    }
  });
  app2.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users2 = await storage.getUsers();
      res.json(users2.map((user) => ({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        department: user.department,
        jobTitle: user.jobTitle,
        role: user.role,
        isActive: user.isActive,
        profilePicture: user.profilePicture
      })));
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646" });
    }
  });
  app2.post("/api/admin/employees", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const bcrypt = await import("bcrypt");
      const hashedPassword = await bcrypt.hash(req.body.password || "Employee@123", 10);
      const newEmployee = await storage.createUser({
        email: req.body.email,
        password: hashedPassword,
        fullName: req.body.fullName,
        department: req.body.department,
        jobTitle: req.body.jobTitle,
        role: req.body.role || "employee",
        phoneNumber: req.body.phoneNumber,
        address: req.body.address,
        salary: req.body.salary || 0,
        hireDate: req.body.hireDate || /* @__PURE__ */ new Date(),
        isActive: true
      });
      res.status(201).json({
        id: newEmployee.id,
        fullName: newEmployee.fullName,
        email: newEmployee.email,
        department: newEmployee.department,
        jobTitle: newEmployee.jobTitle,
        role: newEmployee.role
      });
    } catch (error) {
      console.error("Error creating employee:", error);
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0648\u0638\u0641" });
    }
  });
  app2.put("/api/admin/employees/:id", requireAuth, requireRole(["admin", "sub-admin"]), async (req, res) => {
    try {
      const updates = {
        fullName: req.body.fullName,
        department: req.body.department,
        jobTitle: req.body.jobTitle,
        phoneNumber: req.body.phoneNumber,
        address: req.body.address,
        salary: req.body.salary,
        isActive: req.body.isActive
      };
      const updatedEmployee = await storage.updateUser(req.params.id, updates);
      if (!updatedEmployee) {
        return res.status(404).json({ message: "\u0627\u0644\u0645\u0648\u0638\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      }
      res.json(updatedEmployee);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u0638\u0641" });
    }
  });
  app2.get("/api/profile/:id", requireAuth, async (req, res) => {
    try {
      const users2 = await storage.getUsers();
      const user = users2.find((u) => u.id === req.params.id);
      if (!user) {
        return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      }
      res.json({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        department: user.department,
        jobTitle: user.jobTitle,
        role: user.role,
        profilePicture: user.profilePicture,
        bio: user.bio,
        phoneNumber: user.phoneNumber,
        address: user.address,
        dateOfBirth: user.dateOfBirth,
        hireDate: user.hireDate,
        isActive: user.isActive
      });
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A" });
    }
  });
  app2.put("/api/profile", requireAuth, async (req, res) => {
    try {
      const updatedUser = await storage.updateUser(req.user.id, {
        fullName: req.body.fullName,
        department: req.body.department,
        jobTitle: req.body.jobTitle,
        bio: req.body.bio,
        phoneNumber: req.body.phoneNumber,
        address: req.body.address,
        dateOfBirth: req.body.dateOfBirth
      });
      if (!updatedUser) {
        return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      }
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A" });
    }
  });
  app2.post("/api/leaves", requireAuth, async (req, res) => {
    try {
      const leaveRequest = await storage.createLeaveRequest({
        ...req.body,
        userId: req.user.id
      });
      const admins = await storage.getUsers();
      const adminUsers = admins.filter((u) => u.role === "admin" || u.role === "sub-admin");
      for (const admin of adminUsers) {
        await storage.createNotification(
          admin.id,
          "\u0637\u0644\u0628 \u0625\u062C\u0627\u0632\u0629 \u062C\u062F\u064A\u062F",
          `${req.user.fullName} \u0642\u062F\u0645 \u0637\u0644\u0628 \u0625\u062C\u0627\u0632\u0629 \u062C\u062F\u064A\u062F`,
          "info"
        );
      }
      res.status(201).json(leaveRequest);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062A\u0642\u062F\u064A\u0645 \u0637\u0644\u0628 \u0627\u0644\u0625\u062C\u0627\u0632\u0629" });
    }
  });
  app2.get("/api/leaves/pending", requireAuth, requireRole(["admin", "sub-admin"]), async (req, res) => {
    try {
      const requests = await storage.getPendingLeaveRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0625\u062C\u0627\u0632\u0627\u062A" });
    }
  });
  app2.put("/api/leaves/:id", requireAuth, requireRole(["admin", "sub-admin"]), async (req, res) => {
    try {
      const updates = {
        ...req.body,
        approvedBy: req.user.id,
        approvedAt: /* @__PURE__ */ new Date()
      };
      const leaveRequest = await storage.updateLeaveRequest(req.params.id, updates);
      if (!leaveRequest) {
        return res.status(404).json({ message: "\u0637\u0644\u0628 \u0627\u0644\u0625\u062C\u0627\u0632\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      }
      const statusText = leaveRequest.status === "approved" ? "\u062A\u0645\u062A \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649" : "\u062A\u0645 \u0631\u0641\u0636";
      await storage.createNotification(
        leaveRequest.userId,
        "\u062A\u062D\u062F\u064A\u062B \u0637\u0644\u0628 \u0627\u0644\u0625\u062C\u0627\u0632\u0629",
        `${statusText} \u0637\u0644\u0628 \u0627\u0644\u0625\u062C\u0627\u0632\u0629 \u0627\u0644\u062E\u0627\u0635 \u0628\u0643`,
        leaveRequest.status === "approved" ? "success" : "error"
      );
      res.json(leaveRequest);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0637\u0644\u0628 \u0627\u0644\u0625\u062C\u0627\u0632\u0629" });
    }
  });
  app2.post("/api/advances", requireAuth, async (req, res) => {
    try {
      const advanceRequest = await storage.createAdvanceRequest({
        ...req.body,
        userId: req.user.id
      });
      const admins = await storage.getUsers();
      const adminUsers = admins.filter((u) => u.role === "admin" || u.role === "sub-admin");
      for (const admin of adminUsers) {
        await storage.createNotification(
          admin.id,
          "\u0637\u0644\u0628 \u0633\u0644\u0641\u0629 \u062C\u062F\u064A\u062F",
          `${req.user.fullName} \u0642\u062F\u0645 \u0637\u0644\u0628 \u0633\u0644\u0641\u0629 \u062C\u062F\u064A\u062F`,
          "info"
        );
      }
      res.status(201).json(advanceRequest);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062A\u0642\u062F\u064A\u0645 \u0637\u0644\u0628 \u0627\u0644\u0633\u0644\u0641\u0629" });
    }
  });
  app2.get("/api/advances/pending", requireAuth, requireRole(["admin", "sub-admin"]), async (req, res) => {
    try {
      const requests = await storage.getPendingAdvanceRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0633\u0644\u0641" });
    }
  });
  app2.put("/api/advances/:id", requireAuth, requireRole(["admin", "sub-admin"]), async (req, res) => {
    try {
      const updates = {
        ...req.body,
        approvedBy: req.user.id,
        approvedAt: /* @__PURE__ */ new Date()
      };
      const advanceRequest = await storage.updateAdvanceRequest(req.params.id, updates);
      if (!advanceRequest) {
        return res.status(404).json({ message: "\u0637\u0644\u0628 \u0627\u0644\u0633\u0644\u0641\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      }
      const statusText = advanceRequest.status === "approved" ? "\u062A\u0645\u062A \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649" : "\u062A\u0645 \u0631\u0641\u0636";
      await storage.createNotification(
        advanceRequest.userId,
        "\u062A\u062D\u062F\u064A\u062B \u0637\u0644\u0628 \u0627\u0644\u0633\u0644\u0641\u0629",
        `${statusText} \u0637\u0644\u0628 \u0627\u0644\u0633\u0644\u0641\u0629 \u0627\u0644\u062E\u0627\u0635 \u0628\u0643`,
        advanceRequest.status === "approved" ? "success" : "error"
      );
      res.json(advanceRequest);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0637\u0644\u0628 \u0627\u0644\u0633\u0644\u0641\u0629" });
    }
  });
  app2.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifications2 = await storage.getUserNotifications(req.user.id);
      res.json(notifications2);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A" });
    }
  });
  app2.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0625\u0634\u0639\u0627\u0631" });
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0625\u0634\u0639\u0627\u0631" });
    }
  });
  app2.get("/api/analytics/productivity", requireAuth, async (req, res) => {
    try {
      const startDate = new Date(req.query.startDate || Date.now() - 7 * 24 * 60 * 60 * 1e3);
      const endDate = new Date(req.query.endDate || Date.now());
      const stats = await storage.getUserProductivityStats(req.user.id, startDate, endDate);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0625\u0646\u062A\u0627\u062C\u064A\u0629" });
    }
  });
  app2.get("/api/analytics/departments", requireAuth, requireRole(["admin", "sub-admin"]), async (req, res) => {
    try {
      const stats = await storage.getDepartmentStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0623\u0642\u0633\u0627\u0645" });
    }
  });
  app2.get("/api/hr/stats", requireAuth, requireRole(["admin", "sub-admin"]), async (req, res) => {
    try {
      const users2 = await storage.getUsers();
      const activeEmployees = await storage.getAllActiveAuxSessions();
      const pendingLeaves = await storage.getPendingLeaveRequests();
      const pendingAdvances = await storage.getPendingAdvanceRequests();
      const allLeaves = await storage.getAllLeaveRequests();
      const totalEmployees = users2.filter((u) => u.isActive).length;
      const presentToday = activeEmployees.filter((e) => e.status === "working_on_project" || e.status === "ready").length;
      const onLeave = allLeaves.filter(
        (l) => l.status === "approved" && new Date(l.startDate) <= /* @__PURE__ */ new Date() && new Date(l.endDate) >= /* @__PURE__ */ new Date()
      ).length;
      const pendingRequests = pendingLeaves.length + pendingAdvances.length;
      res.json({
        totalEmployees,
        presentToday,
        onLeave,
        pendingRequests
      });
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u0631\u062F \u0627\u0644\u0628\u0634\u0631\u064A\u0629" });
    }
  });
  app2.get("/api/hr/payroll", requireAuth, requireRole(["admin", "sub-admin"]), async (req, res) => {
    try {
      const users2 = await storage.getUsers();
      const activeUsers = users2.filter((u) => u.isActive);
      const payrollData = activeUsers.map((user) => ({
        id: user.id,
        employee: user.fullName,
        department: user.department || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
        baseSalary: user.salary || 0,
        overtime: 0,
        deductions: 0,
        netSalary: user.salary || 0
      }));
      res.json(payrollData);
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0631\u0648\u0627\u062A\u0628" });
    }
  });
  app2.get("/api/hr/reports", requireAuth, requireRole(["admin", "sub-admin"]), async (req, res) => {
    try {
      const users2 = await storage.getUsers();
      const activeUsers = users2.filter((u) => u.isActive);
      const allSessions = await storage.getAllAuxSessions();
      const allLeaves = await storage.getAllLeaveRequests();
      const last30Days = /* @__PURE__ */ new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      const recentSessions = allSessions.filter((s) => new Date(s.startTime) >= last30Days && s.endTime);
      const totalWorkMinutes = recentSessions.reduce((sum, session3) => {
        if (session3.duration) {
          return sum + session3.duration;
        }
        return sum;
      }, 0);
      const avgWorkHoursPerDay = totalWorkMinutes / (30 * 60);
      const attendanceRate = recentSessions.length > 0 ? recentSessions.filter((s) => s.status === "working_on_project").length / recentSessions.length * 100 : 0;
      const usedLeaveDays = allLeaves.filter((l) => l.status === "approved").reduce((sum, leave) => sum + leave.days, 0);
      const deptCounts = {};
      activeUsers.forEach((user) => {
        const dept = user.department || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F";
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });
      const departmentDistribution = Object.entries(deptCounts).map(([dept, count2]) => ({
        dept,
        count: count2,
        percentage: count2 / activeUsers.length * 100
      }));
      res.json({
        attendanceRate: Math.round(attendanceRate),
        avgWorkHoursPerDay: avgWorkHoursPerDay.toFixed(1),
        usedLeaveDays,
        departmentDistribution
      });
    } catch (error) {
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0645\u0648\u0627\u0631\u062F \u0627\u0644\u0628\u0634\u0631\u064A\u0629" });
    }
  });
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        switch (data.type) {
          case "subscribe":
            break;
          case "aux_update":
            wss.clients.forEach((client) => {
              if (client.readyState === ws.OPEN) {
                client.send(JSON.stringify({
                  type: "aux_status_update",
                  data: data.payload
                }));
              }
            });
            break;
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
  });
  setInterval(async () => {
    try {
      const activeEmployees = await storage.getAllActiveAuxSessions();
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify({
            type: "employee_status_update",
            data: activeEmployees
          }));
        }
      });
    } catch (error) {
      console.error("Broadcast error:", error);
    }
  }, 5e3);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      // غيرنا import.meta.dirname إلى __dirname
      "@shared": path.resolve(__dirname, "shared"),
      // غيرنا import.meta.dirname إلى __dirname
      "@assets": path.resolve(__dirname, "attached_assets")
      // غيرنا import.meta.dirname إلى __dirname
    }
  },
  root: path.resolve(__dirname, "client"),
  // غيرنا import.meta.dirname إلى __dirname
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    // غيرنا import.meta.dirname إلى __dirname
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
import { dirname as dirname2 } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        // غيرنا import.meta.dirname إلى __dirname
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import dotenv from "dotenv";
dotenv.config();
var app = express2();
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
