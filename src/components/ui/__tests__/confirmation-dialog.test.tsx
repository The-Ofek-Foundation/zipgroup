
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { ConfirmationDialog } from '../confirmation-dialog';
// import { Button } from '../button'; // To test the buttons within the dialog
// import { Loader2 } from 'lucide-react'; // To check for loader icon

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
    
    // Suppress console warnings for Radix UI accessibility warnings in tests
    jest.spyOn(console, 'error').mockImplementation((message) => {
      if (typeof message === 'string' && message.includes('DialogContent') && message.includes('DialogTitle')) {
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders with default props when open is true', () => {
    render(<ConfirmationDialog {...defaultProps} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test description content.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  test('does not render content when open is false', () => {
    render(<ConfirmationDialog {...defaultProps} open={false} />);
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

    // Ensure the dialog is open and the overlay is present
    expect(screen.getByText('Test Title')).toBeInTheDocument(); 
    const overlay = screen.getByTestId('dialog-overlay');
    await user.click(overlay);

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

    // Re-render with destructive variant for a separate check if necessary or clear DOM
    // For simplicity, assuming the test runner clears between `render` calls within the same test,
    // or this is fine if classes are mutually exclusive.
    // If not, split into two tests or ensure proper cleanup.
    const { rerender } = render(<ConfirmationDialog {...defaultProps} confirmText="Delete Test" confirmVariant="destructive" />);
    const destructiveButtonInitial = screen.getByRole('button', { name: /delete test/i }); // This might be an issue if not cleared
    expect(destructiveButtonInitial).toHaveClass('bg-destructive');

    // Better approach:
    rerender(<ConfirmationDialog {...defaultProps} confirmText="Delete Test New" confirmVariant="destructive" />);
    const destructiveButton = screen.getByRole('button', { name: /delete test new/i });
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
