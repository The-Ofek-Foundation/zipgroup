import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { Button } from '../button'; // Adjust path as necessary

describe('Button Component', () => {
  test('renders with default props', () => {
    render(<Button>Click Me</Button>);
    const buttonElement = screen.getByRole('button', { name: /click me/i });
    expect(buttonElement).toBeInTheDocument();
    expect(buttonElement).toHaveClass('bg-primary'); // Example class for default variant
  });

  test('renders different variants', () => {
    render(<Button variant="destructive">Delete</Button>);
    const buttonElement = screen.getByRole('button', { name: /delete/i });
    expect(buttonElement).toBeInTheDocument();
    expect(buttonElement).toHaveClass('bg-destructive');
  });

  test('renders different sizes', () => {
    render(<Button size="lg">Large Button</Button>);
    const buttonElement = screen.getByRole('button', { name: /large button/i });
    expect(buttonElement).toBeInTheDocument();
    expect(buttonElement).toHaveClass('h-11'); // Example class for lg size
  });

  test('handles onClick event', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Handler Test</Button>);
    const buttonElement = screen.getByRole('button', { name: /click handler test/i });
    await user.click(buttonElement);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('is disabled when disabled prop is true', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Disabled Button</Button>);
    const buttonElement = screen.getByRole('button', { name: /disabled button/i });
    expect(buttonElement).toBeDisabled();
    await user.click(buttonElement).catch(() => {}); // userEvent might throw if trying to click a disabled element
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('renders as child when asChild prop is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    const linkElement = screen.getByRole('link', { name: /link button/i });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', '/test');
    // Check for button-like classes being applied to the anchor
    expect(linkElement).toHaveClass('bg-primary');
  });

  test('renders with custom className', () => {
    render(<Button className="custom-class">Custom Class</Button>);
    const buttonElement = screen.getByRole('button', { name: /custom class/i });
    expect(buttonElement).toHaveClass('custom-class');
  });
});
