export type UserRole = 'admin' | 'user' | 'moderator';

export interface IUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateUserDTO {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
}

export interface IUpdateUserDTO {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
}
