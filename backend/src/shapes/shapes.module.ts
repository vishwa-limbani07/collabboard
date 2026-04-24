import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Stroke, StrokeSchema } from './schemas/stroke.schema';
import { ShapesService } from './shapes.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Stroke.name, schema: StrokeSchema }]),
  ],
  providers: [ShapesService],
  exports: [ShapesService],
})
export class ShapesModule {}
