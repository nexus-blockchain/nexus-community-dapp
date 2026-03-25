import ProductDetailClient from './client';

export function generateStaticParams() {
  // Pre-generate a range of IDs for static export.
  // Actual data loads client-side; these are just shell pages.
  // cap-spa-fix.js handles IDs beyond this range via 404 fallback.
  return Array.from({ length: 100 }, (_, i) => ({ id: String(i) }));
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  return <ProductDetailClient params={params} />;
}
