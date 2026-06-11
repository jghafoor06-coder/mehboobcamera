import { db } from '../src/firebase/firebaseConfig';

// Mock firebase before importing the module under test
jest.mock('../src/firebase/firebaseConfig', () => ({
  db: {
    collection: jest.fn(),
  },
}));

import {
  RENTAL_SLOTS,
  SLOT_CONFLICT_MAP,
  slotsConflict,
  datesOverlap,
  getBookedQuantityForDate,
  getAvailableQuantityForDate,
  checkAvailabilityForDateRange,
  checkAvailability,
  getRentalLifecycleStatus,
} from '../src/services/availabilityService';
import { clearCache } from '../src/services/availabilityCache';

describe('RENTAL_SLOTS', () => {
  test('defines all three slot types', () => {
    expect(RENTAL_SLOTS).toHaveProperty('full_day');
    expect(RENTAL_SLOTS).toHaveProperty('day');
    expect(RENTAL_SLOTS).toHaveProperty('evening');
  });

  test('full_day has correct label and no time range', () => {
    expect(RENTAL_SLOTS.full_day).toEqual({
      label: 'Full Day',
      shortLabel: 'Full Day',
    });
  });

  test('day has correct label and time range', () => {
    expect(RENTAL_SLOTS.day).toEqual({
      label: 'Day',
      shortLabel: 'Day',
      time: '08:00 AM → 06:00 PM',
    });
  });

  test('evening has correct label and time range', () => {
    expect(RENTAL_SLOTS.evening).toEqual({
      label: 'Evening',
      shortLabel: 'Evening',
      time: '06:00 PM → 11:59 PM',
    });
  });
});

describe('SLOT_CONFLICT_MAP', () => {
  test('full_day conflicts with all slots', () => {
    expect(SLOT_CONFLICT_MAP.full_day).toEqual(['day', 'evening', 'full_day']);
  });

  test('day conflicts with day and full_day only', () => {
    expect(SLOT_CONFLICT_MAP.day).toEqual(['day', 'full_day']);
  });

  test('evening conflicts with evening and full_day only', () => {
    expect(SLOT_CONFLICT_MAP.evening).toEqual(['evening', 'full_day']);
  });
});

describe('slotsConflict', () => {
  test('full_day conflicts with day', () => {
    expect(slotsConflict('full_day', 'day')).toBe(true);
  });

  test('full_day conflicts with evening', () => {
    expect(slotsConflict('full_day', 'evening')).toBe(true);
  });

  test('full_day conflicts with full_day', () => {
    expect(slotsConflict('full_day', 'full_day')).toBe(true);
  });

  test('day conflicts with day', () => {
    expect(slotsConflict('day', 'day')).toBe(true);
  });

  test('day conflicts with full_day', () => {
    expect(slotsConflict('day', 'full_day')).toBe(true);
  });

  test('day does NOT conflict with evening', () => {
    expect(slotsConflict('day', 'evening')).toBe(false);
  });

  test('evening conflicts with evening', () => {
    expect(slotsConflict('evening', 'evening')).toBe(true);
  });

  test('evening conflicts with full_day', () => {
    expect(slotsConflict('evening', 'full_day')).toBe(true);
  });

  test('evening does NOT conflict with day', () => {
    expect(slotsConflict('evening', 'day')).toBe(false);
  });

  test('conflict is symmetric (day ↔ full_day)', () => {
    expect(slotsConflict('day', 'full_day')).toBe(true);
    expect(slotsConflict('full_day', 'day')).toBe(true);
  });

  test('non-conflict is symmetric (day ↔ evening)', () => {
    expect(slotsConflict('day', 'evening')).toBe(false);
    expect(slotsConflict('evening', 'day')).toBe(false);
  });

  test('returns false for unknown slot', () => {
    expect(slotsConflict('unknown', 'day')).toBe(false);
  });
});

