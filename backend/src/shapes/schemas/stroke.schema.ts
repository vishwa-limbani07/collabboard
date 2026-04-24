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

  // For pen tool
  @Prop({ type: [{ x: Number, y: Number }], default: [] })
  points: { x: number; y: number }[];

  // For shapes
  @Prop({ default: 0 })
  startX: number;

  @Prop({ default: 0 })
  startY: number;

  @Prop({ default: 0 })
  endX: number;

  @Prop({ default: 0 })
  endY: number;

  // For text tool
  @Prop({ default: '' })
  text: string;

  @Prop({ default: 16 })
  fontSize: number;

  // Common properties
  @Prop({ required: true, default: '#ffffff' })
  color: string;

  @Prop({ required: true, default: 3 })
  width: number;

  @Prop({ required: true, default: 'pen' })
  tool: string;

  // Whether shape is filled or just outline
  @Prop({ default: false })
  filled: boolean;
}

export const StrokeSchema = SchemaFactory.createForClass(Stroke);
