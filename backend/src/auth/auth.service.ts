import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  // Same dependency injection pattern as Angular
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(name: string, email: string, password: string) {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password — same bcrypt you used in ProjectNest
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await this.usersService.create(name, email, hashedPassword);

    // Generate JWT token
    const token = this.jwtService.sign({ sub: user._id, email: user.email });

    return {
      user: { id: user._id, name: user.name, email: user.email },
      token,
    };
  }

  async login(email: string, password: string) {
    // Find user
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare password
const isPasswordValid: boolean = await (bcrypt.compare(password, user.password) as Promise<boolean>);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const token = this.jwtService.sign({ sub: user._id, email: user.email });

    return {
      user: { id: user._id, name: user.name, email: user.email },
      token,
    };
  }
}