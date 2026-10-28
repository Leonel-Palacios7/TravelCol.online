import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { env } from '../../config/env';
import { BookingsService } from '../bookings/bookings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SessionService } from '../auth/session.service';

/**
 * Trabajos periódicos en proceso (sin Redis ni colas: no hay necesidad medida todavía).
 * Son idempotentes y seguros si corren en varias instancias gracias a las actualizaciones
 * condicionales; aun así, en producción se recomienda una sola instancia con JOBS_ENABLED=true.
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger('Jobs');
  private running = new Set<string>();

  private async once(name: string, fn: () => Promise<number | void>) {
    if (!env().JOBS_ENABLED || this.running.has(name)) return;
    this.running.add(name);
    try {
      const n = await fn();
      if (typeof n === 'number' && n > 0) this.logger.log(`${name}: ${n} registro(s)`);
    } catch (e) {
      this.logger.error({ err: e }, `${name} falló`);
    } finally {
      this.running.delete(name);
    }
  }

  constructor(
    private readonly bookings: BookingsService,
    private readonly notifications: NotificationsService,
    private readonly sessions: SessionService,
  ) {}

  @Interval(60_000)
  expireHolds() {
    return this.once('expirar-reservas', () => this.bookings.expireHolds());
  }

  @Interval(10 * 60_000)
  completePast() {
    return this.once('completar-reservas', () => this.bookings.completePast());
  }

  @Interval(30_000)
  dispatchMail() {
    return this.once('despachar-correo', () => this.notifications.dispatchPending());
  }

  @Interval(6 * 3_600_000)
  purgeSessions() {
    return this.once('purgar-sesiones', () => this.sessions.purgeExpired());
  }
}
