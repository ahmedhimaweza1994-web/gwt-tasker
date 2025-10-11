import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { createGoogleMeetEvent } from "./google-calendar";

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "المصادقة مطلوبة" });
  }
  next();
}

function requireRole(roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "غير مصرح لك بالوصول" });
    }
    next();
  };
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Task routes
  app.get("/api/tasks", requireAuth, requireRole(['admin', 'sub-admin']), async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب المهام" });
    }
  });

  app.get("/api/tasks/my", requireAuth, async (req, res) => {
    try {
      const tasks = await storage.getUserTasks(req.user!.id);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب المهام" });
    }
  });

  app.get("/api/tasks/assigned", requireAuth, async (req, res) => {
    try {
      const tasks = await storage.getAssignedTasks(req.user!.id);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب المهام المعينة" });
    }
  });

  app.get("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "المهمة غير موجودة" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب المهمة" });
    }
  });

  app.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const taskData = {
        ...req.body,
        createdBy: req.user!.id,
        companyName: req.body.companyName || null,
      };
      const task = await storage.createTask(taskData);
      
      // Send notification if assigned to someone
      if (task.assignedTo && task.assignedTo !== req.user!.id) {
        await storage.createNotification(
          task.assignedTo,
          "مهمة جديدة معينة لك",
          `تم تعيين مهمة "${task.title}" لك`,
          "info"
        );
      }
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "حدث خطأ في إنشاء المهمة" });
    }
  });

  app.put("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      // Get the existing task first
      const existingTask = await storage.getTask(req.params.id);
      if (!existingTask) {
        return res.status(404).json({ message: "المهمة غير موجودة" });
      }

      // Check if trying to update status to 'completed'
      if (req.body.status === 'completed') {
        const isCreator = existingTask.createdBy === req.user!.id;
        const isAdminOrSubAdmin = req.user!.role === 'admin' || req.user!.role === 'sub-admin';

        if (isCreator || isAdminOrSubAdmin) {
          // Allow direct completion and set completedAt
          const task = await storage.updateTask(req.params.id, {
            ...req.body,
            completedAt: new Date()
          });
          res.json(task);
        } else {
          // Change status to 'under_review' instead
          const task = await storage.updateTask(req.params.id, {
            ...req.body,
            status: 'under_review'
          });

          // Notify the task creator
          if (existingTask.createdBy) {
            await storage.createNotification(
              existingTask.createdBy,
              "مهمة جاهزة للمراجعة",
              `المهمة "${existingTask.title}" جاهزة للمراجعة`,
              "info"
            );
          }

          res.json(task);
        }
      } else {
        // Normal update for other status changes
        const task = await storage.updateTask(req.params.id, req.body);
        res.json(task);
      }
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في تحديث المهمة" });
    }
  });

  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteTask(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "المهمة غير موجودة" });
      }
      res.json({ message: "تم حذف المهمة بنجاح" });
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في حذف المهمة" });
    }
  });

  // Task review and rating routes
  app.put("/api/tasks/:id/submit-review", requireAuth, async (req, res) => {
    try {
      // First fetch the task to verify ownership
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "المهمة غير موجودة" });
      }
      
      // Check if user is authorized (must be assignee or creator)
      if (task.assignedTo !== req.user!.id && task.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "غير مصرح لك بتقديم هذه المهمة للمراجعة" });
      }
      
      const updatedTask = await storage.updateTask(req.params.id, { status: 'under_review' });
      
      // Notify the task creator/admin
      if (task.createdBy && task.createdBy !== req.user!.id) {
        await storage.createNotification(
          task.createdBy,
          "مهمة جاهزة للمراجعة",
          `المهمة "${task.title}" جاهزة للمراجعة`,
          "info"
        );
      }
      
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في تقديم المهمة للمراجعة" });
    }
  });

  app.put("/api/tasks/:id/approve-review", requireAuth, requireRole(['admin', 'sub-admin']), async (req, res) => {
    try {
      const task = await storage.approveTaskReview(req.params.id, req.user!.id);
      if (!task) {
        return res.status(404).json({ message: "المهمة غير موجودة" });
      }
      
      // Notify the assignee
      if (task.assignedTo) {
        await storage.createNotification(
          task.assignedTo,
          "تمت الموافقة على المهمة",
          `تمت الموافقة على مهمتك "${task.title}" وتم إكمالها بنجاح`,
          "success"
        );
      }
      
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في الموافقة على المهمة" });
    }
  });

  app.put("/api/tasks/:id/rate", requireAuth, requireRole(['admin', 'sub-admin']), async (req, res) => {
    try {
      const { rating } = req.body;
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "يجب أن يكون التقييم بين 1 و 5" });
      }
      
      // Fetch task to check if already rated (idempotency check)
      const existingTask = await storage.getTask(req.params.id);
      if (!existingTask) {
        return res.status(404).json({ message: "المهمة غير موجودة" });
      }
      
      if (existingTask.performanceRating) {
        return res.status(400).json({ message: "تم تقييم هذه المهمة مسبقاً" });
      }
      
      const task = await storage.rateTask(req.params.id, rating, req.user!.id);
      
      // Notify the assignee about the rating
      if (task.assignedTo) {
        await storage.createNotification(
          task.assignedTo,
          "تم تقييم مهمتك",
          `تم تقييم مهمتك "${task.title}" بـ ${rating} نقاط`,
          "info"
        );
      }
      
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في تقييم المهمة" });
    }
  });

  app.put("/api/tasks/:id/assign-points", requireAuth, requireRole(['admin', 'sub-admin']), async (req, res) => {
    try {
      const { rewardPoints } = req.body;
      
      // Validate rewardPoints
      if (rewardPoints === undefined || rewardPoints === null || typeof rewardPoints !== 'number' || rewardPoints < 0) {
        return res.status(400).json({ message: "يجب تحديد نقاط مكافأة صحيحة" });
      }

      // Get the task
      const existingTask = await storage.getTask(req.params.id);
      if (!existingTask) {
        return res.status(404).json({ message: "المهمة غير موجودة" });
      }

      // Update task's rewardPoints
      const task = await storage.updateTask(req.params.id, { rewardPoints });

      // If task is assigned to someone, add points to their totalPoints
      if (task && task.assignedTo) {
        const assignedUser = await storage.getUser(task.assignedTo);
        if (assignedUser) {
          const newTotalPoints = (assignedUser.totalPoints || 0) + rewardPoints;
          await storage.updateUser(task.assignedTo, { totalPoints: newTotalPoints });

          // Notify the assigned user about the reward points
          await storage.createNotification(
            task.assignedTo,
            "نقاط مكافأة جديدة",
            `تم منحك ${rewardPoints} نقطة مكافأة للمهمة "${task.title}"`,
            "success"
          );
        }
      }

      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في تعيين نقاط المكافأة" });
    }
  });

  // AUX Session routes
  app.post("/api/aux/start", requireAuth, async (req, res) => {
    try {
      const session = await storage.startAuxSession({
        userId: req.user!.id,
        status: req.body.status,
        notes: req.body.notes,
      });
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في بدء الجلسة" });
    }
  });

  app.post("/api/aux/end/:id", requireAuth, async (req, res) => {
    try {
      const session = await storage.endAuxSession(req.params.id, req.body.notes);
      if (!session) {
        return res.status(404).json({ message: "الجلسة غير موجودة" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في إنهاء الجلسة" });
    }
  });

  app.get("/api/aux/current", requireAuth, async (req, res) => {
    try {
      const session = await storage.getCurrentAuxSession(req.user!.id);
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب الجلسة الحالية" });
    }
  });

  app.get("/api/aux/sessions", requireAuth, async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const sessions = await storage.getUserAuxSessions(req.user!.id, startDate, endDate);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب الجلسات" });
    }
  });

  // Admin routes
  app.get("/api/admin/employees", requireAuth, requireRole(['admin', 'sub-admin']), async (req, res) => {
    try {
      const employees = await storage.getAllActiveAuxSessions();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب بيانات الموظفين" });
    }
  });

  app.get("/api/admin/stats", requireAuth, requireRole(['admin', 'sub-admin']), async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب الإحصائيات" });
    }
  });

  // Users routes
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users.map(user => ({
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
      res.status(500).json({ message: "حدث خطأ في جلب المستخدمين" });
    }
  });

  app.post("/api/admin/employees", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(req.body.password || 'Employee@123', 10);
      
      const newEmployee = await storage.createUser({
        email: req.body.email,
        password: hashedPassword,
        fullName: req.body.fullName,
        department: req.body.department,
        jobTitle: req.body.jobTitle,
        role: req.body.role || 'employee',
        phoneNumber: req.body.phoneNumber,
        address: req.body.address,
        salary: req.body.salary || 0,
        hireDate: req.body.hireDate || new Date(),
        isActive: true,
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
      res.status(500).json({ message: "حدث خطأ في إضافة الموظف" });
    }
  });

  app.put("/api/admin/employees/:id", requireAuth, requireRole(['admin', 'sub-admin']), async (req, res) => {
    try {
      const updates: any = {
        fullName: req.body.fullName,
        department: req.body.department,
        jobTitle: req.body.jobTitle,
        phoneNumber: req.body.phoneNumber,
        address: req.body.address,
        salary: req.body.salary,
        isActive: req.body.isActive,
      };
      
      const updatedEmployee = await storage.updateUser(req.params.id, updates);
      if (!updatedEmployee) {
        return res.status(404).json({ message: "الموظف غير موجود" });
      }
      
      res.json(updatedEmployee);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في تحديث بيانات الموظف" });
    }
  });

  app.delete("/api/admin/employees/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      // Prevent deleting yourself
      if (req.params.id === req.user!.id) {
        return res.status(400).json({ message: "لا يمكنك حذف حسابك الخاص" });
      }

      const success = await storage.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      
      res.json({ message: "تم حذف المستخدم بنجاح" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "حدث خطأ في حذف المستخدم" });
    }
  });

  // Profile routes
  app.get("/api/profile/:id", requireAuth, async (req, res) => {
    try {
      const users = await storage.getUsers();
      const user = users.find(u => u.id === req.params.id);
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
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
        isActive: user.isActive,
      });
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب الملف الشخصي" });
    }
  });

  app.put("/api/profile", requireAuth, async (req, res) => {
    try {
      const updatedUser = await storage.updateUser(req.user!.id, {
        fullName: req.body.fullName,
        department: req.body.department,
        jobTitle: req.body.jobTitle,
        bio: req.body.bio,
        phoneNumber: req.body.phoneNumber,
        address: req.body.address,
        dateOfBirth: req.body.dateOfBirth,
        hireDate: req.body.hireDate,
      });
      if (!updatedUser) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في تحديث الملف الشخصي" });
    }
  });

  // Leave requests routes
  app.post("/api/leaves", requireAuth, async (req, res) => {
    try {
      // Validate and calculate days automatically from start and end dates
      const startDate = new Date(req.body.startDate);
      const endDate = new Date(req.body.endDate);
      
      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "تواريخ غير صالحة" });
      }
      
      if (startDate > endDate) {
        return res.status(400).json({ message: "تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية" });
      }
      
      // Normalize to start of day to avoid time-based miscalculations
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      // Calculate inclusive day count (at least 1)
      const days = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      
      // Explicitly construct payload with whitelisted fields only
      const leaveRequest = await storage.createLeaveRequest({
        userId: req.user!.id,
        type: req.body.type,
        startDate: startDate,
        endDate: endDate,
        days,
        reason: req.body.reason || '',
      });
      
      // Notify admins
      const admins = await storage.getUsers();
      const adminUsers = admins.filter(u => u.role === 'admin' || u.role === 'sub-admin');
      
      for (const admin of adminUsers) {
        const notification = await storage.createNotification(
          admin.id,
          "طلب إجازة جديد",
          `${req.user!.fullName} قدم طلب إجازة جديد`,
          "info"
        );
        
        // Broadcast notification via WebSocket
        wss.clients.forEach((client) => {
          if (client.readyState === client.OPEN) {
            client.send(JSON.stringify({
              type: 'new_notification',
              data: notification
            }));
          }
        });
      }
      
      res.status(201).json(leaveRequest);
    } catch (error) {
      console.error('Error creating leave request:', error);
      res.status(500).json({ message: "حدث خطأ في تقديم طلب الإجازة" });
    }
  });

  app.get("/api/leaves/my", requireAuth, async (req, res) => {
    try {
      const requests = await storage.getUserLeaveRequests(req.user!.id);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب طلبات الإجازات" });
    }
  });

  app.get("/api/leaves/pending", requireAuth, requireRole(['admin', 'sub-admin']), async (req, res) => {
    try {
      const requests = await storage.getPendingLeaveRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب طلبات الإجازات" });
    }
  });

  app.put("/api/leaves/:id", requireAuth, requireRole(['admin', 'sub-admin']), async (req, res) => {
    try {
      const updates = {
        ...req.body,
        approvedBy: req.user!.id,
        approvedAt: new Date(),
      };
      
      const leaveRequest = await storage.updateLeaveRequest(req.params.id, updates);
      if (!leaveRequest) {
        return res.status(404).json({ message: "طلب الإجازة غير موجود" });
      }
      
      // Notify employee
      const statusText = leaveRequest.status === 'approved' ? 'تمت الموافقة على' : 'تم رفض';
      const notification = await storage.createNotification(
        leaveRequest.userId,
        "تحديث طلب الإجازة",
        `${statusText} طلب الإجازة الخاص بك`,
        leaveRequest.status === 'approved' ? 'success' : 'error'
      );
      
      // Broadcast notification via WebSocket
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify({
            type: 'new_notification',
            data: notification
          }));
        }
      });
      
      res.json(leaveRequest);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في تحديث طلب الإجازة" });
    }
  });

  // Salary Advance Request routes
  app.post("/api/salary-advances", requireAuth, async (req, res) => {
    try {
      const advanceRequest = await storage.createSalaryAdvanceRequest({
        userId: req.user!.id,
        amount: req.body.amount,
        reason: req.body.reason,
        repaymentDate: req.body.repaymentDate ? new Date(req.body.repaymentDate) : null,
      });
      
      res.status(201).json(advanceRequest);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في إنشاء طلب السلفة" });
    }
  });

  app.get("/api/salary-advances/pending", requireAuth, requireRole(['admin', 'sub-admin']), async (req, res) => {
    try {
      const requests = await storage.getPendingSalaryAdvanceRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب طلبات السلف" });
    }
  });

  app.get("/api/salary-advances/user", requireAuth, async (req, res) => {
    try {
      const requests = await storage.getUserSalaryAdvanceRequests(req.user!.id);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب طلبات السلف" });
    }
  });

  app.put("/api/salary-advances/:id", requireAuth, requireRole(['admin', 'sub-admin']), async (req, res) => {
    try {
      const updates = {
        ...req.body,
        approvedBy: req.user!.id,
        approvedAt: new Date(),
      };
      
      const advanceRequest = await storage.updateSalaryAdvanceRequest(req.params.id, updates);
      if (!advanceRequest) {
        return res.status(404).json({ message: "طلب السلفة غير موجود" });
      }
      
      // Notify employee
      const statusText = advanceRequest.status === 'approved' ? 'تمت الموافقة على' : 'تم رفض';
      await storage.createNotification(
        advanceRequest.userId,
        "تحديث طلب السلفة",
        `${statusText} طلب السلفة الخاص بك`,
        advanceRequest.status === 'approved' ? 'success' : 'error'
      );
      
      res.json(advanceRequest);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في تحديث طلب السلفة" });
    }
  });

  // Notifications routes
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.user!.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب الإشعارات" });
    }
  });

  app.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ message: "تم تحديث الإشعار" });
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في تحديث الإشعار" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/productivity", requireAuth, async (req, res) => {
    try {
      const startDate = new Date(req.query.startDate as string || Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date(req.query.endDate as string || Date.now());
      const stats = await storage.getUserProductivityStats(req.user!.id, startDate, endDate);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب إحصائيات الإنتاجية" });
    }
  });

  app.get("/api/analytics/departments", requireAuth, requireRole(['admin', 'sub-admin']), async (req, res) => {
    try {
      const stats = await storage.getDepartmentStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب إحصائيات الأقسام" });
    }
  });

  // HR Routes
  app.get("/api/hr/stats", requireAuth, requireRole(['admin', 'sub-admin']), async (req, res) => {
    try {
      const users = await storage.getUsers();
      const activeEmployees = await storage.getAllActiveAuxSessions();
      const pendingLeaves = await storage.getPendingLeaveRequests();
      const allLeaves = await storage.getAllLeaveRequests();
      
      const totalEmployees = users.filter(u => u.isActive).length;
      const presentToday = activeEmployees.filter(e => e.status === 'working_on_project' || e.status === 'ready').length;
      const onLeave = allLeaves.filter(l => 
        l.status === 'approved' && 
        new Date(l.startDate) <= new Date() && 
        new Date(l.endDate) >= new Date()
      ).length;
      const pendingRequests = pendingLeaves.length;
      
      res.json({
        totalEmployees,
        presentToday,
        onLeave,
        pendingRequests,
      });
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب إحصائيات الموارد البشرية" });
    }
  });

  app.get("/api/hr/payroll", requireAuth, requireRole(['admin', 'sub-admin']), async (req, res) => {
    try {
      const users = await storage.getUsers();
      const activeUsers = users.filter(u => u.isActive);
      
      const payrollData = activeUsers.map(user => ({
        id: user.id,
        employee: user.fullName,
        department: user.department || 'غير محدد',
        baseSalary: user.salary || 0,
        overtime: 0,
        deductions: 0,
        netSalary: user.salary || 0,
      }));
      
      res.json(payrollData);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب بيانات الرواتب" });
    }
  });

  app.get("/api/hr/reports", requireAuth, requireRole(['admin', 'sub-admin']), async (req, res) => {
    try {
      const users = await storage.getUsers();
      const activeUsers = users.filter(u => u.isActive);
      const allSessions = await storage.getAllAuxSessions();
      const allLeaves = await storage.getAllLeaveRequests();
      
      // Calculate attendance stats
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      const recentSessions = allSessions.filter(s => new Date(s.startTime) >= last30Days && s.endTime);
      
      const totalWorkMinutes = recentSessions.reduce((sum, session) => {
        if (session.duration) {
          return sum + session.duration;
        }
        return sum;
      }, 0);
      
      const avgWorkHoursPerDay = totalWorkMinutes / (30 * 60);
      const attendanceRate = recentSessions.length > 0 ? 
        ((recentSessions.filter(s => s.status === 'working_on_project').length / recentSessions.length) * 100) : 0;
      
      const usedLeaveDays = allLeaves.filter(l => l.status === 'approved').reduce((sum, leave) => sum + leave.days, 0);
      
      // Department distribution
      const deptCounts: Record<string, number> = {};
      activeUsers.forEach(user => {
        const dept = user.department || 'غير محدد';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });
      
      const departmentDistribution = Object.entries(deptCounts).map(([dept, count]) => ({
        dept,
        count,
        percentage: (count / activeUsers.length) * 100,
      }));
      
      res.json({
        attendanceRate: Math.round(attendanceRate),
        avgWorkHoursPerDay: avgWorkHoursPerDay.toFixed(1),
        usedLeaveDays,
        departmentDistribution,
      });
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب تقارير الموارد البشرية" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        switch (data.type) {
          case 'subscribe':
            // Handle subscription to updates
            break;
          case 'aux_update':
            // Broadcast AUX status updates
            wss.clients.forEach((client) => {
              if (client.readyState === ws.OPEN) {
                client.send(JSON.stringify({
                  type: 'aux_status_update',
                  data: data.payload
                }));
              }
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Chat Rooms Routes
  app.post("/api/chat/rooms", requireAuth, async (req, res) => {
    try {
      const room = await storage.createChatRoom({
        name: req.body.name,
        type: req.body.type || 'group',
        createdBy: req.user!.id,
      });
      
      if (req.body.memberIds && Array.isArray(req.body.memberIds)) {
        for (const memberId of req.body.memberIds) {
          await storage.addChatRoomMember(room.id, memberId);
        }
      }
      
      await storage.addChatRoomMember(room.id, req.user!.id);
      
      res.status(201).json(room);
    } catch (error) {
      console.error("Error creating chat room:", error);
      res.status(500).json({ message: "حدث خطأ في إنشاء غرفة الدردشة" });
    }
  });

  app.post("/api/chat/private", requireAuth, async (req, res) => {
    try {
      const { otherUserId } = req.body;
      const room = await storage.getOrCreatePrivateChat(req.user!.id, otherUserId);
      res.json(room);
    } catch (error) {
      console.error("Error creating private chat:", error);
      res.status(500).json({ message: "حدث خطأ في إنشاء الدردشة الخاصة" });
    }
  });

  app.get("/api/chat/rooms", requireAuth, async (req, res) => {
    try {
      await storage.ensureUserInCommonRoom(req.user!.id);
      const rooms = await storage.getUserChatRooms(req.user!.id);
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب غرف الدردشة" });
    }
  });

  app.get("/api/chat/rooms/:id", requireAuth, async (req, res) => {
    try {
      const room = await storage.getChatRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "غرفة الدردشة غير موجودة" });
      }
      res.json(room);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب غرفة الدردشة" });
    }
  });

  // Chat Messages Routes
  app.post("/api/chat/messages", requireAuth, async (req, res) => {
    try {
      const message = await storage.createChatMessage({
        roomId: req.body.roomId,
        senderId: req.user!.id,
        content: req.body.content,
        messageType: req.body.messageType || 'text',
        attachments: req.body.attachments,
        replyTo: req.body.replyTo,
      });
      
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify({
            type: 'new_message',
            data: message
          }));
        }
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "حدث خطأ في إرسال الرسالة" });
    }
  });

  app.get("/api/chat/messages/:roomId", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const messages = await storage.getChatMessages(req.params.roomId, limit);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب الرسائل" });
    }
  });

  app.put("/api/chat/messages/:id", requireAuth, async (req, res) => {
    try {
      const message = await storage.updateChatMessage(req.params.id, req.body.content);
      if (!message) {
        return res.status(404).json({ message: "الرسالة غير موجودة" });
      }
      
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify({
            type: 'message_updated',
            data: message
          }));
        }
      });
      
      res.json(message);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في تحديث الرسالة" });
    }
  });

  app.delete("/api/chat/messages/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteChatMessage(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "الرسالة غير موجودة" });
      }
      
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify({
            type: 'message_deleted',
            data: { messageId: req.params.id }
          }));
        }
      });
      
      res.json({ message: "تم حذف الرسالة بنجاح" });
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في حذف الرسالة" });
    }
  });

  // Message Reactions Routes
  app.post("/api/chat/reactions", requireAuth, async (req, res) => {
    try {
      const reaction = await storage.addMessageReaction(
        req.body.messageId,
        req.user!.id,
        req.body.emoji
      );
      
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify({
            type: 'reaction_added',
            data: reaction
          }));
        }
      });
      
      res.status(201).json(reaction);
    } catch (error) {
      console.error("Error adding reaction:", error);
      res.status(500).json({ message: "حدث خطأ في إضافة التفاعل" });
    }
  });

  app.delete("/api/chat/reactions", requireAuth, async (req, res) => {
    try {
      await storage.removeMessageReaction(
        req.body.messageId,
        req.user!.id,
        req.body.emoji
      );
      
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify({
            type: 'reaction_removed',
            data: {
              messageId: req.body.messageId,
              userId: req.user!.id,
              emoji: req.body.emoji
            }
          }));
        }
      });
      
      res.json({ message: "تم إزالة التفاعل بنجاح" });
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في إزالة التفاعل" });
    }
  });

  // Google Calendar OAuth Routes
  // Check connection status
  app.get("/api/google-calendar/status", requireAuth, async (req, res) => {
    try {
      const token = await storage.getGoogleCalendarToken(req.user!.id);
      res.json({ connected: !!token });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  // Initiate OAuth flow
  app.get("/api/google-calendar/auth", requireAuth, async (req, res) => {
    try {
      const { getAuthorizationUrl } = await import("./google-calendar");
      const crypto = await import("crypto");
      
      // Generate cryptographically secure random state for CSRF protection
      const state = crypto.randomBytes(32).toString('hex');
      
      // Store state and user ID in session for callback validation
      req.session.googleAuthState = state;
      req.session.googleAuthUserId = req.user!.id;
      
      const authUrl = getAuthorizationUrl(state);
      
      res.json({ authUrl });
    } catch (error) {
      console.error("Error initiating Google OAuth:", error);
      res.status(500).json({ message: "حدث خطأ في بدء عملية الربط" });
    }
  });

  // OAuth callback
  app.get("/api/google-calendar/callback", async (req, res) => {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;
      const userId = req.session.googleAuthUserId;
      const sessionState = req.session.googleAuthState;
      
      // Validate CSRF state parameter
      if (!state || !sessionState || state !== sessionState) {
        console.error("OAuth state mismatch - possible CSRF attack");
        // Clear session state to prevent replay attempts
        delete req.session.googleAuthState;
        delete req.session.googleAuthUserId;
        return res.redirect("/?error=auth_failed");
      }
      
      if (!code || !userId) {
        return res.redirect("/?error=auth_failed");
      }
      
      // Verify the user exists and the session is valid
      const user = await storage.getUser(userId);
      if (!user || !user.isActive) {
        console.error("Invalid or inactive user in OAuth callback");
        delete req.session.googleAuthState;
        delete req.session.googleAuthUserId;
        return res.redirect("/?error=auth_failed");
      }
      
      const { exchangeCodeForTokens } = await import("./google-calendar");
      const tokens = await exchangeCodeForTokens(code);
      
      // Save tokens to database
      await storage.saveGoogleCalendarToken(userId, tokens);
      
      // Clean up session
      delete req.session.googleAuthUserId;
      delete req.session.googleAuthState;
      
      // Redirect back to app with success
      res.redirect("/?google_calendar_connected=true");
    } catch (error) {
      console.error("Error in Google OAuth callback:", error);
      res.redirect("/?error=auth_failed");
    }
  });

  // Disconnect Google Calendar
  app.delete("/api/google-calendar/disconnect", requireAuth, async (req, res) => {
    try {
      await storage.deleteGoogleCalendarToken(req.user!.id);
      res.json({ message: "تم فصل Google Calendar بنجاح" });
    } catch (error) {
      console.error("Error disconnecting Google Calendar:", error);
      res.status(500).json({ message: "حدث خطأ في فصل Google Calendar" });
    }
  });

  // Meetings Routes
  app.post("/api/meetings/schedule", requireAuth, async (req, res) => {
    try {
      const { title, participantIds } = req.body;
      
      // Get user's Google Calendar token
      const tokenData = await storage.getGoogleCalendarToken(req.user!.id);
      if (!tokenData) {
        return res.status(400).json({ 
          message: "يرجى ربط حساب Google Calendar الخاص بك لإنشاء رابط Google Meet تلقائياً" 
        });
      }
      
      // Create meeting with Google Calendar API to get proper Google Meet link
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour from now
      
      let meetingLink: string;
      try {
        const { createGoogleMeetEvent } = await import("./google-calendar");
        const meetData = await createGoogleMeetEvent(
          tokenData,
          title,
          `اجتماع مع ${participantIds.length} مشارك`,
          startTime,
          endTime
        );
        meetingLink = meetData.meetingLink!;
        
        // If token was refreshed, update it in database
        if (meetData.updatedTokens) {
          await storage.updateGoogleCalendarToken(
            req.user!.id,
            meetData.updatedTokens.accessToken,
            meetData.updatedTokens.expiresAt
          );
        }
      } catch (error) {
        console.error("Failed to create Google Meet link:", error);
        return res.status(400).json({ 
          message: "حدث خطأ في إنشاء رابط Google Meet. يرجى المحاولة مرة أخرى" 
        });
      }
      
      const meeting = await storage.createMeeting({
        title,
        description: `اجتماع مع ${participantIds.length} مشارك`,
        meetingLink,
        scheduledBy: req.user!.id,
        startTime,
        endTime,
      });
      
      const allParticipantIds = [...participantIds, req.user!.id];
      
      for (const participantId of participantIds) {
        await storage.addMeetingParticipant(meeting.id, participantId);
      }
      await storage.addMeetingParticipant(meeting.id, req.user!.id);
      
      let chatRoom;
      if (participantIds.length === 1) {
        chatRoom = await storage.getOrCreatePrivateChat(req.user!.id, participantIds[0]);
      } else {
        chatRoom = await storage.createChatRoom({
          name: title,
          type: 'group',
          createdBy: req.user!.id,
        });
        
        for (const participantId of allParticipantIds) {
          await storage.addChatRoomMember(chatRoom.id, participantId);
        }
      }
      
      const message = await storage.createChatMessage({
        roomId: chatRoom.id,
        senderId: req.user!.id,
        content: `🎥 ${title}\n\nانضم للاجتماع: ${meetingLink}`,
        messageType: 'meeting_link',
        attachments: [{
          name: title,
          url: meetingLink,
          type: 'meeting'
        }],
      });
      
      for (const participantId of participantIds) {
        const notification = await storage.createNotification(
          participantId,
          "اجتماع جديد",
          `${req.user!.fullName} قام بجدولة اجتماع: ${title}`,
          "info"
        );
        
        // Broadcast notification via WebSocket
        wss.clients.forEach((client) => {
          if (client.readyState === client.OPEN) {
            client.send(JSON.stringify({
              type: 'new_notification',
              data: notification
            }));
          }
        });
      }
      
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify({
            type: 'new_message',
            data: message
          }));
          client.send(JSON.stringify({
            type: 'new_meeting',
            data: meeting
          }));
        }
      });
      
      res.status(201).json({ ...meeting, chatRoomId: chatRoom.id });
    } catch (error) {
      console.error("Error scheduling meeting:", error);
      res.status(500).json({ message: "حدث خطأ في جدولة الاجتماع" });
    }
  });

  app.post("/api/meetings", requireAuth, async (req, res) => {
    try {
      const meeting = await storage.createMeeting({
        title: req.body.title,
        description: req.body.description,
        meetingLink: req.body.meetingLink,
        scheduledBy: req.user!.id,
        startTime: new Date(req.body.startTime),
        endTime: req.body.endTime ? new Date(req.body.endTime) : null,
      });
      
      if (req.body.participantIds && Array.isArray(req.body.participantIds)) {
        for (const participantId of req.body.participantIds) {
          await storage.addMeetingParticipant(meeting.id, participantId);
          
          const privateRoom = await storage.getOrCreatePrivateChat(req.user!.id, participantId);
          
          await storage.createChatMessage({
            roomId: privateRoom.id,
            senderId: req.user!.id,
            content: `تم جدولة اجتماع: ${meeting.title}`,
            messageType: 'meeting_link',
            attachments: [{
              name: meeting.title,
              url: meeting.meetingLink,
              type: 'meeting'
            }],
          });
          
          await storage.createNotification(
            participantId,
            "اجتماع جديد",
            `تم جدولة اجتماع: ${meeting.title}`,
            "info"
          );
        }
      }
      
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify({
            type: 'new_meeting',
            data: meeting
          }));
        }
      });
      
      res.status(201).json(meeting);
    } catch (error) {
      console.error("Error creating meeting:", error);
      res.status(500).json({ message: "حدث خطأ في إنشاء الاجتماع" });
    }
  });

  app.get("/api/meetings", requireAuth, async (req, res) => {
    try {
      const meetings = await storage.getUserMeetings(req.user!.id);
      res.json(meetings);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب الاجتماعات" });
    }
  });

  app.get("/api/meetings/:id", requireAuth, async (req, res) => {
    try {
      const meeting = await storage.getMeeting(req.params.id);
      if (!meeting) {
        return res.status(404).json({ message: "الاجتماع غير موجود" });
      }
      res.json(meeting);
    } catch (error) {
      res.status(500).json({ message: "حدث خطأ في جلب الاجتماع" });
    }
  });

  // Broadcast real-time updates periodically
  setInterval(async () => {
    try {
      const activeEmployees = await storage.getAllActiveAuxSessions();
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify({
            type: 'employee_status_update',
            data: activeEmployees
          }));
        }
      });
    } catch (error) {
      console.error('Broadcast error:', error);
    }
  }, 5000); // Broadcast every 5 seconds

  return httpServer;
}
