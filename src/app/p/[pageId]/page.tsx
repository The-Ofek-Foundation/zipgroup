
"use client";

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { ActualPageContent } from '@/components/page-view/actual-page-content';
import { PageContentSpinner } from '@/components/ui/page-content-spinner'; // For Suspense fallback

// This component will render the actual page content for a specific page ID
export default function PageById() {
  const params = useParams();
  const pageId = typeof params.pageId === 'string' ? params.pageId : null;

  // While ActualPageContent itself uses useAppData which has its own loading,
  // this top-level suspense ensures that if ActualPageContent had heavy static
  // imports or was lazy-loaded, it would be handled.
  // Since ActualPageContent directly uses hooks, a direct render is fine.
  // The key prop ensures re-mounting when pageId changes significantly.
  return (
    <Suspense fallback={<PageContentSpinner />}>
      <ActualPageContent key={pageId} pageId={pageId} />
    </Suspense>
  );
}
