import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  /** When true, emits BreadcrumbList JSON-LD schema alongside the visible nav */
  withSchema?: boolean;
}

/**
 * Visible breadcrumb nav + optional BreadcrumbList JSON-LD.
 * Use on every deep page (services, articles, authority pages).
 */
export default function Breadcrumbs({ items, withSchema = true }: BreadcrumbsProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.label,
      ...(item.href ? { item: `https://astrokalki.com${item.href}` } : {}),
    })),
  };

  return (
    <>
      {withSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
      <nav aria-label="Breadcrumb" className="text-[10px] tracking-[0.2em] uppercase">
        <ol className="flex flex-wrap items-center gap-2 text-[#5a5a5a] font-light">
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            return (
              <li key={idx} className="flex items-center gap-2">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="hover:text-[#c9a96e] transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-[#7a7a7a]">{item.label}</span>
                )}
                {!isLast && <span className="text-[#3a3a3a]">/</span>}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
