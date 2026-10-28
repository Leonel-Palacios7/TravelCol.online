import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { BOOKING_STATUSES, CANCELLATION_POLICIES, PAYMENT_STATUSES, SERVICE_STATUSES, USER_ROLES } from '@travelcol/contracts';

/** Garantiza que los enums compartidos coinciden con los de la base de datos. */
const schema = readFileSync(path.resolve(__dirname, '../../prisma/schema.prisma'), 'utf8');
function prismaEnum(name: string): string[] {
  const m = schema.match(new RegExp(`enum ${name} \\{([^}]*)\\}`));
  return m![1]!.split('\n').map((l) => l.trim()).filter(Boolean);
}

it.each([
  ['UserRole', USER_ROLES],
  ['BookingStatus', BOOKING_STATUSES],
  ['PaymentStatus', PAYMENT_STATUSES],
  ['ServiceStatus', SERVICE_STATUSES],
  ['CancellationPolicy', CANCELLATION_POLICIES],
])('enum %s sincronizado', (name, values) => {
  expect(prismaEnum(name)).toEqual([...values]);
});
