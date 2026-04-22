import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/boards')
@UseGuards(JwtAuthGuard) // All board routes require authentication
export class BoardsController {
  constructor(private boardsService: BoardsService) {}

  // POST /api/boards — create a new board
  @Post()
  create(@Body() dto: CreateBoardDto, @Req() req) {
    return this.boardsService.create(dto, req.user.userId);
  }

  // GET /api/boards — get all my boards
  @Get()
  findAll(@Req() req) {
    return this.boardsService.findAllByUser(req.user.userId);
  }

  // GET /api/boards/:id — get single board
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.boardsService.findById(id);
  }

  // POST /api/boards/join/:inviteCode — join via invite link
  @Post('join/:inviteCode')
  join(@Param('inviteCode') inviteCode: string, @Req() req) {
    return this.boardsService.joinByInviteCode(inviteCode, req.user.userId);
  }

  // DELETE /api/boards/:id — delete board (owner only)
  @Delete(':id')
  delete(@Param('id') id: string, @Req() req) {
    return this.boardsService.delete(id, req.user.userId);
  }
}
