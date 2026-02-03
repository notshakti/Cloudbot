/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders CloudBot heading', () => {
  render(<App />);
  const heading = screen.getByText(/CloudBot/i);
  expect(heading).toBeInTheDocument();
});
