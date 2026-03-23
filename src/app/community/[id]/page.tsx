import CommunityDetailClient from './client';

export function generateStaticParams() {
  return Array.from({ length: 1000 }, (_, i) => ({ id: String(i) }));
}

export default function CommunityDetailPage({ params }: { params: { id: string } }) {
  return <CommunityDetailClient params={params} />;
}
