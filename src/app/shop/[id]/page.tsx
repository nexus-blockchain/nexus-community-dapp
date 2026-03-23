import ShopDetailClient from './client';

export function generateStaticParams() {
  return Array.from({ length: 1000 }, (_, i) => ({ id: String(i) }));
}

export default function ShopDetailPage({ params }: { params: { id: string } }) {
  return <ShopDetailClient params={params} />;
}
