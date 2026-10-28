import { Injectable, Logger } from '@nestjs/common';
import { env } from '../../config/env';

export interface WompiTransaction {
  id: string;
  status: string;
  reference: string;
  amount_in_cents: number;
  currency: string;
  payment_method_type?: string;
  status_message?: string | null;
}

/**
 * Cliente mínimo de la API de Wompi (consulta de transacciones desde el backend).
 * Nunca se usa desde el navegador; la llave privada no sale del servidor.
 */
@Injectable()
export class WompiClient {
  private readonly logger = new Logger('Wompi');

  async getTransaction(transactionId: string): Promise<WompiTransaction | null> {
    if (!/^[A-Za-z0-9-]{3,64}$/.test(transactionId)) return null;
    const url = `${env().WOMPI_API_URL}/transactions/${encodeURIComponent(transactionId)}`;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${env().WOMPI_PRIVATE_KEY}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        this.logger.warn(`Consulta de transacción ${transactionId} respondió ${res.status}`);
        return null;
      }
      const body = (await res.json()) as { data?: WompiTransaction };
      return body.data ?? null;
    } catch (e) {
      this.logger.warn(`No fue posible consultar la transacción ${transactionId}: ${(e as Error).message}`);
      return null;
    }
  }
}
