import { Global, Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

@Global()
@Module({ providers: [ReviewsService], exports: [ReviewsService] })
export class ReviewsModule {}
