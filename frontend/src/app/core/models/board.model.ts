import { User } from './user.model';

export interface Board {
  _id: string;
  name: string;
  description: string;
  owner: User;
  members: User[];
  inviteCode: string;
  backgroundColor: string;
  createdAt: string;
  updatedAt: string;
}