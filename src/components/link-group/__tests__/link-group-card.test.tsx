
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { LinkGroupCard } from '../link-group-card';
import type { LinkGroup } from '@/lib/types';
import { TooltipProvider } from '@/components/ui/tooltip'; // Import TooltipProvider
import { normalizeUrl } from '@/lib/utils'; // Import normalizeUrl

const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/components/icons/lucide-icon', () => {
  return jest.fn(({ name, ...props }) => <div data-testid={`lucide-icon-${name}`} {...props} />);
});

const mockSetIsDeleteDialogOpen = jest.fn();
// Simplified mock for ConfirmationDialog to track its open state and confirm action
jest.mock('@/components/ui/confirmation-dialog', () => ({
  ConfirmationDialog: ({ open, onOpenChange, onConfirm, title, description }: any) => {
    if (open) {
      return (
        <div data-testid="confirmation-dialog">
          <h2>{title}</h2>
          <div>{typeof description === 'string' ? description : description.props.children.map((c: any) => typeof c === 'string' ? c : c.props.children).join('')}</div>
          <button onClick={() => { onConfirm(); onOpenChange(false); }}>Confirm Delete</button>
          <button onClick={() => onOpenChange(false)}>Cancel Delete</button>
        </div>
      );
    }
    return null;
  },
}));


const mockOnOpen = jest.fn();
const mockOnEdit = jest.fn();
const mockOnDelete = jest.fn();
const mockOnOpenInNewWindow = jest.fn();

const sampleGroup: LinkGroup = {
  id: '1',
  name: 'Work Links',
  icon: 'Briefcase',
  urls: ['http://example.com', 'test.com', 'another.com', 'onemore.com'], // Mix of URLs
};

const sampleGroupEmptyUrls: LinkGroup = {
  id: '2',
  name: 'Empty Group',
  icon: 'Folder',
  urls: [],
};

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

