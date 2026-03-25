import { UserModel, IUserDocument } from '../models/User.model';
import { IUser } from '../interfaces/IUser';
import { toUser } from '../models/User.model';

export class AuthRepository {
  async findByEmail(email: string): Promise<IUserDocument | null> {
    return UserModel.findOne({ email: email.toLowerCase().trim() })
      .select('+password')
      .exec();
  }

  async findById(id: string): Promise<IUser | null> {
    const doc = await UserModel.findById(id).exec();
    return doc ? toUser(doc) : null;
  }
}

export const authRepository = new AuthRepository();
