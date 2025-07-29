const { CourseOffering, Module, Facilitator, Cohort, Class, Mode, User } = require('../../src/models');
const { sequelize } = require('../../src/config/database');

describe('CourseOffering Model', () => {
  let module, facilitator, cohort, classEntity, mode, user;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    
    // Create required related entities
    user = await User.create({
      email: 'facilitator@test.com',
      password: 'TestPassword123!',
      firstName: 'John',
      lastName: 'Doe',
      role: 'facilitator'
    });

    facilitator = await Facilitator.create({
      userId: user.id,
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

    cohort = await Cohort.create({
      name: 'CS 2024',
      year: 2024,
      program: 'Computer Science',
      intakePeriod: 'HT1'
    });

    classEntity = await Class.create({
      code: '2024S',
      year: 2024,
      semester: 'S',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-06-30')
    });

    mode = await Mode.create({
      name: 'online',
      description: 'Online delivery'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await CourseOffering.destroy({ where: {}, force: true });
  });

  describe('CourseOffering Creation', () => {
    it('should create a course offering with valid data', async () => {
      const offeringData = {
        moduleId: module.id,
        facilitatorId: facilitator.id,
        cohortId: cohort.id,
        classId: classEntity.id,
        modeId: mode.id,
        trimester: 'T1',
        maxEnrollment: 30,
        location: 'Room A101'
      };

      const offering = await CourseOffering.create(offeringData);

      expect(offering.id).toBeDefined();
      expect(offering.moduleId).toBe(offeringData.moduleId);
      expect(offering.facilitatorId).toBe(offeringData.facilitatorId);
      expect(offering.trimester).toBe(offeringData.trimester);
      expect(offering.maxEnrollment).toBe(offeringData.maxEnrollment);
      expect(offering.currentEnrollment).toBe(0);
      expect(offering.isActive).toBe(true);
    });

    it('should enforce unique constraint on module, cohort, class, and trimester', async () => {
      const offeringData = {
        moduleId: module.id,
        facilitatorId: facilitator.id,
        cohortId: cohort.id,
        classId: classEntity.id,
        modeId: mode.id,
        trimester: 'T1'
      };

      await CourseOffering.create(offeringData);
      await expect(CourseOffering.create(offeringData)).rejects.toThrow();
    });

    it('should include associations when queried', async () => {
      const offeringData = {
        moduleId: module.id,
        facilitatorId: facilitator.id,
        cohortId: cohort.id,
        classId: classEntity.id,
        modeId: mode.id,
        trimester: 'T2'
      };

      const offering = await CourseOffering.create(offeringData);
      
      const offeringWithAssociations = await CourseOffering.findByPk(offering.id, {
        include: [
          { model: Module, as: 'module' },
          { model: Facilitator, as: 'facilitator' },
          { model: Cohort, as: 'cohort' },
          { model: Class, as: 'class' },
          { model: Mode, as: 'mode' }
        ]
      });

      expect(offeringWithAssociations.module.code).toBe('CS101');
      expect(offeringWithAssociations.facilitator.employeeId).toBe('FAC001');
      expect(offeringWithAssociations.cohort.name).toBe('CS 2024');
      expect(offeringWithAssociations.class.code).toBe('2024S');
      expect(offeringWithAssociations.mode.name).toBe('online');
    });
  });

  describe('CourseOffering Validation', () => {
    it('should require all mandatory fields', async () => {
      const incompleteData = {
        moduleId: module.id,
        facilitatorId: facilitator.id
        // Missing required fields
      };

      await expect(CourseOffering.create(incompleteData)).rejects.toThrow();
    });

    it('should validate trimester values', async () => {
      const offeringData = {
        moduleId: module.id,
        facilitatorId: facilitator.id,
        cohortId: cohort.id,
        classId: classEntity.id,
        modeId: mode.id,
        trimester: 'INVALID'
      };

      await expect(CourseOffering.create(offeringData)).rejects.toThrow();
    });

    it('should validate foreign key references', async () => {
      const offeringData = {
        moduleId: 'invalid-uuid',
        facilitatorId: facilitator.id,
        cohortId: cohort.id,
        classId: classEntity.id,
        modeId: mode.id,
        trimester: 'T1'
      };

      await expect(CourseOffering.create(offeringData)).rejects.toThrow();
    });
  });

  describe('CourseOffering Updates', () => {
    let offering;

    beforeEach(async () => {
      offering = await CourseOffering.create({
        moduleId: module.id,
        facilitatorId: facilitator.id,
        cohortId: cohort.id,
        classId: classEntity.id,
        modeId: mode.id,
        trimester: 'T3',
        maxEnrollment: 25
      });
    });

    it('should update enrollment numbers', async () => {
      await offering.update({ currentEnrollment: 20 });
      
      expect(offering.currentEnrollment).toBe(20);
    });

    it('should update location and schedule', async () => {
      const schedule = {
        monday: { start: '09:00', end: '11:00' },
        wednesday: { start: '14:00', end: '16:00' }
      };

      await offering.update({ 
        location: 'Room B202',
        schedule: schedule
      });

      expect(offering.location).toBe('Room B202');
      expect(offering.schedule).toEqual(schedule);
    });

    it('should soft delete by setting isActive to false', async () => {
      await offering.update({ isActive: false });
      
      expect(offering.isActive).toBe(false);
    });
  });
});