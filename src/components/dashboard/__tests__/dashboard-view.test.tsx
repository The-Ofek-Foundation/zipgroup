
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DndContext } from '@dnd-kit/core'; // For wrapping SortableContext if needed

import { DashboardView } from '../dashboard-view';
import type { AppData } from '@/lib/types';
import { TooltipProvider } from '@/components/ui/tooltip';

const LOCAL_STORAGE_PREFIX_DASHBOARD = "linkwarp_";
const DASHBOARD_ORDER_KEY = "linkwarp_dashboard_page_order";

// --- Mocks ---
const mockCreateNewBlankPageAndRedirect = jest.fn();
const mockSetDashboardThemeMode = jest.fn();
const mockSetDashboardCustomPrimaryColor = jest.fn();
const mockToast = jest.fn();
const mockRouterPush = jest.fn();

jest.mock('@/hooks/use-app-data', () => ({
  useAppData: jest.fn(() => ({
    createNewBlankPageAndRedirect: mockCreateNewBlankPageAndRedirect,
  })),
}));

let mockDashboardThemeIsLoading = false;
jest.mock('@/hooks/use-dashboard-theme', () => ({
  useDashboardTheme: jest.fn(() => ({
    themeMode: 'light',
    customPrimaryColor: undefined,
    isLoading: mockDashboardThemeIsLoading,
    setDashboardThemeMode: mockSetDashboardThemeMode,
    setDashboardCustomPrimaryColor: mockSetDashboardCustomPrimaryColor,
  })),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  usePathname: jest.fn(() => '/'), // Dashboard is at root
  useSearchParams: jest.fn(() => new URLSearchParams()),
  Link: jest.fn(({ href, children }) => <a href={href}>{children}</a>),
}));

// Mock localStorage
let store: { [key: string]: string } = {};
const mockLocalStorage = {
  getItem: jest.fn((key: string) => store[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    store[key] = value.toString();
  }),
  removeItem: jest.fn((key: string) => {
    delete store[key];
  }),
  clear: jest.fn(() => {
    store = {};
  }),
  key: jest.fn((i: number) => Object.keys(store)[i] || null),
  get length() {
    return Object.keys(store).length;
  },
};

const mockMatchMedia = jest.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

const mockWriteText = jest.fn().mockResolvedValue(undefined);

const setupWindowMocks = () => {
  Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true, configurable: true });
  Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia, writable: true, configurable: true });
};

const renderDashboard = () => {
  return render(
    <TooltipProvider>
      <DashboardView />
    </TooltipProvider>
  );
};

const samplePage1Data: AppData = {
  pageTitle: "Page One",
  linkGroups: [{ id: 'g1', name: 'Group 1', icon: 'Package', urls: ['url1.com'] }],
  theme: 'light',
  lastModified: new Date('2023-01-01T10:00:00Z').getTime(),
};

const samplePage2Data: AppData = {
  pageTitle: "Page Two",
  linkGroups: [],
  theme: 'dark',
  customPrimaryColor: '#FF0000',
  lastModified: new Date('2023-01-02T10:00:00Z').getTime(),
};


