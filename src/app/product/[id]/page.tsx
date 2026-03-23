import ProductDetailClient from './client';

export function generateStaticParams() {
  // Generate placeholder params — Capacitor URL rewriting serves this
  // HTML shell for any /product/[id]/ path; actual data loads client-side.
  return Array.from({ length: 1000 }, (_, i) => ({ id: String(i) }));
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  return <ProductDetailClient params={params} />;
}
