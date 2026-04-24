import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Stroke } from './schemas/stroke.schema';

@Injectable()
export class ShapesService {
  constructor(
    @InjectModel(Stroke.name) private strokeModel: Model<Stroke>,
  ) {}

  async saveStroke(boardId: string, strokeData: any) {
    return this.strokeModel.create({
      boardId: new Types.ObjectId(boardId),
      userId: strokeData.userId
        ? new Types.ObjectId(strokeData.userId)
        : null,
      strokeId: strokeData.id,
      points: strokeData.points,
      color: strokeData.color,
      width: strokeData.width,
      tool: strokeData.tool,
    });
  }

  async getStrokesByBoard(boardId: string) {
    return this.strokeModel
      .find({ boardId: new Types.ObjectId(boardId) })
      .sort({ createdAt: 1 })
      .exec();
  }

  async deleteStrokesByBoard(boardId: string) {
    return this.strokeModel
      .deleteMany({ boardId: new Types.ObjectId(boardId) })
      .exec();
  }
}