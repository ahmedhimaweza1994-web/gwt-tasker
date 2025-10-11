
import {
  users,
  tasks,
  auxSessions,
  leaveRequests,
  salaryAdvanceRequests,
  taskNotes,
  taskCollaborators,
  notifications,
  shifts,
  type User,
  type InsertUser,
  type Task,
  type InsertTask,
  type AuxSession,
  type InsertAuxSession,
  type LeaveRequest,
  type InsertLeaveRequest,
  type SalaryAdvanceRequest,
  type InsertSalaryAdvanceRequest,
  type TaskNote,
  type Notification,
  type Shift,
  advanceStatusEnum
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, isNull, count, sql, gte, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Auth & Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  updateUserLastLogin(id: string): Promise<void>;
  getUsers(): Promise<User[]>;
 
  // Tasks
  createTask(task: InsertTask): Promise<Task>;
  getTask(id: string): Promise<Task | undefined>;
  getUserTasks(userId: string): Promise<Task[]>;
  getAssignedTasks(userId: string): Promise<Task[]>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;
  getAllTasks(): Promise<Task[]>;
  rateTask(taskId: string, rating: number, ratedBy: string): Promise<Task>;
  approveTaskReview(taskId: string, approverId: string): Promise<Task>;
 
  // Task Collaborators
  addTaskCollaborator(taskId: string, userId: string): Promise<void>;
  removeTaskCollaborator(taskId: string, userId: string): Promise<void>;
  getTaskCollaborators(taskId: string): Promise<User[]>;
 
  // Task Notes
  createTaskNote(taskId: string, userId: string, content: string): Promise<TaskNote>;
  getTaskNotes(taskId: string): Promise<TaskNote[]>;
 
  // AUX Sessions
  startAuxSession(session: InsertAuxSession): Promise<AuxSession>;
  endAuxSession(sessionId: string, notes?: string): Promise<AuxSession | undefined>;
  getCurrentAuxSession(userId: string): Promise<AuxSession | undefined>;
  getUserAuxSessions(userId: string, startDate?: Date, endDate?: Date): Promise<AuxSession[]>;
  getAllAuxSessions(): Promise<AuxSession[]>;
  getAllActiveAuxSessions(): Promise<(AuxSession & { user: User })[]>;
 
  // Leave Requests
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  getLeaveRequest(id: string): Promise<LeaveRequest | undefined>;
  getUserLeaveRequests(userId: string): Promise<LeaveRequest[]>;
  getPendingLeaveRequests(): Promise<(LeaveRequest & { user: User })[]>;
  getAllLeaveRequests(): Promise<LeaveRequest[]>;
  updateLeaveRequest(id: string, updates: Partial<LeaveRequest>): Promise<LeaveRequest | undefined>;
 
  // Salary Advance Requests
  createSalaryAdvanceRequest(request: InsertSalaryAdvanceRequest): Promise<SalaryAdvanceRequest>;
  getUserSalaryAdvanceRequests(userId: string): Promise<SalaryAdvanceRequest[]>;
  getPendingSalaryAdvanceRequests(): Promise<(SalaryAdvanceRequest & { user: User })[]>;
  updateSalaryAdvanceRequest(id: string, updates: Partial<SalaryAdvanceRequest>): Promise<SalaryAdvanceRequest | undefined>;
 
  // Notifications
  createNotification(userId: string, title: string, message: string, type: string): Promise<Notification>;
  getUserNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<void>;
 
  // Analytics
  getUserProductivityStats(userId: string, startDate: Date, endDate: Date): Promise<any>;
  getDepartmentStats(): Promise<any>;
  getSystemStats(): Promise<any>;
 
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  // Auth & Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id));
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isActive, true));
  }

  // Tasks
  async createTask(task: InsertTask): Promise<Task> {
    console.log('Raw task data:', task);
    const fixedTask = {
      ...task,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      companyName: task.companyName || null,
    } as typeof tasks.$inferInsert;
    console.log('Fixed task data:', fixedTask);
    const [createdTask] = await db.insert(tasks).values(fixedTask).returning();
    return createdTask;
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getUserTasks(userId: string): Promise<Task[]> {
    return await db
      .select({
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
        performanceRating: tasks.performanceRating,
        ratedBy: tasks.ratedBy,
        ratedAt: tasks.ratedAt,
        tags: tasks.tags,
        attachments: tasks.attachments,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        createdByUser: users,
        assignedToUser: users,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.createdBy, users.id))
      .where(eq(tasks.createdBy, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async getAssignedTasks(userId: string): Promise<Task[]> {
    return await db
      .select({
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
        performanceRating: tasks.performanceRating,
        ratedBy: tasks.ratedBy,
        ratedAt: tasks.ratedAt,
        tags: tasks.tags,
        attachments: tasks.attachments,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        createdByUser: users,
        assignedToUser: users,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(eq(tasks.assignedTo, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined> {
    const now = new Date();
    const fixedUpdates = {
      ...updates,
      updatedAt: updates.updatedAt ? new Date(updates.updatedAt) : now,
      dueDate: updates.dueDate ? new Date(updates.dueDate) : updates.dueDate,
      companyName: updates.companyName || null,
    };
    const [task] = await db
      .update(tasks)
      .set(fixedUpdates)
      .where(eq(tasks.id, id))
      .returning();
    return task || undefined;
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result.rowCount! > 0;
  }

  async getAllTasks(): Promise<Task[]> {
    return await db
      .select({
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
        performanceRating: tasks.performanceRating,
        ratedBy: tasks.ratedBy,
        ratedAt: tasks.ratedAt,
        tags: tasks.tags,
        attachments: tasks.attachments,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        createdByUser: users,
        assignedToUser: users,
      })
      .from(tasks)
      .leftJoin(users, or(eq(tasks.createdBy, users.id), eq(tasks.assignedTo, users.id)))
      .orderBy(desc(tasks.createdAt));
  }

  async rateTask(taskId: string, rating: number, ratedBy: string): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({
        performanceRating: rating,
        ratedBy,
        ratedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(tasks.id, taskId))
      .returning();
    
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.assignedTo) {
      await db
        .update(users)
        .set({
          totalPoints: sql`total_points + ${rating}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, task.assignedTo));
    }

    return task;
  }

  async approveTaskReview(taskId: string, approverId: string): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.status, 'under_review')
      ))
      .returning();
    
    if (!task) {
      throw new Error('Task not found or not under review');
    }

    return task;
  }

  // Task Collaborators
  async addTaskCollaborator(taskId: string, userId: string): Promise<void> {
    await db.insert(taskCollaborators).values({ taskId, userId });
  }

  async removeTaskCollaborator(taskId: string, userId: string): Promise<void> {
    await db
      .delete(taskCollaborators)
      .where(and(
        eq(taskCollaborators.taskId, taskId),
        eq(taskCollaborators.userId, userId)
      ));
  }

  async getTaskCollaborators(taskId: string): Promise<User[]> {
    const result = await db
      .select({ user: users })
      .from(taskCollaborators)
      .innerJoin(users, eq(taskCollaborators.userId, users.id))
      .where(eq(taskCollaborators.taskId, taskId));
   
    return result.map(r => r.user);
  }

  // Task Notes
  async createTaskNote(taskId: string, userId: string, content: string): Promise<TaskNote> {
    const [note] = await db
      .insert(taskNotes)
      .values({ taskId, userId, content })
      .returning();
    return note;
  }

  async getTaskNotes(taskId: string): Promise<TaskNote[]> {
    return await db
      .select()
      .from(taskNotes)
      .where(eq(taskNotes.taskId, taskId))
      .orderBy(desc(taskNotes.createdAt));
  }

  // AUX Sessions
  async startAuxSession(session: InsertAuxSession): Promise<AuxSession> {
    await db
      .update(auxSessions)
      .set({
        endTime: new Date(),
        duration: sql`EXTRACT(epoch FROM (NOW() - start_time))::integer`
      })
      .where(and(
        eq(auxSessions.userId, session.userId),
        isNull(auxSessions.endTime)
      ));
    const [newSession] = await db.insert(auxSessions).values(session).returning();
    return newSession;
  }

  async endAuxSession(sessionId: string, notes?: string): Promise<AuxSession | undefined> {
    const [session] = await db
      .update(auxSessions)
      .set({
        endTime: new Date(),
        duration: sql`EXTRACT(epoch FROM (NOW() - start_time))::integer`,
        notes: notes || null
      })
      .where(eq(auxSessions.id, sessionId))
      .returning();
    return session || undefined;
  }

  async getCurrentAuxSession(userId: string): Promise<AuxSession | undefined> {
    const [session] = await db
      .select()
      .from(auxSessions)
      .where(and(
        eq(auxSessions.userId, userId),
        isNull(auxSessions.endTime)
      ));
    return session || undefined;
  }

  async getUserAuxSessions(userId: string, startDate?: Date, endDate?: Date): Promise<AuxSession[]> {
    const conditions = [eq(auxSessions.userId, userId)];
   
    if (startDate) {
      conditions.push(gte(auxSessions.startTime, startDate));
    }
   
    if (endDate) {
      conditions.push(lte(auxSessions.startTime, endDate));
    }
   
    return await db.select().from(auxSessions)
      .where(and(...conditions))
      .orderBy(desc(auxSessions.startTime));
  }

  async getAllActiveAuxSessions(): Promise<(AuxSession & { user: User })[]> {
    const result = await db
      .select({
        id: auxSessions.id,
        userId: auxSessions.userId,
        status: auxSessions.status,
        startTime: auxSessions.startTime,
        endTime: auxSessions.endTime,
        duration: auxSessions.duration,
        notes: auxSessions.notes,
        createdAt: auxSessions.createdAt,
        user: users
      })
      .from(auxSessions)
      .innerJoin(users, eq(auxSessions.userId, users.id))
      .where(and(
        isNull(auxSessions.endTime),
        eq(users.isActive, true)
      ))
      .orderBy(auxSessions.startTime);
   
    return result;
  }

  async getAllAuxSessions(): Promise<AuxSession[]> {
    return await db
      .select()
      .from(auxSessions)
      .orderBy(desc(auxSessions.startTime));
  }

  // Leave Requests
  async createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest> {
    const [leaveRequest] = await db.insert(leaveRequests).values(request).returning();
    return leaveRequest;
  }

  async getLeaveRequest(id: string): Promise<LeaveRequest | undefined> {
    const [request] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    return request || undefined;
  }

  async getUserLeaveRequests(userId: string): Promise<LeaveRequest[]> {
    return await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.userId, userId))
      .orderBy(desc(leaveRequests.createdAt));
  }

  async getPendingLeaveRequests(): Promise<(LeaveRequest & { user: User })[]> {
    const result = await db
      .select({
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
      })
      .from(leaveRequests)
      .innerJoin(users, eq(leaveRequests.userId, users.id))
      .where(eq(leaveRequests.status, 'pending'))
      .orderBy(desc(leaveRequests.createdAt));
   
    return result;
  }

  async getAllLeaveRequests(): Promise<LeaveRequest[]> {
    return await db
      .select()
      .from(leaveRequests)
      .orderBy(desc(leaveRequests.createdAt));
  }

  async updateLeaveRequest(id: string, updates: Partial<LeaveRequest>): Promise<LeaveRequest | undefined> {
    const now = new Date();
    const fixedUpdates = {
      ...updates,
      updatedAt: updates.updatedAt ? new Date(updates.updatedAt) : now,
      startDate: updates.startDate ? new Date(updates.startDate) : updates.startDate,
      endDate: updates.endDate ? new Date(updates.endDate) : updates.endDate,
      approvedAt: updates.approvedAt ? new Date(updates.approvedAt) : updates.approvedAt,
    };
    const [request] = await db
      .update(leaveRequests)
      .set(fixedUpdates)
      .where(eq(leaveRequests.id, id))
      .returning();
    return request || undefined;
  }

  // Salary Advance Requests
  async createSalaryAdvanceRequest(request: InsertSalaryAdvanceRequest): Promise<SalaryAdvanceRequest> {
    const [advanceRequest] = await db.insert(salaryAdvanceRequests).values(request).returning();
    return advanceRequest;
  }

  async getUserSalaryAdvanceRequests(userId: string): Promise<SalaryAdvanceRequest[]> {
    return await db
      .select()
      .from(salaryAdvanceRequests)
      .where(eq(salaryAdvanceRequests.userId, userId))
      .orderBy(desc(salaryAdvanceRequests.createdAt));
  }

  async getPendingSalaryAdvanceRequests(): Promise<(SalaryAdvanceRequest & { user: User })[]> {
    const result = await db
      .select({
        id: salaryAdvanceRequests.id,
        userId: salaryAdvanceRequests.userId,
        amount: salaryAdvanceRequests.amount,
        reason: salaryAdvanceRequests.reason,
        status: salaryAdvanceRequests.status,
        approvedBy: salaryAdvanceRequests.approvedBy,
        approvedAt: salaryAdvanceRequests.approvedAt,
        rejectionReason: salaryAdvanceRequests.rejectionReason,
        repaymentDate: salaryAdvanceRequests.repaymentDate,
        createdAt: salaryAdvanceRequests.createdAt,
        updatedAt: salaryAdvanceRequests.updatedAt,
        user: users
      })
      .from(salaryAdvanceRequests)
      .innerJoin(users, eq(salaryAdvanceRequests.userId, users.id))
      .where(eq(salaryAdvanceRequests.status, 'pending'))
      .orderBy(desc(salaryAdvanceRequests.createdAt));
   
    return result;
  }

  async updateSalaryAdvanceRequest(id: string, updates: Partial<SalaryAdvanceRequest>): Promise<SalaryAdvanceRequest | undefined> {
    const now = new Date();
    const fixedUpdates = {
      ...updates,
      updatedAt: updates.updatedAt ? new Date(updates.updatedAt) : now,
      approvedAt: updates.approvedAt ? new Date(updates.approvedAt) : updates.approvedAt,
      repaymentDate: updates.repaymentDate ? new Date(updates.repaymentDate) : updates.repaymentDate,
    };
    const [request] = await db
      .update(salaryAdvanceRequests)
      .set(fixedUpdates)
      .where(eq(salaryAdvanceRequests.id, id))
      .returning();
    return request || undefined;
  }

  // Notifications
  async createNotification(userId: string, title: string, message: string, type: string): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values({ userId, title, message, type })
      .returning();
    return notification;
  }

  async getUserNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]> {
    const conditions = [eq(notifications.userId, userId)];
   
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }
   
    return await db.select().from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  // Analytics
  async getUserProductivityStats(userId: string, startDate: Date, endDate: Date): Promise<any> {
    const result = await db
      .select({
        status: auxSessions.status,
        totalDuration: sql<number>`SUM(COALESCE(duration, EXTRACT(epoch FROM (NOW() - start_time))::integer))`,
        sessionCount: count()
      })
      .from(auxSessions)
      .where(and(
        eq(auxSessions.userId, userId),
        gte(auxSessions.startTime, startDate),
        lte(auxSessions.startTime, endDate)
      ))
      .groupBy(auxSessions.status);
   
    return result;
  }

  async getDepartmentStats(): Promise<any> {
    const result = await db
      .select({
        department: users.department,
        employeeCount: count(),
        activeEmployees: sql<number>`COUNT(*) FILTER (WHERE is_active = true)`
      })
      .from(users)
      .groupBy(users.department);
   
    return result;
  }

  async getSystemStats(): Promise<any> {
    const [stats] = await db
      .select({
        totalUsers: count(users.id),
        activeUsers: sql<number>`COUNT(*) FILTER (WHERE is_active = true)`,
        totalTasks: sql<number>`(SELECT COUNT(*) FROM ${tasks})`,
        completedTasks: sql<number>`(SELECT COUNT(*) FROM ${tasks} WHERE status = 'completed')`,
        pendingLeaveRequests: sql<number>`(SELECT COUNT(*) FROM ${leaveRequests} WHERE status = 'pending')`
      })
      .from(users);
   
    return stats;
  }
}

export const storage = new DatabaseStorage();