describe('DashboardView Component', () => {
  beforeEach(() => {
    setupWindowMocks();
    store = {}; // Clear the actual store object directly for localStorage mock
    mockLocalStorage.getItem.mockImplementation((key: string) => store[key] || null);
    mockLocalStorage.setItem.mockImplementation((key: string, value: string) => { store[key] = value; });
    mockLocalStorage.removeItem.mockImplementation((key: string) => { delete store[key]; });
    
    // Note: user-event library sets up its own navigator.clipboard mock during setup()
    // We'll override the writeText method in individual tests after user.setup()
    
    mockMatchMedia.mockClear().mockImplementation(query => ({
      matches: false, media: query, onchange: null, addListener: jest.fn(), removeListener: jest.fn(),
      addEventListener: jest.fn(), removeEventListener: jest.fn(), dispatchEvent: jest.fn(),
    }));
    mockCreateNewBlankPageAndRedirect.mockClear();
    mockSetDashboardThemeMode.mockClear();
    mockSetDashboardCustomPrimaryColor.mockClear();
    mockToast.mockClear();
    mockRouterPush.mockClear();
    mockWriteText.mockClear();
    mockDashboardThemeIsLoading = false;
    
    // Suppress console warnings for Radix UI accessibility warnings in tests
    jest.spyOn(console, 'error').mockImplementation((message) => {
      if (typeof message === 'string' && (
        (message.includes('DialogContent') && message.includes('DialogTitle')) ||
        (message.includes('Unknown event handler property'))
      )) {
        return;
      }
      console.error(message);
    });
    
    jest.spyOn(console, 'warn').mockImplementation((message) => {
      if (typeof message === 'string' && message.includes('Missing') && message.includes('Description')) {
        return;
      }
      console.warn(message);
    });
    
    // Don't suppress console.log for now
    // jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('shows loading spinner when dashboard theme is loading', async () => {
    mockDashboardThemeIsLoading = true;
    renderDashboard();
    expect(screen.getByText(/Loading your ZipGroup home.../i)).toBeInTheDocument();
    expect(screen.queryByText(/No ZipGroup Pages Yet/i)).not.toBeInTheDocument();
  });

  test('renders empty state when no pages are in localStorage', async () => {
    renderDashboard();
    expect(await screen.findByText(/No ZipGroup Pages Yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Your First Page/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explore Sample Page/i })).toHaveAttribute('href', '/sample');
  });

  test('calls createNewBlankPageAndRedirect from empty state button', async () => {
    const user = userEvent.setup();
    renderDashboard();
    const createButton = await screen.findByRole('button', { name: /Create Your First Page/i });
    await user.click(createButton);
    expect(mockCreateNewBlankPageAndRedirect).toHaveBeenCalledTimes(1);
  });

  test('renders page cards from localStorage', async () => {
    mockLocalStorage.setItem(`${LOCAL_STORAGE_PREFIX_DASHBOARD}id1`, JSON.stringify(samplePage1Data));
    mockLocalStorage.setItem(`${LOCAL_STORAGE_PREFIX_DASHBOARD}id2`, JSON.stringify(samplePage2Data));
    
    renderDashboard();

    expect(await screen.findByText('Page One')).toBeInTheDocument();
    expect(screen.getByText(/1 Link Group/i)).toBeInTheDocument();
    expect(screen.getByText('Page Two')).toBeInTheDocument();
    expect(screen.getByText(/0 Link Groups/i)).toBeInTheDocument();
    expect(screen.getByText(/Custom Color:/i)).toBeInTheDocument();
  });
  
  test('handles page deletion correctly', async () => {
    const user = userEvent.setup();
    mockLocalStorage.setItem(`${LOCAL_STORAGE_PREFIX_DASHBOARD}id1`, JSON.stringify(samplePage1Data));
    mockLocalStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(['id1']));

    renderDashboard();
    
    const pageOneCard = await screen.findByText('Page One');
    expect(pageOneCard).toBeInTheDocument();

    const cardForPageOne = screen.getByText('Page One').closest('div[class*="card"]') as HTMLElement;
    if (!cardForPageOne) throw new Error("Could not find card for Page One");

    const deleteButton = within(cardForPageOne).getByRole('button', { name: /delete page Page One/i });
    await user.click(deleteButton);

    const confirmDialog = await screen.findByRole('dialog', { name: /are you absolutely sure/i });
    expect(confirmDialog).toBeInTheDocument();
    const confirmDeleteBtn = within(confirmDialog).getByRole('button', { name: /delete page/i });
    
    await user.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(screen.queryByText('Page One')).not.toBeInTheDocument();
    });
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(`${LOCAL_STORAGE_PREFIX_DASHBOARD}id1`);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(DASHBOARD_ORDER_KEY, JSON.stringify([]));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Page Deleted" }));
  });

  test('handles page sharing correctly', async () => {
    // Setup user-event first - it will set up its own clipboard mock
    const user = userEvent.setup();
    
    // Now override the clipboard.writeText method with our own mock after user-event has set it up
    Object.defineProperty(navigator.clipboard, 'writeText', {
      value: mockWriteText,
      writable: true,
      configurable: true,
    });
    
    // Make sure the data exists in the store first
    store[`${LOCAL_STORAGE_PREFIX_DASHBOARD}id1`] = JSON.stringify(samplePage1Data);
    
    // Mock window.location for the share URL creation
    delete (window as any).location;
    (window as any).location = { origin: 'http://localhost:3000' };
    
    renderDashboard();
    const pageOneCard = await screen.findByText('Page One');
    expect(pageOneCard).toBeInTheDocument();

    const shareButton = screen.getByRole('button', { name: /share page Page One/i });
    await user.click(shareButton);

    // Wait for the clipboard and toast operations to complete
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledTimes(1);
    });
    
    const expectedShareData = { ...samplePage1Data };
    delete (expectedShareData as any).lastModified;
    const encodedJson = encodeURIComponent(JSON.stringify(expectedShareData));
    const expectedShareUrl = `${window.location.origin}/import?sharedData=${encodedJson}`;
    
    expect(mockWriteText).toHaveBeenCalledWith(expectedShareUrl);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ 
      title: "Share Link Copied!",
      description: "The link to share this page has been copied to your clipboard."
    }));
  });

  test('applies theme and custom color from useDashboardTheme', async () => {
    const mockUseDashboardTheme = require('@/hooks/use-dashboard-theme').useDashboardTheme;
    mockUseDashboardTheme.mockReturnValue({
      themeMode: 'dark',
      customPrimaryColor: '#123456', // Example hex
      isLoading: false,
      setDashboardThemeMode: mockSetDashboardThemeMode,
      setDashboardCustomPrimaryColor: mockSetDashboardCustomPrimaryColor,
    });

    renderDashboard();
    await screen.findByTestId("app-header"); 

    expect(document.documentElement).toHaveClass('dark');
    // #123456 -> hsl(210, 65.4%, 20.4%)
    // Check for parts of the HSL string
    const primaryStyle = document.documentElement.style.getPropertyValue('--primary');
    expect(primaryStyle).toMatch(/210/); // Check for hue
    expect(primaryStyle).toMatch(/65.4%/); // Check for saturation
    expect(primaryStyle).toMatch(/20.4%/); // Check for lightness
  });

  test('correctly auto-deletes empty default pages on load', async () => {
    const emptyDefaultPage: AppData = {
      pageTitle: "New ZipGroup Page",
      linkGroups: [],
      theme: 'light',
      customPrimaryColor: undefined,
    };
    
    // Set up localStorage data BEFORE rendering - this is key for auto-delete to work
    store[`${LOCAL_STORAGE_PREFIX_DASHBOARD}emptyId`] = JSON.stringify(emptyDefaultPage);
    store[`${LOCAL_STORAGE_PREFIX_DASHBOARD}id1`] = JSON.stringify(samplePage1Data);
    store[DASHBOARD_ORDER_KEY] = JSON.stringify(['emptyId', 'id1']);

    renderDashboard();

    // Wait for auto-deletion to complete - the empty page should be removed
    await waitFor(() => {
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(`${LOCAL_STORAGE_PREFIX_DASHBOARD}emptyId`);
    });

    // Page One should be displayed after the empty page is removed
    await waitFor(() => {
      expect(screen.getByText("Page One")).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Verify the empty page is not displayed
    expect(screen.queryByText("New ZipGroup Page")).not.toBeInTheDocument();
    
    // Verify that the dashboard order was updated to exclude the deleted page
    await waitFor(() => {
        const orderSetCall = mockLocalStorage.setItem.mock.calls.find(call => 
          call[0] === DASHBOARD_ORDER_KEY && 
          call[1] === JSON.stringify(['id1'])
        );
        expect(orderSetCall).toBeDefined();
    });
  });
  
  test.todo('handles page reordering via drag and drop');

});

