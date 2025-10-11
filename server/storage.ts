
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
  chatRooms,
  chatRoomMembers,
  chatMessages,
  messageReactions,
  meetings,
  meetingParticipants,
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
  type ChatRoom,
  type InsertChatRoom,
  type ChatMessage,
  type InsertChatMessage,
  type ChatRoomMember,
  type MessageReaction,
  type Meeting,
  type InsertMeeting,
  type MeetingParticipant,
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
  deleteUser(id: string): Promise<boolean>;
 
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
  // Chat Rooms
  createChatRoom(room: InsertChatRoom): Promise<ChatRoom>;
  getOrCreatePrivateChat(user1Id: string, user2Id: string): Promise<ChatRoom>;
  getUserChatRooms(userId: string): Promise<(ChatRoom & { members: User[], lastMessage?: ChatMessage })[]>;
  getChatRoom(roomId: string): Promise<ChatRoom | undefined>;
  addChatRoomMember(roomId: string, userId: string): Promise<void>;

  // Chat Messages
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(roomId: string, limit?: number): Promise<(ChatMessage & { sender: User, reactions: MessageReaction[] })[]>;
  updateChatMessage(messageId: string, content: string): Promise<ChatMessage | undefined>;
  deleteChatMessage(messageId: string): Promise<boolean>;

  // Message Reactions
  addMessageReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction>;
  removeMessageReaction(messageId: string, userId: string, emoji: string): Promise<void>;

  // Meetings
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  addMeetingParticipant(meetingId: string, userId: string): Promise<void>;
  getUserMeetings(userId: string): Promise<Meeting[]>;
  getMeeting(meetingId: string): Promise<(Meeting & { participants: User[] }) | undefined>;

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

  async deleteUser(id: string): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
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
        rewardPoints: tasks.rewardPoints,
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
        rewardPoints: tasks.rewardPoints,
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
        rewardPoints: tasks.rewardPoints,
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
  // Chat Rooms
  async createChatRoom(room: InsertChatRoom): Promise<ChatRoom> {
    const [chatRoom] = await db.insert(chatRooms).values(room).returning();
    return chatRoom;
  }

  async getOrCreatePrivateChat(user1Id: string, user2Id: string): Promise<ChatRoom & { members: User[] }> {
    const existingRooms = await db
      .select({
        room: chatRooms,
      })
      .from(chatRooms)
      .innerJoin(chatRoomMembers, eq(chatRooms.id, chatRoomMembers.roomId))
      .where(
        and(
          eq(chatRooms.type, 'private'),
          or(
            eq(chatRoomMembers.userId, user1Id),
            eq(chatRoomMembers.userId, user2Id)
          )
        )
      )
      .groupBy(chatRooms.id)
      .having(sql`COUNT(DISTINCT ${chatRoomMembers.userId}) = 2`);

    let roomId: string;
    if (existingRooms.length > 0) {
      roomId = existingRooms[0].room.id;
    } else {
      const [newRoom] = await db.insert(chatRooms).values({
        type: 'private',
        createdBy: user1Id,
      }).returning();
      roomId = newRoom.id;

      await db.insert(chatRoomMembers).values([
        { roomId: newRoom.id, userId: user1Id },
        { roomId: newRoom.id, userId: user2Id },
      ]);
    }

    const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, roomId));
    const members = await db
      .select({ user: users })
      .from(chatRoomMembers)
      .innerJoin(users, eq(chatRoomMembers.userId, users.id))
      .where(eq(chatRoomMembers.roomId, roomId));

    return {
      ...room,
      members: members.map(m => m.user),
    };
  }

  async getOrCreateCommonRoom(): Promise<ChatRoom> {
    const [existingRoom] = await db
      .select()
      .from(chatRooms)
      .where(and(
        eq(chatRooms.type, 'group'),
        eq(chatRooms.name, 'الغرفة العامة')
      ))
      .limit(1);

    if (existingRoom) {
      return existingRoom;
    }

    const [firstUser] = await db.select().from(users).limit(1);
    const [commonRoom] = await db.insert(chatRooms).values({
      name: 'الغرفة العامة',
      type: 'group',
      createdBy: firstUser?.id || sql`gen_random_uuid()`,
    }).returning();

    const allUsers = await db.select().from(users);
    const memberValues = allUsers.map(user => ({
      roomId: commonRoom.id,
      userId: user.id,
    }));

    if (memberValues.length > 0) {
      await db.insert(chatRoomMembers).values(memberValues);
    }

    return commonRoom;
  }

  async ensureUserInCommonRoom(userId: string): Promise<void> {
    const commonRoom = await this.getOrCreateCommonRoom();
    
    const [existing] = await db
      .select()
      .from(chatRoomMembers)
      .where(and(
        eq(chatRoomMembers.roomId, commonRoom.id),
        eq(chatRoomMembers.userId, userId)
      ))
      .limit(1);

    if (!existing) {
      await db.insert(chatRoomMembers).values({
        roomId: commonRoom.id,
        userId: userId,
      });
    }
  }

  async getUserChatRooms(userId: string): Promise<(ChatRoom & { members: User[], lastMessage?: ChatMessage })[]> {
    const rooms = await db
      .select({
        room: chatRooms,
      })
      .from(chatRoomMembers)
      .innerJoin(chatRooms, eq(chatRoomMembers.roomId, chatRooms.id))
      .where(eq(chatRoomMembers.userId, userId))
      .orderBy(desc(chatRooms.updatedAt));

    const result = [];
    for (const { room } of rooms) {
      const members = await db
        .select({ user: users })
        .from(chatRoomMembers)
        .innerJoin(users, eq(chatRoomMembers.userId, users.id))
        .where(eq(chatRoomMembers.roomId, room.id));

      const [lastMessage] = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.roomId, room.id))
        .orderBy(desc(chatMessages.createdAt))
        .limit(1);

      result.push({
        ...room,
        members: members.map(m => m.user),
        lastMessage,
      });
    }

    return result;
  }

  async getChatRoom(roomId: string): Promise<ChatRoom | undefined> {
    const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, roomId));
    return room || undefined;
  }

  async addChatRoomMember(roomId: string, userId: string): Promise<void> {
    await db.insert(chatRoomMembers).values({ roomId, userId });
  }

  // Chat Messages
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const messageData = {
      roomId: message.roomId,
      senderId: message.senderId,
      content: message.content || null,
      messageType: message.messageType || 'text',
      attachments: message.attachments || null,
      replyTo: message.replyTo || null,
    } as typeof chatMessages.$inferInsert;
    const [chatMessage] = await db.insert(chatMessages).values(messageData).returning();
    
    await db
      .update(chatRooms)
      .set({ updatedAt: new Date() })
      .where(eq(chatRooms.id, message.roomId));

    return chatMessage;
  }

  async getChatMessages(roomId: string, limit: number = 50): Promise<(ChatMessage & { sender: User, reactions: MessageReaction[] })[]> {
    const messages = await db
      .select({
        message: chatMessages,
        sender: users,
      })
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.senderId, users.id))
      .where(eq(chatMessages.roomId, roomId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);

    const result = [];
    for (const { message, sender } of messages) {
      const reactions = await db
        .select()
        .from(messageReactions)
        .where(eq(messageReactions.messageId, message.id));

      result.push({
        ...message,
        sender,
        reactions,
      });
    }

    return result.reverse();
  }

  async updateChatMessage(messageId: string, content: string): Promise<ChatMessage | undefined> {
    const [message] = await db
      .update(chatMessages)
      .set({ content, isEdited: true, updatedAt: new Date() })
      .where(eq(chatMessages.id, messageId))
      .returning();
    return message || undefined;
  }

  async deleteChatMessage(messageId: string): Promise<boolean> {
    const result = await db.delete(chatMessages).where(eq(chatMessages.id, messageId));
    return result.rowCount! > 0;
  }

  // Message Reactions
  async addMessageReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction> {
    const [reaction] = await db
      .insert(messageReactions)
      .values({ messageId, userId, emoji })
      .returning();
    return reaction;
  }

  async removeMessageReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await db
      .delete(messageReactions)
      .where(and(
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.userId, userId),
        eq(messageReactions.emoji, emoji)
      ));
  }

  // Meetings
  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const [newMeeting] = await db.insert(meetings).values(meeting).returning();
    return newMeeting;
  }

  async addMeetingParticipant(meetingId: string, userId: string): Promise<void> {
    await db.insert(meetingParticipants).values({ meetingId, userId });
  }

  async getUserMeetings(userId: string): Promise<Meeting[]> {
    const result = await db
      .select({ meeting: meetings })
      .from(meetingParticipants)
      .innerJoin(meetings, eq(meetingParticipants.meetingId, meetings.id))
      .where(eq(meetingParticipants.userId, userId))
      .orderBy(desc(meetings.startTime));

    return result.map(r => r.meeting);
  }

  async getMeeting(meetingId: string): Promise<(Meeting & { participants: User[] }) | undefined> {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, meetingId));
    if (!meeting) return undefined;

    const participants = await db
      .select({ user: users })
      .from(meetingParticipants)
      .innerJoin(users, eq(meetingParticipants.userId, users.id))
      .where(eq(meetingParticipants.meetingId, meetingId));

    return {
      ...meeting,
      participants: participants.map(p => p.user),
    };
  }
}

export const storage = new DatabaseStorage();

