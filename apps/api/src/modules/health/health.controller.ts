import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/auth.decorators';
import { PrismaService } from '../../common/prisma.service';

@ApiTags('Salud')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  live() {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'down' });
    }
    const pendingStale = await this.prisma.payment.count({
      where: { status: { in: ['CREATED', 'PENDING'] }, createdAt: { lt: new Date(Date.now() - 2 * 3_600_000) } },
    });
    return { status: 'ok', database: 'up', stalePendingPayments: pendingStale };
  }
}
