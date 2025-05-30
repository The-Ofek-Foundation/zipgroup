
"use client";

import type React from "react";
import { useState, useEffect, Suspense, useCallback } from "react";
import Joyride, { type Step, CallBackProps, STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { ActualPageContent } from "@/components/page-view/actual-page-content";
import { PageContentSpinner } from "@/components/ui/page-content-spinner";
import { defaultSampleAppData } from "@/hooks/use-app-data";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";


const JOYRIDE_SAMPLE_TAKEN_KEY = "linkwarp_joyride_sample_taken";

function SamplePageProvider() {
  const [runJoyride, setRunJoyride] = useState(false);
  const [joyrideKey, setJoyrideKey] = useState(Date.now());
  const [isFormOpenForJoyride, setIsFormOpenForJoyride] = useState(false); // To manually open form during tour

  const handleStartTour = () => {
    // Reset and start the tour
    setJoyrideKey(Date.now()); // Changing key re-mounts Joyride
    setRunJoyride(true);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tourTaken = localStorage.getItem(JOYRIDE_SAMPLE_TAKEN_KEY);
      if (!tourTaken) {
        // Auto-start tour on first visit, with a delay
        setTimeout(() => {
          setRunJoyride(true);
          setJoyrideKey(Date.now() + 1); // Ensure key changes if auto-starting after manual
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
      spotlightClicks: true, // Allows clicking the target element to advance
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
      spotlightClicks: true, // Allows clicking the target element to advance
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
      // User closed the tooltip manually
      setRunJoyride(false);
    }
    
    // Handle dialog opening/closing for tour steps
    // This logic needs to be robust and might require ActualPageContent to expose
    // a way to control its internal `isFormOpen` state, or for Joyride to be able
    // to click the "Add New Group" button itself if it's the target.
    if (type === EVENTS.SPOTLIGHT_CLICKED || type === EVENTS.STEP_AFTER) {
      // If the step was to click "Add New Group", we now need the form to be open
      // for the next steps to target elements inside the form.
      if (step.target === '[data-joyride="add-new-group-button"]' && index === 4) {
        // This is tricky without direct control over ActualPageContent's form dialog state.
        // For now, `spotlightClicks` on the button should open it.
        // We can use a state to pass down to ActualPageContent if manual control is needed.
         setIsFormOpenForJoyride(true); // Tell ActualPageContent to open its form
      }
      // If the step was to click "Save Group" in the form
      if (step.target === '[data-joyride="group-form-save-button"]' && index === 8) {
         // The form should close automatically on save.
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
          disableScrollParentFix // Can be useful if scrolling issues occur
          spotlightClicks={true} // Allow clicks on spotlighted elements to advance tour
          styles={{
            options: {
              zIndex: 10000, // Ensure Joyride is above other elements
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
      <ActualPageContent 
        key="sample" 
        pageId={null} 
        initialSharedData={defaultSampleAppData}
        onStartTour={handleStartTour} // Pass the function to trigger the tour
        // This prop tells ActualPageContent to open its form dialog for the tour.
        // It's a bit of a workaround; a more robust solution might involve a shared context or state manager.
        forceOpenFormDialog={isFormOpenForJoyride && joyrideKey > 0}
      />
    </>
  );
}


export default function SamplePage() {
  return (
    // Suspense needed if ActualPageContent or its children use it, or for router hooks
    <Suspense fallback={<PageContentSpinner />}>
      <SamplePageProvider />
    </Suspense>
  );
}

