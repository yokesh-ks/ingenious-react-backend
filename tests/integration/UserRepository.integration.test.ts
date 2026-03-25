import { connectTestDatabase, clearDatabase, closeTestDatabase } from '../setup/testDatabase';
import { UserRepository } from '../../src/repositories/UserRepository';
import { UserModel } from '../../src/models/User.model';
import { ValidationError } from '../../src/errors/AppError';

const DEFAULT_PASSWORD = 'Password123!';

describe('UserRepository Integration', () => {
  let repository: UserRepository;

  beforeAll(async () => {
    await connectTestDatabase();
    repository = new UserRepository(UserModel);
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('persists a user and returns a mapped IUser with id and timestamps', async () => {
      const user = await repository.create({ email: 'alice@example.com', name: 'Alice', password: DEFAULT_PASSWORD });

      expect(user.id).toBeDefined();
      expect(user.email).toBe('alice@example.com');
      expect(user.name).toBe('Alice');
      expect(user.role).toBe('user');
      expect(user.isActive).toBe(true);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('never exposes password in the returned IUser', async () => {
      const user = await repository.create({ email: 'alice@example.com', name: 'Alice', password: DEFAULT_PASSWORD });
      expect(user).not.toHaveProperty('password');
    });

    it('hashes the password (stored value differs from plaintext)', async () => {
      await repository.create({ email: 'alice@example.com', name: 'Alice', password: DEFAULT_PASSWORD });
      const raw = await UserModel.findOne({ email: 'alice@example.com' }).select('+password');
      expect(raw?.password).not.toBe(DEFAULT_PASSWORD);
      expect(raw?.password).toMatch(/^\$2[ab]\$/); // bcrypt hash prefix
    });

    it('comparePassword returns true for correct password', async () => {
      await repository.create({ email: 'alice@example.com', name: 'Alice', password: DEFAULT_PASSWORD });
      const raw = await UserModel.findOne({ email: 'alice@example.com' }).select('+password');
      expect(await raw?.comparePassword(DEFAULT_PASSWORD)).toBe(true);
    });

    it('comparePassword returns false for wrong password', async () => {
      await repository.create({ email: 'alice@example.com', name: 'Alice', password: DEFAULT_PASSWORD });
      const raw = await UserModel.findOne({ email: 'alice@example.com' }).select('+password');
      expect(await raw?.comparePassword('wrongpassword')).toBe(false);
    });

    it('defaults role to "user" when not provided', async () => {
      const user = await repository.create({ email: 'bob@example.com', name: 'Bob', password: DEFAULT_PASSWORD });
      expect(user.role).toBe('user');
    });

    it('stores the provided role', async () => {
      const user = await repository.create({ email: 'admin@example.com', name: 'Admin', password: DEFAULT_PASSWORD, role: 'admin' });
      expect(user.role).toBe('admin');
    });

    it('throws ValidationError for duplicate email', async () => {
      await repository.create({ email: 'dup@example.com', name: 'First', password: DEFAULT_PASSWORD });
      await expect(
        repository.create({ email: 'dup@example.com', name: 'Second', password: DEFAULT_PASSWORD })
      ).rejects.toThrow(ValidationError);
    });

    it('stores email in lowercase', async () => {
      const user = await repository.create({ email: 'UPPER@EXAMPLE.COM', name: 'Upper', password: DEFAULT_PASSWORD });
      expect(user.email).toBe('upper@example.com');
    });

    it('throws ValidationError when name is too short', async () => {
      await expect(
        repository.create({ email: 'short@example.com', name: 'X', password: DEFAULT_PASSWORD })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when password is too short', async () => {
      await expect(
        repository.create({ email: 'weak@example.com', name: 'Weak', password: '123' })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for invalid email format', async () => {
      await expect(
        repository.create({ email: 'not-an-email', name: 'Test', password: DEFAULT_PASSWORD })
      ).rejects.toThrow(ValidationError);
    });
  });

  // ─── findById ───────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns the user after a create round-trip', async () => {
      const created = await repository.create({ email: 'carol@example.com', name: 'Carol', password: DEFAULT_PASSWORD });
      const found = await repository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe('carol@example.com');
      expect(found).not.toHaveProperty('password');
    });

    it('returns null for a valid ObjectId that does not exist', async () => {
      const fakeId = '64e1f5c2f1a2b3c4d5e6f7a8';
      const result = await repository.findById(fakeId);
      expect(result).toBeNull();
    });

    it('returns null for a malformed id string', async () => {
      const result = await repository.findById('not-an-objectid');
      expect(result).toBeNull();
    });
  });

  // ─── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all users when no filter is provided', async () => {
      await repository.create({ email: 'u1@example.com', name: 'User One', password: DEFAULT_PASSWORD });
      await repository.create({ email: 'u2@example.com', name: 'User Two', password: DEFAULT_PASSWORD });

      const users = await repository.findAll();
      expect(users).toHaveLength(2);
    });

    it('never exposes passwords in findAll results', async () => {
      await repository.create({ email: 'u1@example.com', name: 'User One', password: DEFAULT_PASSWORD });
      const users = await repository.findAll();
      users.forEach((u) => expect(u).not.toHaveProperty('password'));
    });

    it('returns only matching users when a filter is applied', async () => {
      await repository.create({ email: 'active@example.com', name: 'Active', password: DEFAULT_PASSWORD, role: 'user' });
      await repository.create({ email: 'admin@example.com', name: 'Admin', password: DEFAULT_PASSWORD, role: 'admin' });

      const admins = await repository.findAll({ role: 'admin' });
      expect(admins).toHaveLength(1);
      expect(admins[0].role).toBe('admin');
    });

    it('returns an empty array when no users exist', async () => {
      const users = await repository.findAll();
      expect(users).toEqual([]);
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('persists changes and returns the updated user', async () => {
      const user = await repository.create({ email: 'dave@example.com', name: 'Dave', password: DEFAULT_PASSWORD });
      const updated = await repository.update(user.id, { name: 'David', isActive: false });

      expect(updated?.name).toBe('David');
      expect(updated?.isActive).toBe(false);
    });

    it('re-hashes password when updated', async () => {
      const user = await repository.create({ email: 'eve@example.com', name: 'Eve', password: DEFAULT_PASSWORD });
      await repository.update(user.id, { password: 'NewPassword456!' });

      const raw = await UserModel.findById(user.id).select('+password');
      expect(await raw?.comparePassword('NewPassword456!')).toBe(true);
      expect(await raw?.comparePassword(DEFAULT_PASSWORD)).toBe(false);
    });

    it('persists changes to the database (subsequent read reflects update)', async () => {
      const user = await repository.create({ email: 'frank@example.com', name: 'Frank', password: DEFAULT_PASSWORD });
      await repository.update(user.id, { role: 'moderator' });

      const refetched = await repository.findById(user.id);
      expect(refetched?.role).toBe('moderator');
    });

    it('returns null for a non-existent id', async () => {
      const fakeId = '64e1f5c2f1a2b3c4d5e6f7a9';
      const result = await repository.update(fakeId, { name: 'Ghost' });
      expect(result).toBeNull();
    });
  });

  // ─── delete ─────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('removes the document and returns true', async () => {
      const user = await repository.create({ email: 'grace@example.com', name: 'Grace', password: DEFAULT_PASSWORD });
      const deleted = await repository.delete(user.id);
      expect(deleted).toBe(true);
    });

    it('document is no longer findable after deletion', async () => {
      const user = await repository.create({ email: 'henry@example.com', name: 'Henry', password: DEFAULT_PASSWORD });
      await repository.delete(user.id);

      const found = await repository.findById(user.id);
      expect(found).toBeNull();
    });

    it('returns false for a non-existent id', async () => {
      const fakeId = '64e1f5c2f1a2b3c4d5e6f7b0';
      const result = await repository.delete(fakeId);
      expect(result).toBe(false);
    });
  });

  // ─── exists ─────────────────────────────────────────────────────────────────

  describe('exists', () => {
    it('returns true when a user with the given email exists', async () => {
      await repository.create({ email: 'ivan@example.com', name: 'Ivan', password: DEFAULT_PASSWORD });
      const result = await repository.exists({ email: 'ivan@example.com' });
      expect(result).toBe(true);
    });

    it('returns false when no user matches the filter', async () => {
      const result = await repository.exists({ email: 'nobody@example.com' });
      expect(result).toBe(false);
    });

    it('returns true when filtering by role', async () => {
      await repository.create({ email: 'mod@example.com', name: 'Mod', password: DEFAULT_PASSWORD, role: 'moderator' });
      const result = await repository.exists({ role: 'moderator' });
      expect(result).toBe(true);
    });
  });
});
