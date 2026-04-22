import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Board extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  // The user who created this board
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId;

  // Users who have access to this board
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  members: Types.ObjectId[];

  // Unique invite code — so others can join via link
  @Prop({ required: true, unique: true })
  inviteCode: string;

  @Prop({ default: '#1a1a2e' })
  backgroundColor: string;
}

export const BoardSchema = SchemaFactory.createForClass(Board);
