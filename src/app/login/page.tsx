/**
 * @file src/app/login/page.tsx
 * @description Next.js App Router Login Page Route (`/login`).
 * 
 * Renders the LoginView authentication portal component.
 * 
 * @module LoginPage
 */

import { LoginView } from '@/components/Views/LoginView';

export const metadata = {
  title: 'Sign In · Jain Automobiles Stock Management',
  description: 'Authorised Royal Enfield Dealer · GMA & Parts Stock Portal Login',
};

export default function LoginPage() {
  return <LoginView />;
}
