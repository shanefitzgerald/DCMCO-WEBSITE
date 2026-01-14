import { NavigationHeader, Logo } from '@dcmco/design-system';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      <NavigationHeader
        ctaButton={{ href: '/get-started', label: 'Get Started' }}
        navAlign="left"
        loginHref="#"
        logo={<Logo size="lg" />}
        navigationItems={[
          { href: '/', label: 'Home' },
          { href: '/about', label: 'About' },
          { href: '/contact', label: 'Contact' },
        ]}
      />
      <main>{children}</main>
    </>
  );
}
