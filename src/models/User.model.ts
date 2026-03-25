import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser, UserRole } from '../interfaces/IUser';

const SALT_ROUNDS = 12;

export interface IUserDocument extends Omit<IUser, 'id'>, mongoose.Document {
  password: string;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'user', 'moderator'] as UserRole[],
        message: 'Role must be one of: admin, user, moderator',
      },
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret['id'] = (ret['_id'] as { toString(): string }).toString();
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete ret['_id'];
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete ret['__v'];
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete ret['password']; // never expose hash in JSON responses
        return ret;
      },
    },
  }
);

// Hash password before saving (only when modified)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

// Hash password on findOneAndUpdate if password is in $set
userSchema.pre('findOneAndUpdate', async function () {
  type UpdateDoc = { $set?: { password?: string } };
  const update = this.getUpdate() as UpdateDoc | null;
  if (!update) return;
  const newPassword = update.$set?.password;
  if (typeof newPassword === 'string') {
    update.$set = { ...update.$set, password: await bcrypt.hash(newPassword, SALT_ROUNDS) };
  }
});

userSchema.methods['comparePassword'] = async function (
  this: IUserDocument,
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export function toUser(doc: IUserDocument): IUser {
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    role: doc.role,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    // password is intentionally excluded
  };
}

export const UserModel = mongoose.model<IUserDocument>('User', userSchema);
