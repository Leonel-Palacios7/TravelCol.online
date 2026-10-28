import { humanCode } from './crypto';

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export const uniqueSlug = (input: string) => `${slugify(input)}-${humanCode(5).toLowerCase()}`;
