import { Global, Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { LedgerService } from './ledger.service';

@Global()
@Module({ providers: [FinanceService, LedgerService], exports: [FinanceService, LedgerService] })
export class FinanceModule {}
