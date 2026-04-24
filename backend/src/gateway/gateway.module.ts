import { Module } from '@nestjs/common';
import { BoardGateway } from './board.gateway';
import { ShapesModule } from '../shapes/shapes.module';

@Module({
  imports: [ShapesModule],
  providers: [BoardGateway],
})
export class GatewayModule {}
