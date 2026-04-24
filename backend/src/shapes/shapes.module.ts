import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Stroke, StrokeSchema } from './schemas/stroke.schema';
import { Sticky, StickySchema } from './schemas/sticky.schema';
import { ShapesService } from './shapes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Stroke.name, schema: StrokeSchema },
      { name: Sticky.name, schema: StickySchema },
    ]),
  ],
  providers: [ShapesService],
  exports: [ShapesService],
})
export class ShapesModule {}
