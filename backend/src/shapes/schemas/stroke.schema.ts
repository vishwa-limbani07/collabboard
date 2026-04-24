import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Stroke extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Board', required: true, index: true })
  boardId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  strokeId: string;

  @Prop({ type: [{ x: Number, y: Number }], required: true })
  points: { x: number; y: number }[];

  @Prop({ required: true, default: '#ffffff' })
  color: string;

  @Prop({ required: true, default: 3 })
  width: number;

  @Prop({ required: true, default: 'pen' })
  tool: string;
}

export const StrokeSchema = SchemaFactory.createForClass(Stroke);