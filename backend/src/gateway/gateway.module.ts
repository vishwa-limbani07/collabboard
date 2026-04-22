import { Module } from '@nestjs/common';
import { BoardGateway } from './board.gateway';

@Module({
  providers: [BoardGateway],
})
export class GatewayModule {}
