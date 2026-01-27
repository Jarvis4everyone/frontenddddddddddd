/**
 * Get image as base64 data URL for Razorpay
 * This avoids CORS issues when Razorpay tries to load the image
 */
export const getRazorpayImage = async () => {
  try {
    // Try to fetch the image and convert to base64
    const response = await fetch('/image.jpg');
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }
    
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image for Razorpay:', error);
    // Return empty string if image fails to load (Razorpay will just not show image)
    return '';
  }
};

/**
 * Pre-load image as base64 and cache it
 */
let cachedImageBase64 = null;

export const getCachedRazorpayImage = async () => {
  if (cachedImageBase64) {
    return cachedImageBase64;
  }
  
  cachedImageBase64 = await getRazorpayImage();
  return cachedImageBase64;
};
