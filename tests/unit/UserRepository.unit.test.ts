import mongoose from 'mongoose';
import { UserRepository } from '../../src/repositories/UserRepository';
import { IUserDocument } from '../../src/models/User.model';
import { ValidationError } from '../../src/errors/AppError';

const validObjectId = new mongoose.Types.ObjectId().toString();

function makeDoc(overrides: Partial<IUserDocument> = {}): IUserDocument {
  return {
    _id: new mongoose.Types.ObjectId(validObjectId),
    email: 'test@example.com',
    name: 'Test User',
    password: '$2a$12$hashedpasswordhere',
    role: 'user',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as unknown as IUserDocument;
}

function createMockModel() {
  return {
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<mongoose.Model<IUserDocument>>;
}

describe('UserRepository', () => {
  let repository: UserRepository;
  let mockModel: ReturnType<typeof createMockModel>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockModel = createMockModel();
    repository = new UserRepository(mockModel);
  });

  // ─── findById ───────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns null and does not query DB for an invalid ObjectId', async () => {
      const result = await repository.findById('not-a-valid-id');
      expect(result).toBeNull();
      expect(mockModel.findById).not.toHaveBeenCalled();
    });

    it('returns a mapped IUser when the document exists', async () => {
      const doc = makeDoc();
      (mockModel.findById as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });

      const result = await repository.findById(validObjectId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(validObjectId);
      expect(result?.email).toBe('test@example.com');
      expect(result?.name).toBe('Test User');
    });

    it('returns null when the document does not exist', async () => {
      (mockModel.findById as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await repository.findById(validObjectId);
      expect(result).toBeNull();
    });
  });

  // ─── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns an array of mapped IUsers', async () => {
      const docs = [makeDoc(), makeDoc({ email: 'other@example.com' })];
      (mockModel.find as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) });

      const result = await repository.findAll();
      expect(result).toHaveLength(2);
    });

    it('returns an empty array when no documents exist', async () => {
      (mockModel.find as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

      const result = await repository.findAll();
      expect(result).toEqual([]);
    });
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a user and returns the mapped IUser without password', async () => {
      const doc = makeDoc();
      (mockModel.create as jest.Mock).mockResolvedValue(doc);

      const result = await repository.create({ email: 'test@example.com', name: 'Test User', password: 'secret123' });
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.role).toBe('user');
      expect(result).not.toHaveProperty('password');
    });

    it('throws ValidationError when Mongoose ValidationError is thrown', async () => {
      const mongooseError = new mongoose.Error.ValidationError();
      mongooseError.errors = {
        email: new mongoose.Error.ValidatorError({ message: 'Email is required', path: 'email', value: '' }),
      };
      (mockModel.create as jest.Mock).mockRejectedValue(mongooseError);

      await expect(repository.create({ email: '', name: 'Test', password: 'secret123' })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError on duplicate key error (code 11000)', async () => {
      const duplicateError = Object.assign(new Error('E11000 duplicate key'), {
        code: 11000,
        keyValue: { email: 'test@example.com' },
      });
      (mockModel.create as jest.Mock).mockRejectedValue(duplicateError);

      await expect(
        repository.create({ email: 'test@example.com', name: 'Test', password: 'secret123' })
      ).rejects.toThrow(ValidationError);
    });

    it('rethrows unknown errors as-is', async () => {
      const unknownError = new Error('Connection timeout');
      (mockModel.create as jest.Mock).mockRejectedValue(unknownError);

      await expect(
        repository.create({ email: 'test@example.com', name: 'Test', password: 'secret123' })
      ).rejects.toThrow('Connection timeout');
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('returns null for an invalid ObjectId', async () => {
      const result = await repository.update('bad-id', { name: 'New Name' });
      expect(result).toBeNull();
      expect(mockModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('returns the updated IUser when the document is found', async () => {
      const updated = makeDoc({ name: 'Updated Name' });
      (mockModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(updated),
      });

      const result = await repository.update(validObjectId, { name: 'Updated Name' });
      expect(result?.name).toBe('Updated Name');
    });

    it('returns null when the document does not exist', async () => {
      (mockModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.update(validObjectId, { name: 'New' });
      expect(result).toBeNull();
    });
  });

  // ─── delete ─────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('returns false for an invalid ObjectId', async () => {
      const result = await repository.delete('bad-id');
      expect(result).toBe(false);
      expect(mockModel.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('returns true when the document is deleted', async () => {
      const doc = makeDoc();
      (mockModel.findByIdAndDelete as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await repository.delete(validObjectId);
      expect(result).toBe(true);
    });

    it('returns false when the document does not exist', async () => {
      (mockModel.findByIdAndDelete as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.delete(validObjectId);
      expect(result).toBe(false);
    });
  });

  // ─── exists ─────────────────────────────────────────────────────────────────

  describe('exists', () => {
    it('returns true when a matching document exists', async () => {
      (mockModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(makeDoc()),
      });

      const result = await repository.exists({ email: 'test@example.com' });
      expect(result).toBe(true);
    });

    it('returns false when no matching document exists', async () => {
      (mockModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.exists({ email: 'ghost@example.com' });
      expect(result).toBe(false);
    });
  });
});
