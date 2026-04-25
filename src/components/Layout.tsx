import type { FC, ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';

interface LayoutProps {
  children: ReactNode;
}

const Layout: FC<LayoutProps> = ({ children }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;