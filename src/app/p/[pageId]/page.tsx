
"use client";

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { ActualPageContent } from '@/components/page-view/actual-page-content';
import { PageContentSpinner } from '@/components/ui/page-content-spinner';

export default function PageById() {
  const params = useParams();
  const pageId = typeof params.pageId === 'string' ? params.pageId : null;

  // The key={pageId} is crucial. When navigating between different /p/[pageId] routes,
  // this ensures ActualPageContent and its useAppData hook re-mount and re-initialize
  // with the new pageId, preventing state from a previous page bleeding into the new one.
  return (
    <Suspense fallback={<PageContentSpinner />}>
      <ActualPageContent key={pageId} pageId={pageId} />
    </Suspense>
  );
}
