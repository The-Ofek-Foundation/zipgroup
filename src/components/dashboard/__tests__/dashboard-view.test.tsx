
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
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: mockWriteText },
    writable: true,
    configurable: true, // Allow userEvent to redefine it
  });
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

    const cardForPageOne = screen.getByText('Page One').closest('div[class*="card"]');
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
    const user = userEvent.setup();
    mockLocalStorage.setItem(`${LOCAL_STORAGE_PREFIX_DASHBOARD}id1`, JSON.stringify(samplePage1Data));
    
    renderDashboard();
    const pageOneCard = await screen.findByText('Page One');
    expect(pageOneCard).toBeInTheDocument();
    
    const cardForPageOne = screen.getByText('Page One').closest('div[class*="card"]');
    if (!cardForPageOne) throw new Error("Could not find card for Page One for sharing");

    const shareButton = within(cardForPageOne).getByRole('button', { name: /share page Page One/i });
    await user.click(shareButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledTimes(1);
    });
    
    const expectedShareData = { ...samplePage1Data };
    delete (expectedShareData as any).lastModified;
    const encodedJson = encodeURIComponent(JSON.stringify(expectedShareData));
    const expectedShareUrl = `${window.location.origin}/import?sharedData=${encodedJson}`;
    
    expect(mockWriteText).toHaveBeenCalledWith(expectedShareUrl);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Share Link Copied!" }));
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
    mockLocalStorage.setItem(`${LOCAL_STORAGE_PREFIX_DASHBOARD}emptyId`, JSON.stringify(emptyDefaultPage));
    mockLocalStorage.setItem(`${LOCAL_STORAGE_PREFIX_DASHBOARD}id1`, JSON.stringify(samplePage1Data));
    mockLocalStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(['emptyId', 'id1']));

    renderDashboard();

    await waitFor(() => {
        expect(screen.queryByText("New ZipGroup Page")).not.toBeInTheDocument();
    });
    await waitFor(() => { // Added waitFor for "Page One"
      expect(screen.getByText("Page One")).toBeInTheDocument();
    });
    
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(`${LOCAL_STORAGE_PREFIX_DASHBOARD}emptyId`);
    await waitFor(() => {
        const orderSetCall = mockLocalStorage.setItem.mock.calls.find(call => call[0] === DASHBOARD_ORDER_KEY && JSON.parse(call[1]).includes('id1'));
        expect(orderSetCall).toBeDefined();
        if(orderSetCall) {
            expect(JSON.parse(orderSetCall[1])).toEqual(['id1']);
        }
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
  }) => <div data-testid="app-header" customprimarycolor={customPrimaryColor} thememode={themeMode}>Mock AppHeader</div>),
}));
jest.mock('@/components/layout/app-footer', () => ({
  AppFooter: jest.fn((props) => <div data-testid="app-footer" {...props}>Mock AppFooter</div>),
}));