function within(element: HTMLElement) {
  const { getByRole, queryByRole, findByRole } = require('@testing-library/dom');
  return {
    getByRole: (role: string, options?: any) => getByRole(element, role, options),
    queryByRole: (role: string, options?: any) => queryByRole(element, role, options),
    findByRole: (role: string, options?: any) => findByRole(element, role, options),
  };
}

// Mock AppHeader to consume props and avoid React warnings
jest.mock('@/components/layout/app-header', () => ({
  AppHeader: jest.fn(({ 
    onCreateNewPage, 
    customPrimaryColor, 
    onSetCustomPrimaryColor, 
    themeMode, 
    onSetThemeMode, 
    showHomePageLink, 
    showSamplePageLink, 
    showShareButton, // Consume the prop
    onInitiateShare,
    canShareCurrentPage,
    isReadOnlyPreview,
    onInitiateDelete,
    canDeleteCurrentPage,
    joyrideProps
  }) => <div data-testid="app-header" data-customprimarycolor={customPrimaryColor} data-thememode={themeMode}>Mock AppHeader</div>),
}));
jest.mock('@/components/layout/app-footer', () => ({
  AppFooter: jest.fn(({ onCreateNewPage, ...props }) => <div data-testid="app-footer" {...props}>Mock AppFooter</div>),
}));