describe('datesOverlap', () => {
  test('returns true when same start and end dates', () => {
    const a = new Date('2026-06-01');
    const b = new Date('2026-06-03');
    expect(datesOverlap(a, b, a, b)).toBe(true);
  });

  test('returns true when ranges overlap partially', () => {
    expect(datesOverlap('2026-06-01', '2026-06-05', '2026-06-03', '2026-06-08')).toBe(true);
  });

  test('returns true when A fully contains B', () => {
    expect(datesOverlap('2026-06-01', '2026-06-10', '2026-06-03', '2026-06-07')).toBe(true);
  });

  test('returns true when B fully contains A', () => {
    expect(datesOverlap('2026-06-03', '2026-06-07', '2026-06-01', '2026-06-10')).toBe(true);
  });

  test('returns true when dates are adjacent (inclusive)', () => {
    expect(datesOverlap('2026-06-01', '2026-06-03', '2026-06-03', '2026-06-05')).toBe(true);
  });

  test('returns false when A is completely before B with a gap', () => {
    expect(datesOverlap('2026-06-01', '2026-06-03', '2026-06-05', '2026-06-07')).toBe(false);
  });

  test('returns false when A is completely after B with a gap', () => {
    expect(datesOverlap('2026-06-05', '2026-06-07', '2026-06-01', '2026-06-03')).toBe(false);
  });

  test('same single day', () => {
    const d = new Date('2026-06-07');
    expect(datesOverlap(d, d, d, d)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Pure date-based functions (no Firestore calls)
// ─────────────────────────────────────────────────────────────────────────────

describe('getBookedQuantityForDate', () => {
  // Test data: Sony FX3, totalQuantity = 5
  // Rental A: 9 Jun → 11 Jun, qty 2, full_day
  // Rental B: 10 Jun → 12 Jun, qty 1, day
  const itemId = 'sony-fx3';
  const rentals = [
    {
      id: 'rental-a',
      startDate: new Date('2026-06-09'),
      endDate: new Date('2026-06-11'),
      rentalSlot: 'full_day',
      items: [{ itemId: 'sony-fx3', quantity: 2 }],
    },
    {
      id: 'rental-b',
      startDate: new Date('2026-06-10'),
      endDate: new Date('2026-06-12'),
      rentalSlot: 'day',
      items: [{ itemId: 'sony-fx3', quantity: 1 }],
    },
  ];

  test('7 June: no rentals overlap → 0 booked', () => {
    const result = getBookedQuantityForDate(new Date('2026-06-07'), rentals, itemId);
    expect(result.total).toBe(0);
  });

  test('9 June: only Rental A (full_day, qty 2) overlaps → 2 booked', () => {
    const result = getBookedQuantityForDate(new Date('2026-06-09'), rentals, itemId);
    expect(result.total).toBe(2);
    expect(result.breakdown.full_day).toBe(2);
  });

  test('10 June: both rentals overlap → 3 booked (2 full_day + 1 day)', () => {
    const result = getBookedQuantityForDate(new Date('2026-06-10'), rentals, itemId);
    expect(result.total).toBe(3);
    expect(result.breakdown.full_day).toBe(2);
    expect(result.breakdown.day).toBe(1);
  });

  test('11 June: both overlap → 3 booked', () => {
    const result = getBookedQuantityForDate(new Date('2026-06-11'), rentals, itemId);
    expect(result.total).toBe(3);
  });

  test('12 June: only Rental B (day, qty 1) overlaps → 1 booked', () => {
    const result = getBookedQuantityForDate(new Date('2026-06-12'), rentals, itemId);
    expect(result.total).toBe(1);
    expect(result.breakdown.day).toBe(1);
  });

  test('13 June: no rentals overlap → 0 booked', () => {
    const result = getBookedQuantityForDate(new Date('2026-06-13'), rentals, itemId);
    expect(result.total).toBe(0);
  });

  test('slotFilter: requesting evening slot on 10 Jun → only full_day counts (evening conflicts with full_day)', () => {
    // Rental A is full_day (conflicts with evening), Rental B is day (no conflict with evening)
    const result = getBookedQuantityForDate(new Date('2026-06-10'), rentals, itemId, 'evening');
    expect(result.total).toBe(2); // only full_day's 2
    expect(result.breakdown.full_day).toBe(2);
  });
});

describe('getAvailableQuantityForDate', () => {
  const itemId = 'sony-fx3';
  const totalQuantity = 5;
  const rentals = [
    {
      id: 'rental-a',
      startDate: new Date('2026-06-09'),
      endDate: new Date('2026-06-11'),
      rentalSlot: 'full_day',
      items: [{ itemId: 'sony-fx3', quantity: 2 }],
    },
  ];

  test('7 Jun → available: 5, booked: 0', () => {
    const result = getAvailableQuantityForDate(new Date('2026-06-07'), rentals, itemId, totalQuantity);
    expect(result.available).toBe(5);
    expect(result.booked).toBe(0);
  });

  test('10 Jun → available: 3, booked: 2', () => {
    const result = getAvailableQuantityForDate(new Date('2026-06-10'), rentals, itemId, totalQuantity);
    expect(result.available).toBe(3);
    expect(result.booked).toBe(2);
  });

  test('13 Jun → available: 5, booked: 0', () => {
    const result = getAvailableQuantityForDate(new Date('2026-06-13'), rentals, itemId, totalQuantity);
    expect(result.available).toBe(5);
    expect(result.booked).toBe(0);
  });
});

describe('checkAvailabilityForDateRange', () => {
  const itemId = 'sony-fx3';
  const totalQuantity = 5;
  const rentals = [
    {
      id: 'rental-a',
      startDate: new Date('2026-06-09'),
      endDate: new Date('2026-06-11'),
      rentalSlot: 'full_day',
      items: [{ itemId: 'sony-fx3', quantity: 2 }],
    },
    {
      id: 'rental-b',
      startDate: new Date('2026-06-10'),
      endDate: new Date('2026-06-12'),
      rentalSlot: 'day',
      items: [{ itemId: 'sony-fx3', quantity: 1 }],
    },
  ];

  test('7 Jun → 8 Jun: no overlap → available, minAvailable=5', async () => {
    const result = await checkAvailabilityForDateRange(
      itemId,
      new Date('2026-06-07'),
      new Date('2026-06-08'),
      rentals,
      null,
      totalQuantity,
    );
    expect(result.available).toBe(true);
    expect(result.minAvailable).toBe(5);
    expect(result.maxBooked).toBe(0);
  });

  test('10 Jun → 10 Jun: single day with 3 booked → available=2', async () => {
    const result = await checkAvailabilityForDateRange(
      itemId,
      new Date('2026-06-10'),
      new Date('2026-06-10'),
      rentals,
      null,
      totalQuantity,
    );
    expect(result.available).toBe(true);
    expect(result.minAvailable).toBe(2);
    expect(result.maxBooked).toBe(3);
  });

  test('7 Jun → 13 Jun: full range → min available is 2 (on 10-11 Jun)', async () => {
    const result = await checkAvailabilityForDateRange(
      itemId,
      new Date('2026-06-07'),
      new Date('2026-06-13'),
      rentals,
      null,
      totalQuantity,
    );
    expect(result.available).toBe(true);
    expect(result.minAvailable).toBe(2);
    expect(result.maxBooked).toBe(3);
    expect(result.dayDetails.length).toBe(7); // 7 days in range
  });

  test('9 Jun → 12 Jun: all days with bookings → minAvailable=2', async () => {
    const result = await checkAvailabilityForDateRange(
      itemId,
      new Date('2026-06-09'),
      new Date('2026-06-12'),
      rentals,
      null,
      totalQuantity,
    );
    expect(result.minAvailable).toBe(2);
  });

  test('evening slot on 10 Jun: only full_day conflicts → available=3', async () => {
    const result = await checkAvailabilityForDateRange(
      itemId,
      new Date('2026-06-10'),
      new Date('2026-06-10'),
      rentals,
      'evening',
      totalQuantity,
    );
    // Only Rental A (full_day, qty 2) conflicts with evening
    expect(result.minAvailable).toBe(3);
    expect(result.maxBooked).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getRentalLifecycleStatus
// ─────────────────────────────────────────────────────────────────────────────

describe('getRentalLifecycleStatus', () => {
  // Use nowOverride parameter for deterministic tests (2026-06-10)
  const fakeToday = '2026-06-10';

  test('returns upcoming when current date < start date', () => {
    expect(getRentalLifecycleStatus('2026-06-15', '2026-06-20', 'active', fakeToday)).toBe('upcoming');
  });

  test('returns ongoing when current date is within start and end', () => {
    expect(getRentalLifecycleStatus('2026-06-08', '2026-06-12', 'active', fakeToday)).toBe('ongoing');
  });

  test('returns ongoing when current date equals start date', () => {
    expect(getRentalLifecycleStatus('2026-06-10', '2026-06-15', 'active', fakeToday)).toBe('ongoing');
  });

  test('returns ongoing when current date equals end date', () => {
    expect(getRentalLifecycleStatus('2026-06-05', '2026-06-10', 'active', fakeToday)).toBe('ongoing');
  });

  test('returns completed when current date > end date', () => {
    expect(getRentalLifecycleStatus('2026-06-01', '2026-06-05', 'active', fakeToday)).toBe('completed');
  });

  test('returns completed when firestore status is returned (regardless of dates)', () => {
    expect(getRentalLifecycleStatus('2026-06-15', '2026-06-20', 'returned', fakeToday)).toBe('completed');
  });

  test('returns completed when returned and dates are in the past', () => {
    expect(getRentalLifecycleStatus('2026-06-01', '2026-06-05', 'returned', fakeToday)).toBe('completed');
  });

  test('defaults to active status when not provided', () => {
    expect(getRentalLifecycleStatus('2026-06-08', '2026-06-12', 'active', fakeToday)).toBe('ongoing');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration: checkAvailability wraps checkAvailabilityForDateRange
// ─────────────────────────────────────────────────────────────────────────────

describe('checkAvailability (wrapper)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCache();
  });

  const mockItemDoc = (exists, data) => ({
    exists,
    data: () => data,
  });

  test('returns available for date range with no overlapping rentals (7 Jun)', async () => {
    const itemId = 'sony-fx3';
    const totalQuantity = 5;

    // Mock item doc (total quantity = 5)
    db.collection.mockReturnValueOnce({
      doc: jest.fn().mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce(
          mockItemDoc(true, { quantity: totalQuantity, name: 'Sony FX3' }),
        ),
      }),
    });

    const existingRentals = [
      {
        id: 'rental-a',
        startDate: new Date('2026-06-09'),
        endDate: new Date('2026-06-11'),
        rentalSlot: 'full_day',
        items: [{ itemId: 'sony-fx3', quantity: 2 }],
      },
    ];

    const result = await checkAvailability(
      itemId,
      new Date('2026-06-07'),
      new Date('2026-06-08'),
      'full_day',
      2,
      existingRentals,
    );

    expect(result.available).toBe(true);
    expect(result.status).toBe('available');
    expect(result.bookedQuantity).toBe(0);
    expect(result.availableQuantity).toBe(5);
    expect(result.totalQuantity).toBe(5);
    expect(result.message).toBe('🟢 Available');
  });

  test('returns low status when partially booked (2 available of 5 on 10 Jun)', async () => {
    const itemId = 'sony-fx3';
    const totalQuantity = 5;

    db.collection.mockReturnValueOnce({
      doc: jest.fn().mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce(
          mockItemDoc(true, { quantity: totalQuantity, name: 'Sony FX3' }),
        ),
      }),
    });

    const existingRentals = [
      {
        id: 'rental-a',
        startDate: new Date('2026-06-09'),
        endDate: new Date('2026-06-11'),
        rentalSlot: 'full_day',
        items: [{ itemId: 'sony-fx3', quantity: 3 }],
      },
    ];

    // 3 booked on 10 Jun, 2 available, total 5. Requesting 1 (available >= requested)
    const result = await checkAvailability(
      itemId,
      new Date('2026-06-10'),
      new Date('2026-06-10'),
      'full_day',
      1,
      existingRentals,
    );

    // availableQuantity=2, 2 <= ceil(5*0.3)=2 → low
    expect(result.available).toBe(true);
    expect(result.status).toBe('low');
    expect(result.bookedQuantity).toBe(3);
    expect(result.availableQuantity).toBe(2);
    expect(result.totalQuantity).toBe(5);
  });

  test('returns unavailable when requested quantity exceeds available (requesting 3, only 2 available on 10 Jun)', async () => {
    const itemId = 'sony-fx3';
    const totalQuantity = 5;

    db.collection.mockReturnValueOnce({
      doc: jest.fn().mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce(
          mockItemDoc(true, { quantity: totalQuantity, name: 'Sony FX3' }),
        ),
      }),
    });

    const existingRentals = [
      {
        id: 'rental-a',
        startDate: new Date('2026-06-09'),
        endDate: new Date('2026-06-11'),
        rentalSlot: 'full_day',
        items: [{ itemId: 'sony-fx3', quantity: 3 }],
      },
    ];

    // 3 booked, 2 available. Requesting 3 → unavailable
    const result = await checkAvailability(
      itemId,
      new Date('2026-06-10'),
      new Date('2026-06-10'),
      'full_day',
      3,
      existingRentals,
    );

    expect(result.available).toBe(false);
    expect(result.status).toBe('unavailable');
    expect(result.bookedQuantity).toBe(3);
    expect(result.availableQuantity).toBe(2);
    expect(result.totalQuantity).toBe(5);
  });

  test('slots: day does NOT conflict with evening', async () => {
    const itemId = 'sony-fx3';
    const totalQuantity = 5;

    db.collection.mockReturnValueOnce({
      doc: jest.fn().mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce(
          mockItemDoc(true, { quantity: totalQuantity, name: 'Sony FX3' }),
        ),
      }),
    });

    const existingRentals = [
      {
        id: 'rental-a',
        startDate: new Date('2026-06-10'),
        endDate: new Date('2026-06-10'),
        rentalSlot: 'day',
        items: [{ itemId: 'sony-fx3', quantity: 3 }],
      },
    ];

    // Day slot booked 3, but we're requesting evening — no conflict
    const result = await checkAvailability(
      itemId,
      new Date('2026-06-10'),
      new Date('2026-06-10'),
      'evening',
      3,
      existingRentals,
    );

    expect(result.available).toBe(true);
    expect(result.bookedQuantity).toBe(0); // day doesn't conflict with evening
    expect(result.availableQuantity).toBe(5);
    expect(result.totalQuantity).toBe(5);
  });

  test('dates without overlapping rentals → fully available', async () => {
    const itemId = 'sony-fx3';
    const totalQuantity = 5;

    db.collection.mockReturnValueOnce({
      doc: jest.fn().mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce(
          mockItemDoc(true, { quantity: totalQuantity, name: 'Sony FX3' }),
        ),
      }),
    });

    const existingRentals = [
      {
        id: 'rental-a',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-03'),
        rentalSlot: 'day',
        items: [{ itemId: 'sony-fx3', quantity: 3 }],
      },
    ];

    // Different dates, no overlap
    const result = await checkAvailability(
      itemId,
      new Date('2026-06-10'),
      new Date('2026-06-12'),
      'day',
      2,
      existingRentals,
    );

    expect(result.available).toBe(true);
    expect(result.bookedQuantity).toBe(0);
    expect(result.availableQuantity).toBe(5);
    expect(result.totalQuantity).toBe(5);
  });

  test('multiple rentals on same date sum correctly', async () => {
    const itemId = 'sony-fx3';
    const totalQuantity = 10;

    db.collection.mockReturnValueOnce({
      doc: jest.fn().mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce(
          mockItemDoc(true, { quantity: totalQuantity, name: 'Sony FX3' }),
        ),
      }),
    });

    const existingRentals = [
      {
        id: 'rental-a',
        startDate: new Date('2026-06-10'),
        endDate: new Date('2026-06-12'),
        rentalSlot: 'day',
        items: [{ itemId: 'sony-fx3', quantity: 4 }],
      },
      {
        id: 'rental-b',
        startDate: new Date('2026-06-10'),
        endDate: new Date('2026-06-11'),
        rentalSlot: 'full_day',
        items: [{ itemId: 'sony-fx3', quantity: 3 }],
      },
    ];

    // 4 (day) + 3 (full_day) = 7 booked on 10 Jun. Requesting 3, but only 3 available
    // 10 available total - 7 booked = 3 available
    const result = await checkAvailability(
      itemId,
      new Date('2026-06-10'),
      new Date('2026-06-10'),
      'day',
      3,
      existingRentals,
    );

    expect(result.available).toBe(true);
    expect(result.bookedQuantity).toBe(7);
    expect(result.availableQuantity).toBe(3);
    expect(result.totalQuantity).toBe(10);
  });

  test('item not found returns unavailable', async () => {
    clearCache();
    // Both getItemTotalQuantity and getRentalsForItem fire in parallel via Promise.all
    db.collection.mockImplementation((collectionName) => {
      if (collectionName === 'items') {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockItemDoc(false, null)),
          }),
        };
      }
      return {
        get: jest.fn().mockResolvedValue({ docs: [] }),
      };
    });

    const result = await checkAvailability('nonexistent', new Date(), new Date(), 'full_day', 1);
    expect(result.available).toBe(false);
    expect(result.totalQuantity).toBe(0);
  });
});
