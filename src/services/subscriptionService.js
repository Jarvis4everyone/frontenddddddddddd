import { getApiUrl } from '../config/api';

class SubscriptionService {
  // Cache the price to avoid multiple API calls
  static priceCache = null;
  static cacheTimestamp = null;
  static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getPrice() {
    // Return cached price if still valid
    if (this.constructor.priceCache && this.constructor.cacheTimestamp) {
      const now = Date.now();
      if (now - this.constructor.cacheTimestamp < this.constructor.CACHE_DURATION) {
        return this.constructor.priceCache;
      }
    }

    try {
      const response = await fetch(getApiUrl('subscriptions/price'), {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription price');
      }

      const data = await response.json();
      
      // Cache the result
      this.constructor.priceCache = data;
      this.constructor.cacheTimestamp = Date.now();
      
      return data;
    } catch (error) {
      console.error('Error fetching subscription price:', error);
      // Return fallback price if API fails
      return {
        price: 299.0,
        currency: 'INR',
        price_in_paise: 29900
      };
    }
  }

  // Get price in rupees (for display)
  async getPriceInRupees() {
    const priceData = await this.getPrice();
    return priceData.price;
  }

  // Get price in paise (for Razorpay)
  async getPriceInPaise() {
    const priceData = await this.getPrice();
    return priceData.price_in_paise;
  }

  // Clear cache (useful for testing or when price might have changed)
  clearCache() {
    this.constructor.priceCache = null;
    this.constructor.cacheTimestamp = null;
  }
}

export default new SubscriptionService();
