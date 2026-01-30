/**
 * Check if subscription has expired and return true if expired
 */
function checkSubscriptionExpiry(subscription) {
  if (subscription.status === 'cancelled') {
    return false;
  }
  
  const endDate = subscription.end_date;
  if (!endDate) {
    return true;
  }
  
  const endDateObj = endDate instanceof Date ? endDate : new Date(endDate);
  const now = new Date();
  
  return now > endDateObj;
}

/**
 * Check if subscription is currently active
 */
function isSubscriptionActive(subscription) {
  if (subscription.status !== 'active') {
    return false;
  }
  
  return !checkSubscriptionExpiry(subscription);
}

/**
 * Calculate subscription end date by adding months
 */
function calculateEndDate(startDate, months) {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  // Simple month addition (30 days per month)
  const days = months * 30;
  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + days);
  return endDate;
}

module.exports = {
  checkSubscriptionExpiry,
  isSubscriptionActive,
  calculateEndDate
};
