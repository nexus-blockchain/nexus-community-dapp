'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MemberInvitePage() {
  const router = useRouter();
  useEffect(() => { router.replace('/member/network'); }, [router]);
  return null;
}
