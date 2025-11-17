// Token Service - Quản lý access token cho API
const TOKEN_STORAGE_KEY = 'api_access_token';
const TOKEN_EXPIRY_KEY = 'api_token_expiry';

// Use proxy in development to avoid CORS issues
const API_BASE_URL = import.meta.env.DEV
  ? '/api'
  : 'https://kcirpjxbjqagrqrjfldu.supabase.co/functions/v1';

interface TokenResponse {
  success: boolean;
  data: {
    access_token: string;
    created_at_vn: string;
    expires_at_vn: string;
  };
}

class TokenService {
  private token: string | null = null;
  private expiryTime: number | null = null;

  constructor() {
    // Load token from localStorage on init
    this.loadFromStorage();
  }

  /**
   * Load token và expiry time từ localStorage
   */
  private loadFromStorage(): void {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

    if (storedToken && storedExpiry) {
      this.token = storedToken;
      this.expiryTime = parseInt(storedExpiry, 10);
    }
  }

  /**
   * Save token và expiry time vào localStorage
   */
  private saveToStorage(token: string, expiryTime: number): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    this.token = token;
    this.expiryTime = expiryTime;
  }

  /**
   * Clear token khỏi localStorage
   */
  private clearStorage(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    this.token = null;
    this.expiryTime = null;
  }

  /**
   * Kiểm tra token có còn hợp lệ không (chưa hết hạn)
   */
  private isTokenValid(): boolean {
    if (!this.token || !this.expiryTime) {
      return false;
    }

    // Check if token is expired (với 5 phút buffer để refresh trước)
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    return this.expiryTime - now > bufferTime;
  }

  /**
   * Lấy token mới từ API
   */
  private async fetchNewToken(): Promise<string> {
    try {
      console.log('🔑 Fetching new token from API...');
      const response = await fetch(`${API_BASE_URL}/get-token-supabase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: 'mk_tamduc',
          client_secret: 'Tamduc@123',
        }),
      });

      console.log('📡 Token API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Token API error:', errorText);
        throw new Error(`Failed to get token: ${response.status} - ${errorText}`);
      }

      const data: TokenResponse = await response.json();
      console.log('✅ Token response received:', { success: data.success });

      if (!data.success || !data.data.access_token) {
        console.error('❌ Invalid token response structure:', data);
        throw new Error('Invalid token response');
      }

      // Parse expiry time
      const expiryTime = new Date(data.data.expires_at_vn).getTime();
      console.log('⏰ Token expires at:', data.data.expires_at_vn);

      // Save to storage
      this.saveToStorage(data.data.access_token, expiryTime);

      console.log('✅ Token saved successfully');
      return data.data.access_token;
    } catch (error) {
      console.error('❌ Error fetching token:', error);
      throw new Error('Không thể lấy access token. Vui lòng thử lại sau.');
    }
  }

  /**
   * Lấy token hợp lệ (từ storage hoặc fetch mới nếu hết hạn)
   */
  async getValidToken(): Promise<string> {
    // Nếu token còn hợp lệ, return luôn
    if (this.isTokenValid() && this.token) {
      return this.token;
    }

    // Nếu không, fetch token mới
    return await this.fetchNewToken();
  }

  /**
   * Force refresh token (dùng khi token bị invalid từ API)
   */
  async refreshToken(): Promise<string> {
    this.clearStorage();
    return await this.fetchNewToken();
  }
}

// Export singleton instance
export const tokenService = new TokenService();
