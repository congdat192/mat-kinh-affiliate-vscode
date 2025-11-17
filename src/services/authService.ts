// Auth Service - Simulate authentication (temporary mock)
// TODO: Replace with real authentication later

interface F0User {
  f0_code: string;
  f0_name: string;
  email: string;
}

class AuthService {
  // Hardcoded F0 for testing
  // In production, this would come from JWT token or session
  private currentF0: F0User = {
    f0_code: 'F0-001',
    f0_name: 'Nguyễn Văn A',
    email: 'f0001@email.com',
  };

  /**
   * Get current logged-in F0
   */
  getCurrentF0(): F0User {
    // TODO: In real app, decode JWT or read from session
    return this.currentF0;
  }

  /**
   * Get F0 code
   */
  getF0Code(): string {
    return this.currentF0.f0_code;
  }

  /**
   * Set current F0 (for testing purposes)
   */
  setCurrentF0(f0_code: string, f0_name: string, email: string): void {
    this.currentF0 = { f0_code, f0_name, email };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentF0.f0_code;
  }
}

// Export singleton
export const authService = new AuthService();
