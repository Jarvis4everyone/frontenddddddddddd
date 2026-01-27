// Razorpay image utility - loads base64 image data
let cachedImageData = null;

export const getRazorpayImage = async () => {
  // Return cached data if available
  if (cachedImageData) {
    return cachedImageData;
  }

  try {
    // Load base64 data from file
    const response = await fetch('/base64.image');
    if (!response.ok) {
      throw new Error('Failed to load base64 image');
    }
    
    const base64Data = await response.text();
    const trimmed = base64Data.trim();
    
    // Format as data URI if needed
    if (trimmed.startsWith('data:image')) {
      cachedImageData = trimmed;
    } else {
      // Add data URI prefix
      cachedImageData = `data:image/jpeg;base64,${trimmed}`;
    }
    
    return cachedImageData;
  } catch (error) {
    // Fallback: use HTTPS URL in production
    if (window.location.protocol === 'https:' || window.location.hostname !== 'localhost') {
      return `${window.location.protocol}//${window.location.host}/image.jpg`;
    }
    return null;
  }
};
