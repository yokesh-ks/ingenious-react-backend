import { IUser } from './IUser';

export interface ISignUpDTO {
  email: string;
  name: string;
  password: string;
}

export interface ISignInDTO {
  email: string;
  password: string;
}

export interface ITokenPayload {
  sub: string;   // user id
  email: string;
  role: string;
}

export interface IAuthResponse {
  user: IUser;
  accessToken: string;
}

// Extends Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
