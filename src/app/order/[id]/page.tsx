import OrderDetailClient from './client';

export function generateStaticParams() {
  return Array.from({ length: 100 }, (_, i) => ({ id: String(i) }));
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  return <OrderDetailClient params={params} />;
}
