// Auth Service - Read F0 user data from localStorage/sessionStorage

interface F0User {
  id: string;
  f0_code: string;
  full_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
}

class AuthService {
  /**
   * Get current logged-in F0 user from storage
   */
  getCurrentF0(): F0User | null {
    const storedUser = localStorage.getItem('f0_user') || sessionStorage.getItem('f0_user');
    if (!storedUser) return null;

    try {
      return JSON.parse(storedUser) as F0User;
    } catch (e) {
      console.error('Error parsing F0 user data:', e);
      return null;
    }
  }

  /**
   * Get F0 code
   */
  getF0Code(): string {
    const user = this.getCurrentF0();
    return user?.f0_code || '';
  }

  /**
   * Get F0 full name
   */
  getF0Name(): string {
    const user = this.getCurrentF0();
    return user?.full_name || '';
  }

  /**
   * Get F0 email
   */
  getF0Email(): string {
    const user = this.getCurrentF0();
    return user?.email || '';
  }

  /**
   * Get F0 phone
   */
  getF0Phone(): string {
    const user = this.getCurrentF0();
    return user?.phone || '';
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const user = this.getCurrentF0();
    return !!user?.f0_code;
  }

  /**
   * Check if user is approved
   */
  isApproved(): boolean {
    const user = this.getCurrentF0();
    return user?.is_approved ?? false;
  }

  /**
   * Check if user account is active
   */
  isActive(): boolean {
    const user = this.getCurrentF0();
    return user?.is_active ?? false;
  }

  /**
   * Logout - clear all storage
   */
  logout(): void {
    localStorage.removeItem('f0_user');
    localStorage.removeItem('f0_pending_user');
    sessionStorage.removeItem('f0_user');
  }
}

// Export singleton
export const authService = new AuthService();
