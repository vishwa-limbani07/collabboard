import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Stroke } from './schemas/stroke.schema';
import { Sticky } from './schemas/sticky.schema';

@Injectable()
export class ShapesService {
  constructor(
    @InjectModel(Stroke.name) private strokeModel: Model<Stroke>,
      @InjectModel(Sticky.name) private stickyModel: Model<Sticky>,

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
  async saveSticky(boardId: string, stickyData: any) {
  return this.stickyModel.create({
    boardId: new Types.ObjectId(boardId),
    stickyId: stickyData.id,
    text: stickyData.text || '',
    x: stickyData.x,
    y: stickyData.y,
    width: stickyData.width || 200,
    height: stickyData.height || 150,
    color: stickyData.color,
    fontSize: stickyData.fontSize || 14,
  });
}

async getStickyByBoard(boardId: string) {
  return this.stickyModel
    .find({ boardId: new Types.ObjectId(boardId) })
    .sort({ createdAt: 1 })
    .exec();
}

async updateSticky(boardId: string, stickyData: any) {
  return this.stickyModel.findOneAndUpdate(
    {
      boardId: new Types.ObjectId(boardId),
      stickyId: stickyData.id,
    },
    {
      text: stickyData.text,
      x: stickyData.x,
      y: stickyData.y,
      width: stickyData.width,
      height: stickyData.height,
      color: stickyData.color,
    },
    { new: true, upsert: true },
  );
}

async deleteSticky(boardId: string, stickyId: string) {
  return this.stickyModel.deleteOne({
    boardId: new Types.ObjectId(boardId),
    stickyId: stickyId,
  });
}

async deleteStickyByBoard(boardId: string) {
  return this.stickyModel
    .deleteMany({ boardId: new Types.ObjectId(boardId) })
    .exec();
}

}
