import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// This is literally the same concept as canActivate in Angular routing
// Routes with @UseGuards(JwtAuthGuard) require a valid JWT token
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
