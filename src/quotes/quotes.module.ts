import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service.js';
import { QuotesController } from './quotes.controller.js';

@Module({
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}
