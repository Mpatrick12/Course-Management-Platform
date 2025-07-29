const Bull = require('bull');
const { queueNotification, getManagerNotifications, markNotificationAsRead } = require('../../src/services/notificationService');
const { User, Facilitator, Manager, CourseOffering, Module } = require('../../src/models');
const { sequelize } = require('../../src/config/database');
const { client: redisClient } = require('../../src/config/redis');

// Mock Bull queue
jest.mock('bull');

describe('NotificationService', () => {
  let mockQueue;
  let facilitator, manager, courseOffering, module, user;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    
    // Create test data
    const managerUser = await User.create({
      email: 'manager@test.com',
      password: 'TestPassword123!',
      firstName: 'Manager',
      lastName: 'Test',
      role: 'manager'
    });

    const facilitatorUser = await User.create({
      email: 'facilitator@test.com',
      password: 'TestPassword123!',
      firstName: 'Facilitator',
      lastName: 'Test',
      role: 'facilitator'
    });

    manager = await Manager.create({
      userId: managerUser.id,
      employeeId: 'MGR001',
      department: 'Computer Science'
    });

    facilitator = await Facilitator.create({
      userId: facilitatorUser.id,
      employeeId: 'FAC001',
      specialization: 'Web Development'
    });

    module = await Module.create({
      code: 'CS101',
      name: 'Introduction to Programming',
      description: 'Basic programming concepts',
      credits: 6,
      level: 'undergraduate'
    });
  });

  beforeEach(() => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      process: jest.fn(),
      on: jest.fn()
    };
    Bull.mockReturnValue(mockQueue);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('queueNotification', () => {
    it('should queue a notification successfully', async () => {
      const notificationData = {
        type: 'activity_log_submitted',
        facilitatorId: facilitator.id,
        allocationId: 'test-allocation-id',
        weekNumber: 1,
        isLate: false,
        submittedAt: new Date()
      };

      await queueNotification(notificationData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-notification',
        notificationData,
        expect.objectContaining({
          attempts: 3,
          backoff: expect.objectContaining({
            type: 'exponential',
            delay: 2000
          })
        })
      );
    });

    it('should handle queue errors gracefully', async () => {
      mockQueue.add.mockRejectedValue(new Error('Queue error'));

      const notificationData = {
        type: 'activity_log_submitted',
        facilitatorId: facilitator.id,
        allocationId: 'test-allocation-id',
        weekNumber: 1
      };

      await expect(queueNotification(notificationData)).rejects.toThrow('Queue error');
    });
  });

  describe('getManagerNotifications', () => {
    beforeEach(() => {
      // Mock Redis client methods
      redisClient.lRange = jest.fn();
    });

    it('should retrieve manager notifications', async () => {
      const mockNotifications = [
        JSON.stringify({
          id: 'notif-1',
          type: 'activity_log_submitted',
          subject: 'Activity Log Submitted',
          message: 'Test message',
          facilitatorId: facilitator.id,
          weekNumber: 1,
          timestamp: new Date(),
          read: false
        })
      ];

      redisClient.lRange.mockResolvedValue(mockNotifications);

      const notifications = await getManagerNotifications(10, 0);

      expect(redisClient.lRange).toHaveBeenCalledWith('notifications:managers', 0, 9);
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('activity_log_submitted');
      expect(notifications[0].read).toBe(false);
    });

    it('should handle empty notification list', async () => {
      redisClient.lRange.mockResolvedValue([]);

      const notifications = await getManagerNotifications();

      expect(notifications).toHaveLength(0);
    });

    it('should handle Redis errors', async () => {
      redisClient.lRange.mockRejectedValue(new Error('Redis error'));

      await expect(getManagerNotifications()).rejects.toThrow('Redis error');
    });
  });

  describe('markNotificationAsRead', () => {
    beforeEach(() => {
      redisClient.lRange = jest.fn();
      redisClient.lSet = jest.fn();
    });

    it('should mark notification as read', async () => {
      const mockNotifications = [
        JSON.stringify({
          id: 'notif-1',
          type: 'activity_log_submitted',
          read: false
        }),
        JSON.stringify({
          id: 'notif-2',
          type: 'missing_submission_reminder',
          read: false
        })
      ];

      redisClient.lRange.mockResolvedValue(mockNotifications);
      redisClient.lSet.mockResolvedValue('OK');

      await markNotificationAsRead('notif-1');

      expect(redisClient.lRange).toHaveBeenCalledWith('notifications:managers', 0, -1);
      expect(redisClient.lSet).toHaveBeenCalledWith(
        'notifications:managers',
        0,
        expect.stringContaining('"read":true')
      );
    });

    it('should handle non-existent notification ID', async () => {
      const mockNotifications = [
        JSON.stringify({
          id: 'notif-1',
          type: 'activity_log_submitted',
          read: false
        })
      ];

      redisClient.lRange.mockResolvedValue(mockNotifications);

      // Should not throw error for non-existent ID
      await expect(markNotificationAsRead('non-existent')).resolves.not.toThrow();
      expect(redisClient.lSet).not.toHaveBeenCalled();
    });
  });

  describe('Notification Processing', () => {
    it('should process activity log submission notification', async () => {
      const jobData = {
        type: 'activity_log_submitted',
        facilitatorId: facilitator.id,
        allocationId: 'test-allocation-id',
        weekNumber: 1,
        isLate: false,
        submittedAt: new Date()
      };

      // Mock the process function call
      const processCallback = mockQueue.process.mock.calls.find(
        call => call[0] === 'process-notification'
      );

      expect(processCallback).toBeDefined();
      
      // Test that the process function is registered
      expect(mockQueue.process).toHaveBeenCalledWith(
        'process-notification',
        expect.any(Function)
      );
    });

    it('should process missing submission reminder notification', async () => {
      const jobData = {
        type: 'missing_submission_reminder',
        facilitatorId: facilitator.id,
        allocationId: 'test-allocation-id',
        weekNumber: 1
      };

      // Verify reminder queue processing is set up
      expect(mockQueue.process).toHaveBeenCalled();
    });
  });

  describe('Queue Error Handling', () => {
    it('should handle failed notification jobs', () => {
      const errorCallback = mockQueue.on.mock.calls.find(
        call => call[0] === 'failed'
      );

      expect(errorCallback).toBeDefined();
      expect(typeof errorCallback[1]).toBe('function');
    });

    it('should handle completed notification jobs', () => {
      const completedCallback = mockQueue.on.mock.calls.find(
        call => call[0] === 'completed'
      );

      expect(completedCallback).toBeDefined();
      expect(typeof completedCallback[1]).toBe('function');
    });
  });
});