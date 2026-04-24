import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Sticky extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Board', required: true, index: true })
  boardId: Types.ObjectId;

  @Prop({ required: true })
  stickyId: string;

  @Prop({ default: '' })
  text: string;

  @Prop({ required: true, default: 200 })
  x: number;

  @Prop({ required: true, default: 200 })
  y: number;

  @Prop({ default: 200 })
  width: number;

  @Prop({ default: 150 })
  height: number;

  @Prop({ default: '#feca57' })
  color: string;

  @Prop({ default: 14 })
  fontSize: number;
}

export const StickySchema = SchemaFactory.createForClass(Sticky);