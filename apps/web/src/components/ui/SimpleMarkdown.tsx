import type { ReactNode } from 'react';

/** Renderizador mínimo y seguro (sin HTML) para documentos legales: ##, >, - y **negrita**. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );
}

export function SimpleMarkdown({ source }: { source: string }) {
  const blocks = source.split(/\n{2,}/);
  return (
    <div className="space-y-4 text-pizarra">
      {blocks.map((b, i) => {
        if (b.startsWith('## ')) {
          const [title, ...rest] = b.split('\n');
          return (
            <div key={i}>
              <h2 className="mt-6 text-xl font-semibold text-selva-900">{title!.slice(3)}</h2>
              {rest.length > 0 && <p className="mt-2">{inline(rest.join(' '))}</p>}
            </div>
          );
        }
        if (b.startsWith('> ')) return <blockquote key={i} className="rounded-xl border-l-4 border-sol-500 bg-sol-100 px-4 py-3 text-selva-900">{inline(b.slice(2))}</blockquote>;
        return <p key={i}>{inline(b)}</p>;
      })}
    </div>
  );
}
