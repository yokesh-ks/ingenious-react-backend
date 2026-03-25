import mongoose from 'mongoose';
import { IRepository } from '../interfaces/IRepository';
import { IUser, ICreateUserDTO, IUpdateUserDTO } from '../interfaces/IUser';
import { IUserDocument, UserModel, toUser } from '../models/User.model';
import { ValidationError, NotFoundError } from '../errors/AppError';

interface MongoError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

function translateError(err: unknown): never {
  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    throw new ValidationError(messages.join(', '));
  }

  const mongoErr = err as MongoError;
  if (mongoErr.code === 11000 && mongoErr.keyValue) {
    const field = Object.keys(mongoErr.keyValue)[0];
    throw new ValidationError(`${field} already exists`);
  }

  throw err;
}

export class UserRepository
  implements IRepository<IUser, ICreateUserDTO, IUpdateUserDTO>
{
  constructor(private readonly model: mongoose.Model<IUserDocument>) {}

  async findById(id: string): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).exec();
    return doc ? toUser(doc) : null;
  }

  async findAll(filter?: Partial<IUser>): Promise<IUser[]> {
    const query: Record<string, unknown> = {};
    if (filter) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = filter;
      Object.assign(query, rest);
    }
    const docs = await this.model.find(query).exec();
    return docs.map(toUser);
  }

  async create(data: ICreateUserDTO): Promise<IUser> {
    try {
      const doc = await this.model.create(data);
      return toUser(doc);
    } catch (err) {
      translateError(err);
    }
  }

  async update(id: string, data: IUpdateUserDTO): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    try {
      const doc = await this.model
        .findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after', runValidators: true })
        .exec();
      return doc ? toUser(doc) : null;
    } catch (err) {
      translateError(err);
    }
  }

  async delete(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const result = await this.model.findByIdAndDelete(id).exec();
    return result !== null;
  }

  async exists(filter: Partial<IUser>): Promise<boolean> {
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = filter;
    const doc = await this.model.findOne(rest as Record<string, unknown>).exec();
    return doc !== null;
  }
}

export const userRepository = new UserRepository(UserModel);