describe('LinkGroupCard Component', () => {
  beforeEach(() => {
    mockToast.mockClear();
    mockOnOpen.mockClear();
    mockOnEdit.mockClear();
    mockOnDelete.mockClear();
    mockOnOpenInNewWindow.mockClear();
    // Mock window.open
    global.window.open = jest.fn();
  });

  test('renders group details correctly', () => {
    renderWithProvider(
      <LinkGroupCard
        group={sampleGroup}
        onOpen={mockOnOpen}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onOpenInNewWindow={mockOnOpenInNewWindow}
      />
    );

    expect(screen.getByText('Work Links')).toBeInTheDocument();
    expect(screen.getByTestId('lucide-icon-Briefcase')).toBeInTheDocument();
    expect(screen.getByText('4 link(s)')).toBeInTheDocument();
    expect(screen.getByText('http://example.com')).toBeInTheDocument();
    expect(screen.getByText('test.com')).toBeInTheDocument();
    expect(screen.getByText('another.com')).toBeInTheDocument();
    expect(screen.getByText('...and 1 more')).toBeInTheDocument();
  });

  test('calls onOpen and window.open when "Open All" is clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <LinkGroupCard
        group={sampleGroup}
        onOpen={mockOnOpen}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onOpenInNewWindow={mockOnOpenInNewWindow}
      />
    );

    const openAllButton = screen.getByRole('button', { name: /open all/i });
    await user.click(openAllButton);

    expect(mockOnOpen).toHaveBeenCalledWith(sampleGroup);
    expect(window.open).toHaveBeenCalledTimes(sampleGroup.urls.length);
    sampleGroup.urls.forEach(url => {
      expect(window.open).toHaveBeenCalledWith(normalizeUrl(url), '_blank');
    });
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Links Opening",
    }));
  });

  test('shows "No URLs" toast when "Open All" is clicked on an empty group', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <LinkGroupCard
        group={sampleGroupEmptyUrls}
        onOpen={mockOnOpen}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onOpenInNewWindow={mockOnOpenInNewWindow}
      />
    );
    const openAllButton = screen.getByRole('button', { name: /open all/i });
    await user.click(openAllButton);
    expect(mockToast).toHaveBeenCalledWith({
      title: 'No URLs',
      description: 'This group has no URLs to open.',
      variant: 'default',
    });
    expect(window.open).not.toHaveBeenCalled();
  });

  test('calls onOpenInNewWindow when "New Window" button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <LinkGroupCard
        group={sampleGroup}
        onOpen={mockOnOpen}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onOpenInNewWindow={mockOnOpenInNewWindow}
      />
    );
    const newWindowButton = screen.getByRole('button', { name: /new window/i });
    await user.click(newWindowButton);
    expect(mockOnOpenInNewWindow).toHaveBeenCalledWith(sampleGroup);
  });

   test('shows "No URLs" toast when "New Window" is clicked on an empty group', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <LinkGroupCard
        group={sampleGroupEmptyUrls}
        onOpen={mockOnOpen}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onOpenInNewWindow={mockOnOpenInNewWindow}
      />
    );
    const newWindowButton = screen.getByRole('button', { name: /new window/i });
    await user.click(newWindowButton);
    expect(mockToast).toHaveBeenCalledWith({
      title: 'No URLs',
      description: 'This group has no URLs to open for the new window.',
      variant: 'default',
    });
    expect(mockOnOpenInNewWindow).not.toHaveBeenCalled();
  });

  test('calls onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <LinkGroupCard
        group={sampleGroup}
        onOpen={mockOnOpen}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onOpenInNewWindow={mockOnOpenInNewWindow}
      />
    );
    const editButton = screen.getByRole('button', { name: /edit group/i });
    await user.click(editButton);
    expect(mockOnEdit).toHaveBeenCalledWith(sampleGroup);
  });

  test('opens ConfirmationDialog when delete button is clicked, and calls onDelete on confirm', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <LinkGroupCard
        group={sampleGroup}
        onOpen={mockOnOpen}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onOpenInNewWindow={mockOnOpenInNewWindow}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete group/i });
    await user.click(deleteButton);

    // Check if dialog appears (based on our mock)
    const dialog = await screen.findByTestId('confirmation-dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(`This action cannot be undone. This will permanently delete the link group "Work Links".`)).toBeInTheDocument();


    const confirmDeleteButton = screen.getByRole('button', { name: 'Confirm Delete' });
    await user.click(confirmDeleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(sampleGroup);
    expect(screen.queryByTestId('confirmation-dialog')).not.toBeInTheDocument(); // Dialog should close
  });


  describe('Read-Only Mode', () => {
    test('disables edit, delete, and new window buttons', () => {
      renderWithProvider(
        <LinkGroupCard
          group={sampleGroup}
          onOpen={mockOnOpen}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpenInNewWindow={mockOnOpenInNewWindow}
          isReadOnlyPreview={true}
        />
      );
      expect(screen.getByRole('button', { name: /edit group/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /delete group/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /new window/i })).toBeDisabled();
    });

    test('"Open All" button still works in read-only mode', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <LinkGroupCard
          group={sampleGroup}
          onOpen={mockOnOpen}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onOpenInNewWindow={mockOnOpenInNewWindow}
          isReadOnlyPreview={true}
        />
      );
      const openAllButton = screen.getByRole('button', { name: /open all/i });
      await user.click(openAllButton);
      expect(mockOnOpen).toHaveBeenCalledWith(sampleGroup);
      expect(window.open).toHaveBeenCalledTimes(sampleGroup.urls.length);
    });

    test('edit, delete, new window actions are not called when buttons clicked in read-only', async () => {
        const user = userEvent.setup();
        renderWithProvider(
          <LinkGroupCard
            group={sampleGroup}
            onOpen={mockOnOpen}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
            onOpenInNewWindow={mockOnOpenInNewWindow}
            isReadOnlyPreview={true}
          />
        );

        const editButton = screen.getByRole('button', { name: /edit group/i });
        await user.click(editButton);
        expect(mockOnEdit).not.toHaveBeenCalled();

        const deleteButton = screen.getByRole('button', { name: /delete group/i });
        await user.click(deleteButton);
        expect(mockOnDelete).not.toHaveBeenCalled();
        expect(screen.queryByTestId('confirmation-dialog')).not.toBeInTheDocument();

        const newWindowButton = screen.getByRole('button', { name: /new window/i });
        await user.click(newWindowButton);
        expect(mockOnOpenInNewWindow).not.toHaveBeenCalled();
    });
  });
});

