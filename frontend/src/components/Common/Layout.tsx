import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import styles from './Common.module.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className={styles.layoutContainer}>
      <Sidebar />
      <div className={styles.mainWrapper}>
        <Navbar />
        <main className={styles.pageContent}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
