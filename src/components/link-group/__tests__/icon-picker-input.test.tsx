
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { IconPickerInput } from '../icon-picker-input';

// Function to generate the mock icons object.
// This helps with Jest's hoisting behavior for jest.mock.
const getMockLucideIcons = () => ({
  Package: (props: any) => <svg data-testid="lucide-icon-Package" {...props} />,
  Briefcase: (props: any) => <svg data-testid="lucide-icon-Briefcase" {...props} />,
  Home: (props: any) => <svg data-testid="lucide-icon-Home" {...props} />,
  Settings: (props: any) => <svg data-testid="lucide-icon-Settings" {...props} />,
  FileText: (props: any) => <svg data-testid="lucide-icon-FileText" {...props} />,
  Users: (props: any) => <svg data-testid="lucide-icon-Users" {...props} />,
  Link: (props: any) => <svg data-testid="lucide-icon-Link" {...props} />,
  Folder: (props: any) => <svg data-testid="lucide-icon-Folder" {...props} />,
  Search: (props: any) => <svg data-testid="lucide-icon-Search" {...props} />,
  Star: (props: any) => <svg data-testid="lucide-icon-Star" {...props} />,
  Zap: (props: any) => <svg data-testid="lucide-icon-Zap" {...props} />,
  Globe: (props: any) => <svg data-testid="lucide-icon-Globe" {...props} />,
  HelpCircle: (props: any) => <svg data-testid="lucide-icon-HelpCircle" {...props} />, // Default fallback
  Airplay: (props: any) => <svg data-testid="lucide-icon-Airplay" {...props} />, // For search test
  AlarmClock: (props: any) => <svg data-testid="lucide-icon-AlarmClock" {...props} />, // For search test
  Check: (props: any) => <svg data-testid="lucide-icon-Check" {...props} />, // For selected indicator
});

// Mock 'lucide-react'
// Jest hoists jest.mock calls. The factory function is executed when the mock is prepared.
// Calling getMockLucideIcons() inside ensures the object is created at that point.
jest.mock('lucide-react', () => {
  const original = jest.requireActual('lucide-react');
  return {
    ...original,
    icons: getMockLucideIcons(), // Call the function to get icons
    // Also explicitly mock the Check component from lucide-react if it's directly imported by IconPickerInput
    Check: (props: any) => <svg data-testid="lucide-icon-Check" {...props} />,
  };
});

// Mock our custom '@/components/icons/lucide-icon' wrapper
jest.mock('@/components/icons/lucide-icon', () => {
  // This factory function is also subject to hoisting.
  return jest.fn(({ name, ...props }) => {
    const iconsMap = getMockLucideIcons(); // Get icons when factory is run
    const MockedIconComponent = iconsMap[name as keyof ReturnType<typeof getMockLucideIcons>] || iconsMap.HelpCircle;
    // @ts-ignore
    return <MockedIconComponent data-testid={`lucide-icon-${name}`} {...props} />;
  });
});


describe('IconPickerInput Component', () => {
  const mockOnChange = jest.fn();
  // Obtain a reference to the mocked LucideIcon for assertions
  // This needs to be done after jest.mock has run.
  let MockedLucideIconComponent: jest.Mock;

  beforeAll(() => {
    // Require the mocked module after mocks are set up
    MockedLucideIconComponent = require('@/components/icons/lucide-icon');
  });

  beforeEach(() => {
    mockOnChange.mockClear();
    if (MockedLucideIconComponent) {
      MockedLucideIconComponent.mockClear();
    }
  });

  test('renders with "Select an icon" when no value is provided', () => {
    render(<IconPickerInput value="" onChange={mockOnChange} />);
    expect(screen.getByRole('button', { name: /Select an icon/i })).toBeInTheDocument();
    expect(MockedLucideIconComponent).toHaveBeenCalledWith(expect.objectContaining({ name: 'HelpCircle' }), {});
  });

  test('renders with the provided icon name and icon when a value is present', () => {
    render(<IconPickerInput value="Package" onChange={mockOnChange} />);
    expect(screen.getByRole('button', { name: /Package/i })).toBeInTheDocument();
    expect(MockedLucideIconComponent).toHaveBeenCalledWith(expect.objectContaining({ name: 'Package' }), {});
  });

  test('opens popover with search and icon list on button click', async () => {
    const user = userEvent.setup();
    render(<IconPickerInput value="Package" onChange={mockOnChange} />);
    await user.click(screen.getByRole('button', { name: /Package/i }));
    expect(await screen.findByPlaceholderText(/Search icons.../i)).toBeInTheDocument();
    expect(screen.getByTitle('Package')).toBeInTheDocument();
    expect(screen.getByTitle('Briefcase')).toBeInTheDocument();
  });

  test('filters icons based on search term', async () => {
    const user = userEvent.setup();
    render(<IconPickerInput value="" onChange={mockOnChange} />);
    await user.click(screen.getByRole('button', { name: /Select an icon/i }));
    const searchInput = await screen.findByPlaceholderText(/Search icons.../i);
    await user.type(searchInput, 'Alarm');
    expect(screen.queryByTitle('Package')).not.toBeInTheDocument();
    expect(await screen.findByTitle('AlarmClock')).toBeInTheDocument();
    expect(screen.queryByTitle('Airplay')).not.toBeInTheDocument();
  });

  test('shows "No icons found" message for non-matching search', async () => {
    const user = userEvent.setup();
    render(<IconPickerInput value="" onChange={mockOnChange} />);
    await user.click(screen.getByRole('button', { name: /Select an icon/i }));
    const searchInput = await screen.findByPlaceholderText(/Search icons.../i);
    await user.type(searchInput, 'NonExistentIconName');
    expect(await screen.findByText(/No icons found for "NonExistentIconName"./i)).toBeInTheDocument();
  });

  test('calls onChange with selected icon and closes popover on icon click', async () => {
    const user = userEvent.setup();
    render(<IconPickerInput value="" onChange={mockOnChange} />);
    await user.click(screen.getByRole('button', { name: /Select an icon/i }));
    await screen.findByPlaceholderText(/Search icons.../i); // Wait for popover
    const zapIconButton = await screen.findByTitle('Zap');
    await user.click(zapIconButton);
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith('Zap');
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/Search icons.../i)).not.toBeInTheDocument();
    });
  });

  test('displays selected icon with a check mark in the popover', async () => {
    const user = userEvent.setup();
    render(<IconPickerInput value="Star" onChange={mockOnChange} />);
    await user.click(screen.getByRole('button', { name: /Star/i }));

    const starIconButtonInPopover = await screen.findByTitle('Star');
    expect(starIconButtonInPopover).toHaveClass('bg-primary/10');

    // The IconPickerInput uses <Check /> directly from 'lucide-react' for the indicator.
    // Our mock for 'lucide-react' provides our <svg data-testid="lucide-icon-Check" />.
    // So, we search for that test ID.
    const checkIcon = await screen.findByTestId('lucide-icon-Check');
    expect(checkIcon).toBeInTheDocument();
    // Check if it's a child of the star button, or at least associated.
    // This can be tricky. If the class `bg-primary/10` is only on the selected button,
    // and the check mark is only rendered for the selected button, this is a good indication.
    expect(starIconButtonInPopover.contains(checkIcon)).toBe(true);
  });
});

    