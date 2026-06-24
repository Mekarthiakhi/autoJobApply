import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User } from 'lucide-react';
import styles from './Common.module.css';

export const Navbar: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className={`${styles.navbar} glass-dark`}>
      <div className={styles.navTitle}>
        <h2>AI Job Automation Portal</h2>
      </div>
      
      <div className={styles.userProfile}>
        <div className={styles.avatar}>
          <User size={18} />
        </div>
        <span className={styles.userName}>{user?.fullName || user?.email || 'User'}</span>
      </div>
    </header>
  );
};

export default Navbar;
