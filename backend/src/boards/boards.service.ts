import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Board } from './schemas/board.schema';
import { CreateBoardDto } from './dto/create-board.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class BoardsService {
  constructor(@InjectModel(Board.name) private boardModel: Model<Board>) {}

  // Generate a random 8-character invite code
  private generateInviteCode(): string {
    return randomBytes(4).toString('hex');
  }

  async create(dto: CreateBoardDto, userId: string) {
    const board = await this.boardModel.create({
      ...dto,
      owner: new Types.ObjectId(userId),
      members: [new Types.ObjectId(userId)],
      inviteCode: this.generateInviteCode(),
    });
    return board;
  }

  // Get all boards where user is a member
  async findAllByUser(userId: string) {
    return this.boardModel
      .find({ members: new Types.ObjectId(userId) })
      .populate('owner', 'name email')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findById(boardId: string) {
    const board = await this.boardModel
      .findById(boardId)
      .populate('owner', 'name email')
      .populate('members', 'name email avatar')
      .exec();

    if (!board) {
      throw new NotFoundException('Board not found');
    }
    return board;
  }

  // Join a board using invite code
  async joinByInviteCode(inviteCode: string, userId: string) {
    const board = await this.boardModel.findOne({ inviteCode }).exec();
    if (!board) {
      throw new NotFoundException('Invalid invite code');
    }

    const userObjectId = new Types.ObjectId(userId);

    // Check if already a member
    if (board.members.some((m) => m.equals(userObjectId))) {
      return board;
    }

    board.members.push(userObjectId);
    await board.save();
    return board;
  }

  async delete(boardId: string, userId: string) {
    const board = await this.boardModel.findById(boardId).exec();
    if (!board) {
      throw new NotFoundException('Board not found');
    }
    if (!board.owner.equals(new Types.ObjectId(userId))) {
      throw new ForbiddenException('Only the owner can delete this board');
    }
    await board.deleteOne();
    return { message: 'Board deleted' };
  }
}
