import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';

@Injectable()
export class UsersService {
  // @InjectModel is NestJS's way of injecting the Mongoose model
  // In Angular, you'd inject a service with constructor(private http: HttpClient)
  // Here, you inject the database model the same way
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async create(
    name: string,
    email: string,
    hashedPassword: string,
  ): Promise<User> {
    return this.userModel.create({ name, email, password: hashedPassword });
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).select('-password').exec();
  }
}
