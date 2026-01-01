/**
 * Utility functions for formatting order responses
 * Ensures all monetary values are rounded to 2 decimal places
 */

const { roundMoney } = require('./money');

/**
 * Format order object for API response
 * Rounds all monetary fields to 2 decimal places
 * @param {Object} order - Order object (Mongoose document or plain object)
 * @returns {Object} Formatted order with rounded monetary values
 */
function formatOrderResponse(order) {
  if (!order) {
    return order;
  }

  // Convert Mongoose document to plain object if needed
  const orderObj = order.toObject ? order.toObject() : { ...order };

  // Round all top-level monetary fields
  const formatted = {
    ...orderObj,
    total: roundMoney(orderObj.total || 0),
    productDiscount: roundMoney(orderObj.productDiscount || 0),
    discount: roundMoney(orderObj.discount || 0),
    couponDiscount: roundMoney(orderObj.couponDiscount || 0),
    paymentDiscount: roundMoney(orderObj.paymentDiscount || 0),
    finalTotal: roundMoney(orderObj.finalTotal || 0),
    // Round advance payment fields if they exist
    advanceAmount: orderObj.advanceAmount !== null && orderObj.advanceAmount !== undefined ? roundMoney(orderObj.advanceAmount) : null,
    remainingAmount: orderObj.remainingAmount !== null && orderObj.remainingAmount !== undefined ? roundMoney(orderObj.remainingAmount) : null
  };

  // Round monetary fields in items array
  if (orderObj.items && Array.isArray(orderObj.items)) {
    formatted.items = orderObj.items.map(item => {
      const formattedItem = { ...item };
      
      if (formattedItem.price !== undefined) {
        formattedItem.price = roundMoney(formattedItem.price);
      }
      
      if (formattedItem.monthlyPrice !== undefined && formattedItem.monthlyPrice !== null) {
        formattedItem.monthlyPrice = roundMoney(formattedItem.monthlyPrice);
      }
      
      if (formattedItem.securityDeposit !== undefined && formattedItem.securityDeposit !== null) {
        formattedItem.securityDeposit = roundMoney(formattedItem.securityDeposit);
      }
      
      if (formattedItem.installationCharges && formattedItem.installationCharges.amount !== undefined) {
        formattedItem.installationCharges = {
          ...formattedItem.installationCharges,
          amount: roundMoney(formattedItem.installationCharges.amount)
        };
      }

      // Round extra material rates if present
      if (formattedItem.installationCharges && formattedItem.installationCharges.extraMaterialRates) {
        const rates = formattedItem.installationCharges.extraMaterialRates;
        formattedItem.installationCharges.extraMaterialRates = {
          copperPipe: roundMoney(rates.copperPipe || 0),
          drainPipe: roundMoney(rates.drainPipe || 0),
          electricWire: roundMoney(rates.electricWire || 0)
        };
      }
      
      return formattedItem;
    });
  }

  return formatted;
}

/**
 * Format array of orders for API response
 * @param {Array} orders - Array of order objects
 * @returns {Array} Array of formatted orders
 */
function formatOrdersResponse(orders) {
  if (!Array.isArray(orders)) {
    return orders;
  }

  return orders.map(order => formatOrderResponse(order));
}

module.exports = {
  formatOrderResponse,
  formatOrdersResponse
};

