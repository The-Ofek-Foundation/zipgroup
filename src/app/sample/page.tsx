
"use client";

import type React from "react";
import { useState, useEffect, Suspense, useCallback } from "react";
import Joyride, { type Step, CallBackProps, STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { ActualPageContent } from "@/components/page-view/actual-page-content";
import { PageContentSpinner } from "@/components/ui/page-content-spinner";
import { defaultSampleAppData } from "@/hooks/use-app-data";


const JOYRIDE_SAMPLE_TAKEN_KEY = "linkwarp_joyride_sample_taken";

function SamplePageProvider() {
  const [runJoyride, setRunJoyride] = useState(false);
  const [joyrideKey, setJoyrideKey] = useState(Date.now());
  const [isFormOpenForJoyride, setIsFormOpenForJoyride] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tourTaken = localStorage.getItem(JOYRIDE_SAMPLE_TAKEN_KEY);
      if (!tourTaken) {
        setTimeout(() => {
          setRunJoyride(true);
          setJoyrideKey(Date.now() + 1);
        }, 500);
      }
    }
  }, []);

  const samplePageJoyrideSteps: Step[] = [
    {
      target: '[data-joyride="page-title-input"]',
      content: 'Customize your page title here. This is the main heading for your ZipGroup page.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="theme-switcher"]',
      content: 'Toggle between light and dark themes for your page.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="custom-color-picker"]',
      content: 'Pick a custom primary color to personalize your page further.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="interactive-sample-info"]',
      content: 'This page is fully interactive! Customize it, then let\'s try adding a link group.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="add-new-group-button"]',
      content: 'Click here to add a new link group. Your changes on this page are temporary until you save the entire page.',
      placement: 'top',
      disableBeacon: true,
      spotlightClicks: true,
    },
    {
      target: '[data-joyride="group-form-name-input"]',
      content: 'Enter a name for your group (e.g., "Work Links", "Social Media").',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="group-form-icon-picker"]',
      content: 'Choose an icon that represents your group.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="group-form-urls-input"]',
      content: 'Add your links here. You can add multiple URLs and drag them to reorder.',
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="group-form-save-button"]',
      content: 'Click to save your new link group!',
      placement: 'top',
      disableBeacon: true,
      spotlightClicks: true,
    },
    {
      target: '[data-joyride="link-group-card"]',
      content: 'Your link groups appear as cards. If you have multiple, you can drag them to reorder.',
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="link-group-edit-button"]',
      content: 'Use the edit button to modify a group\'s details or links.',
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="link-group-delete-button"]',
      content: 'And the delete button to remove a group.',
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-joyride="save-sample-page-button"]',
      content: 'Great! Now you know the basics. Save your customized sample page to your home page to keep all your changes and get a unique shareable link!',
      placement: 'top',
      disableBeacon: true,
    },
  ];

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, action, index, step } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunJoyride(false);
      if (status === STATUS.FINISHED) {
        localStorage.setItem(JOYRIDE_SAMPLE_TAKEN_KEY, 'true');
      }
    }

    if (type === EVENTS.TOOLTIP_CLOSE && action === ACTIONS.CLOSE) {
      setRunJoyride(false);
    }
    
    if (type === EVENTS.SPOTLIGHT_CLICKED || type === EVENTS.STEP_AFTER) {
      if (step.target === '[data-joyride="add-new-group-button"]' && index === 4) {
        setIsFormOpenForJoyride(true); 
      }
      if (step.target === '[data-joyride="group-form-save-button"]' && index === 8) {
         setIsFormOpenForJoyride(false);
      }
    }
  }, []);
  
  return (
    <>
      {typeof window !== 'undefined' && (
        <Joyride
          key={joyrideKey}
          steps={samplePageJoyrideSteps}
          run={runJoyride}
          callback={handleJoyrideCallback}
          continuous
          showProgress
          showSkipButton
          scrollToFirstStep
          disableScrollParentFix
          spotlightClicks={true}
          styles={{
            options: {
              zIndex: 10000,
              arrowColor: 'hsl(var(--background))',
              backgroundColor: 'hsl(var(--background))',
              primaryColor: 'hsl(var(--primary))',
              textColor: 'hsl(var(--foreground))',
            },
            tooltip: {
              borderRadius: 'var(--radius)',
            },
          }}
        />
      )}
      {/* Pass isFormOpenForJoyride to ActualPageContent if it needs to control the form dialog for the tour */}
      <ActualPageContent 
        key="sample" 
        pageId={null} 
        initialSharedData={defaultSampleAppData}
        // Pass a prop to ActualPageContent if Joyride needs to open its dialog
        // e.g., forceOpenFormDialog={isFormOpenForJoyride && joyrideKey > 0}
        // ActualPageContent would then need to handle this prop.
        // For now, the tour relies on data-joyride attributes and spotlightClicks.
      />
    </>
  );
}


export default function SamplePage() {
  return (
    <Suspense fallback={<PageContentSpinner />}>
      <SamplePageProvider />
    </Suspense>
  );
}
