import { applyDecorators, BadRequestException, PipeTransform } from '@nestjs/common';
import { ApiBody, ApiQuery } from '@nestjs/swagger';
import { z, ZodType } from 'zod';

/** Pipe de validación basado en los esquemas compartidos de @travelcol/contracts. */
export class ZodPipe<T extends ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}
  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value ?? {});
    if (!result.success) {
      throw new BadRequestException({
        message: 'Los datos enviados no son válidos',
        errors: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    return result.data;
  }
}

function jsonSchema(schema: ZodType): Record<string, unknown> {
  try {
    return z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as Record<string, unknown>;
  } catch {
    return { type: 'object' };
  }
}

/** Documenta en OpenAPI el cuerpo esperado a partir del esquema Zod. */
export const ApiZodBody = (schema: ZodType) =>
  applyDecorators(ApiBody({ schema: jsonSchema(schema) as never }));

/** Documenta los parámetros de consulta a partir de un objeto Zod. */
export function ApiZodQuery(schema: ZodType) {
  const js = jsonSchema(schema) as { properties?: Record<string, Record<string, unknown>> };
  const decorators = Object.entries(js.properties ?? {}).map(([name, s]) =>
    ApiQuery({ name, required: false, schema: s as never }),
  );
  return applyDecorators(...decorators);
}
