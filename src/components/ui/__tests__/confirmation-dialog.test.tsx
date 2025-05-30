import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { ConfirmationDialog } from '../confirmation-dialog';
import { Button } from '../button'; // To test the buttons within the dialog
import { Loader2 } from 'lucide-react'; // To check for loader icon

// Mock Lucide icons to avoid rendering complexities in tests
jest.mock('lucide-react', () => {
  const originalModule = jest.requireActual('lucide-react');
  return {
    ...originalModule,
    Loader2: () => <div data-testid="loader-icon">Loader</div>,
    // Add other icons if they appear directly in ConfirmationDialog and cause issues
  };
});


describe('ConfirmationDialog Component', () => {
  const mockOnConfirm = jest.fn();
  const mockOnOpenChange = jest.fn();

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    title: 'Test Title',
    description: 'Test description content.',
    onConfirm: mockOnConfirm,
  };

  beforeEach(() => {
    // Reset mocks before each test
    mockOnConfirm.mockClear();
    mockOnOpenChange.mockClear();
  });

  test('renders with default props when open is true', () => {
    render(<ConfirmationDialog {...defaultProps} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test description content.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  test('does not render content when open is false', () => {
    const { container } = render(<ConfirmationDialog {...defaultProps} open={false} />);
    // Radix Dialogs often mount to portal, so check for absence of key elements
    // or if the dialog root itself is not present in the direct container (might need more specific check)
    // For this setup, if open is false, DialogContent should not be in the document.
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  test('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfirmationDialog {...defaultProps} />);

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  test('calls onOpenChange with false when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfirmationDialog {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  test('calls onOpenChange with false when Escape key is pressed', async () => {
    const user = userEvent.setup();
    render(<ConfirmationDialog {...defaultProps} />);
    
    // Dialog needs to be in the DOM for Escape to work
    expect(screen.getByText('Test Title')).toBeInTheDocument(); 

    await user.keyboard('{escape}');

    expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
  
  test('calls onOpenChange with false when overlay is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfirmationDialog {...defaultProps} />);

    // Radix Dialog often renders overlay as a sibling or specific element.
    // A common way to get it is to click outside the dialog content.
    // Let's assume the dialog content has a role 'dialog'.
    // We click on the body, which should be outside.
    // Note: This specific test can be fragile depending on how Radix handles overlay clicks
    // and might need adjustment if the DOM structure of the dialog changes.
    // A more robust way could be to find the overlay element by a test-id if one were added.
    // For now, we'll try clicking the body.
    await user.click(document.body);

    // Check if onOpenChange was called. Radix Dialogs usually handle this.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });


  test('applies custom confirmText and cancelText', () => {
    render(<ConfirmationDialog {...defaultProps} confirmText="Proceed" cancelText="Go Back" />);

    expect(screen.getByRole('button', { name: /proceed/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
  });

  test('applies confirmVariant to confirm button', () => {
    render(<ConfirmationDialog {...defaultProps} confirmVariant="default" />);
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    // Check for a class associated with the 'default' variant (e.g., bg-primary)
    // This depends on your Button component's variant classes.
    expect(confirmButton).toHaveClass('bg-primary'); // Assuming default variant has bg-primary

    render(<ConfirmationDialog {...defaultProps} confirmText="Delete Test" confirmVariant="destructive" />);
    const destructiveButton = screen.getByRole('button', { name: /delete test/i });
    expect(destructiveButton).toHaveClass('bg-destructive');
  });

  test('shows loader and disables buttons when isConfirming is true', () => {
    render(<ConfirmationDialog {...defaultProps} isConfirming={true} />);

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    const cancelButton = screen.getByRole('button', { name: /cancel/i });

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
  });

  test('does not call onConfirm if already confirming', async () => {
    const user = userEvent.setup();
    render(<ConfirmationDialog {...defaultProps} isConfirming={true} />);

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton).catch(() => {}); // UserEvent might error clicking disabled button

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });
});
