/**
 * @deprecated Import from '../services/availabilityService' instead.
 * This file re-exports from the centralized service for backward compatibility.
 */
export {
  RENTAL_SLOTS,
  SLOT_CONFLICT_MAP,
  slotsConflict,
  datesOverlap,
  getItemTotalQuantity,
  getRentalsForItem,
  getBookedQuantityForDate,
  getAvailableQuantityForDate,
  checkAvailabilityForDateRange,
  checkAvailability,
  getEquipmentAvailability,
  getEquipmentCurrentlyOut,
  getLowAvailabilityAlerts,
  checkDateRangeAvailability,
  getRentalLifecycleStatus,
} from '../services/availabilityService';

export {
  getCached,
  setCache,
  invalidateCache,
  invalidateByPrefix,
  clearCache,
  cacheKeys,
} from '../services/availabilityCache';
