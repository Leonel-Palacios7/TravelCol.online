import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

/**
 * Controles de propiedad: todo acceso de un proveedor pasa por aquí. Los recursos ajenos
 * responden 404 (no se revela su existencia).
 */
@Injectable()
export class ProviderAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async provider(userId: string, opts: { requireApproved?: boolean } = { requireApproved: true }) {
    const provider = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!provider) throw new ForbiddenException('Tu cuenta no tiene un perfil de proveedor aprobado');
    if (opts.requireApproved && provider.status !== 'APPROVED') {
      throw new ForbiddenException('Tu perfil de proveedor no está habilitado (en revisión o suspendido)');
    }
    return provider;
  }

  async ownedService(userId: string, serviceId: string) {
    const provider = await this.provider(userId);
    const service = await this.prisma.tourismService.findFirst({ where: { id: serviceId, providerId: provider.id } });
    if (!service) throw new NotFoundException('Servicio no encontrado');
    return { provider, service };
  }
}
