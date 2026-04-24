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
      points: strokeData.points || [],
      startX: strokeData.startX || 0,
      startY: strokeData.startY || 0,
      endX: strokeData.endX || 0,
      endY: strokeData.endY || 0,
      text: strokeData.text || '',
      fontSize: strokeData.fontSize || 16,
      color: strokeData.color,
      width: strokeData.width,
      tool: strokeData.tool,
      filled: strokeData.filled || false,
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

  async deleteStrokeById(boardId: string, strokeId: string) {
    return this.strokeModel
      .deleteOne({
        boardId: new Types.ObjectId(boardId),
        strokeId: strokeId,
      })
      .exec();
  }
}
