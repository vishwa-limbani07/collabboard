import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Think of @Schema like @Component — it's a decorator that tells NestJS
// "this class represents a MongoDB collection"
@Schema({ timestamps: true })
export class User extends Document {
  // @Prop is like @Input in Angular — it defines a field
  @Prop({ required: true })
  name: string | undefined;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string | undefined;

  @Prop({ required: true })
  password: string | undefined;

  @Prop({ default: null })
  avatar: string | undefined;
}

// This creates the actual Mongoose model from the class
export const UserSchema = SchemaFactory.createForClass(User);
