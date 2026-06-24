import React from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-space-dark text-white flex flex-col">
      <Navbar />
      <main className="flex-1 p-8 w-full max-w-[1400px] mx-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;
