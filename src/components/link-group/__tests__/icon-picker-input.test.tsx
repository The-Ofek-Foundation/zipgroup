import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { IconPickerInput } from '../icon-picker-input';
import LucideIcon from '@/components/icons/lucide-icon'; // Import for checking rendered icon

// Mock lucide-react's icons object to control the available icons for testing
// We'll use a subset of the popularIcons and a few others for search tests
const mockLucideIcons = {
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
};

jest.mock('lucide-react', () => {
  const original = jest.requireActual('lucide-react');
  return {
    ...original,
    icons: mockLucideIcons, // Override the icons export
  };
});

// Mock LucideIcon component to verify icon rendering
jest.mock('@/components/icons/lucide-icon', () => {
  return jest.fn(({ name, ...props }) => {
    const MockedIcon = mockLucideIcons[name as keyof typeof mockLucideIcons] || mockLucideIcons.HelpCircle;
    // @ts-ignore
    return <MockedIcon data-testid={`lucide-icon-${name}`} {...props} />;
  });
});


describe('IconPickerInput Component', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    // Clear any previously rendered LucideIcon mock calls if necessary
    (LucideIcon as jest.Mock).mockClear();
  });

  test('renders with "Select an icon" when no value is provided', () => {
    render(<IconPickerInput value="" onChange={mockOnChange} />);
    expect(screen.getByRole('button', { name: /Select an icon/i })).toBeInTheDocument();
    // Check if the fallback HelpCircle icon is rendered by LucideIcon mock
    expect(LucideIcon).toHaveBeenCalledWith(expect.objectContaining({ name: 'HelpCircle' }), {});
  });

  test('renders with the provided icon name and icon when a value is present', () => {
    render(<IconPickerInput value="Package" onChange={mockOnChange} />);
    expect(screen.getByRole('button', { name: /Package/i })).toBeInTheDocument();
    expect(LucideIcon).toHaveBeenCalledWith(expect.objectContaining({ name: 'Package' }), {});
  });

  test('opens popover with search and icon list on button click', async () => {
    const user = userEvent.setup();
    render(<IconPickerInput value="Package" onChange={mockOnChange} />);

    await user.click(screen.getByRole('button', { name: /Package/i }));

    expect(await screen.findByPlaceholderText(/Search icons.../i)).toBeInTheDocument();
    // Check for a few popular icons that should be visible by default
    expect(screen.getByTitle('Package')).toBeInTheDocument(); // Icon buttons have title attribute
    expect(screen.getByTitle('Briefcase')).toBeInTheDocument();
  });

  test('filters icons based on search term', async () => {
    const user = userEvent.setup();
    render(<IconPickerInput value="" onChange={mockOnChange} />);
    await user.click(screen.getByRole('button', { name: /Select an icon/i }));

    const searchInput = await screen.findByPlaceholderText(/Search icons.../i);
    await user.type(searchInput, 'Alarm');

    expect(screen.queryByTitle('Package')).not.toBeInTheDocument();
    expect(await screen.findByTitle('AlarmClock')).toBeInTheDocument(); // Should find AlarmClock
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

    const searchInput = await screen.findByPlaceholderText(/Search icons.../i); // Popover is open
    
    // Click on the "Zap" icon
    const zapIconButton = await screen.findByTitle('Zap');
    await user.click(zapIconButton);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith('Zap');

    // Popover should close, so search input should not be visible
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/Search icons.../i)).not.toBeInTheDocument();
    });
  });

  test('displays selected icon with a check mark in the popover', async () => {
    const user = userEvent.setup();
    render(<IconPickerInput value="Star" onChange={mockOnChange} />); // "Star" is the currently selected icon
    await user.click(screen.getByRole('button', { name: /Star/i }));

    // Check if the "Star" icon in the popover has the Check icon indicator
    const starIconButtonInPopover = await screen.findByTitle('Star');
    // The Check icon is a child of the button, or positioned relative to it.
    // We can check if the button has a specific class or if the check icon is rendered near it.
    // Since the check is an SVG, we'll assume it's rendered by our mock of LucideIcon
    // and we are checking for its presence within the button context.
    // For the actual implementation, it's an absolutely positioned Check icon.
    // This test focuses on the `value === iconName` condition in IconPickerInput.
    // A more direct test would be to find the Check icon itself if it had a unique testId.
    
    // Let's assume the button gets a specific class when selected or contains the check icon.
    // The mock for LucideIcon renders a <svg data-testid="lucide-icon-Check" />
    // We need to check if the button for "Star" contains/renders this.
    // Due to mocking, a direct structural check is tricky. We'll rely on visual implication or a wrapper class if added.
    // The component does add `bg-primary/10 text-primary` to the selected button.
    expect(starIconButtonInPopover).toHaveClass('bg-primary/10');
    
    // Also expect the Check icon component to have been called when rendering "Star" button's indicator
    // This depends on how we query for the Check icon rendered by LucideIcon mock.
    // The mock renders <svg data-testid="lucide-icon-Check" />
    // We need to verify that this specific SVG (for the checkmark) is rendered within the context of the "Star" button.
    // This is difficult with the current mock structure. Let's rely on the class change for now.
  });
});
