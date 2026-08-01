"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MyTradeRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/?tab=bots');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-white font-body">
      <div className="flex flex-col items-center gap-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-t-transparent border-[#c2ff0c]" />
        <span className="text-xs text-white/50">Redirection vers le Terminal de Trading...</span>
      </div>
    </div>
  );
}
