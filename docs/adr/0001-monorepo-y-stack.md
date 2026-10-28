# ADR 0001: Monorepo pnpm con Next.js, NestJS y contratos compartidos

- Estado: aceptada (28-oct-2026)

## Contexto
El encargo pide Next.js, NestJS, Prisma y PostgreSQL. Web y API comparten validaciones, enums y reglas de dinero; si se duplican, divergen.

## Decisión
Monorepo con pnpm workspaces y Turborepo: `apps/web` (Next.js 16, App Router), `apps/api` (NestJS 11) y `packages/contracts` (Zod 4, enums y funciones puras de precio y política). Node 22 LTS y TypeScript estricto en todo el repositorio. Una prueba unitaria verifica que los enums de los contratos coinciden con los de Prisma.

## Consecuencias
- Un solo cambio de esquema actualiza la validación en el navegador y en el servidor.
- El servidor sigue siendo la autoridad: el cliente usa los esquemas solo para dar mensajes rápidos.
- La compilación debe respetar el orden (contratos primero), que Turborepo resuelve.
