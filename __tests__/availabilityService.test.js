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
  checkAvailability,
} from '../src/utils/availabilityService';

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
  // ─── Full Day conflicts ───
  test('full_day conflicts with day', () => {
    expect(slotsConflict('full_day', 'day')).toBe(true);
  });

  test('full_day conflicts with evening', () => {
    expect(slotsConflict('full_day', 'evening')).toBe(true);
  });

  test('full_day conflicts with full_day', () => {
    expect(slotsConflict('full_day', 'full_day')).toBe(true);
  });

  // ─── Day conflicts ───
  test('day conflicts with day', () => {
    expect(slotsConflict('day', 'day')).toBe(true);
  });

  test('day conflicts with full_day', () => {
    expect(slotsConflict('day', 'full_day')).toBe(true);
  });

  test('day does NOT conflict with evening', () => {
    expect(slotsConflict('day', 'evening')).toBe(false);
  });

  // ─── Evening conflicts ───
  test('evening conflicts with evening', () => {
    expect(slotsConflict('evening', 'evening')).toBe(true);
  });

  test('evening conflicts with full_day', () => {
    expect(slotsConflict('evening', 'full_day')).toBe(true);
  });

  test('evening does NOT conflict with day', () => {
    expect(slotsConflict('evening', 'day')).toBe(false);
  });

  // ─── Symmetry: swapping arguments should give same result ───
  test('conflict is symmetric (day ↔ full_day)', () => {
    expect(slotsConflict('day', 'full_day')).toBe(true);
    expect(slotsConflict('full_day', 'day')).toBe(true);
  });

  test('conflict is symmetric (evening ↔ full_day)', () => {
    expect(slotsConflict('evening', 'full_day')).toBe(true);
    expect(slotsConflict('full_day', 'evening')).toBe(true);
  });

  test('non-conflict is symmetric (day ↔ evening)', () => {
    expect(slotsConflict('day', 'evening')).toBe(false);
    expect(slotsConflict('evening', 'day')).toBe(false);
  });

  // ─── Unknown slot ───
  test('returns false for unknown slot A', () => {
    expect(slotsConflict('unknown', 'day')).toBe(false);
  });

  test('returns false for unknown slot B', () => {
    expect(slotsConflict('day', 'unknown')).toBe(false);
  });
});

describe('datesOverlap', () => {
  const base = new Date('2026-06-01');

  test('returns true when same start and end dates', () => {
    const a = new Date('2026-06-01');
    const b = new Date('2026-06-03');
    expect(datesOverlap(a, b, a, b)).toBe(true);
  });

  test('returns true when ranges overlap partially (A before B, overlapping)', () => {
    const aStart = new Date('2026-06-01');
    const aEnd = new Date('2026-06-05');
    const bStart = new Date('2026-06-03');
    const bEnd = new Date('2026-06-08');
    expect(datesOverlap(aStart, aEnd, bStart, bEnd)).toBe(true);
  });

  test('returns true when A fully contains B', () => {
    const aStart = new Date('2026-06-01');
    const aEnd = new Date('2026-06-10');
    const bStart = new Date('2026-06-03');
    const bEnd = new Date('2026-06-07');
    expect(datesOverlap(aStart, aEnd, bStart, bEnd)).toBe(true);
  });

  test('returns true when B fully contains A', () => {
    const aStart = new Date('2026-06-03');
    const aEnd = new Date('2026-06-07');
    const bStart = new Date('2026-06-01');
    const bEnd = new Date('2026-06-10');
    expect(datesOverlap(aStart, aEnd, bStart, bEnd)).toBe(true);
  });

  test('returns true when B ends on A start (adjacent, inclusive)', () => {
    const aStart = new Date('2026-06-03');
    const aEnd = new Date('2026-06-05');
    const bStart = new Date('2026-06-01');
    const bEnd = new Date('2026-06-03');
    expect(datesOverlap(aStart, aEnd, bStart, bEnd)).toBe(true);
  });

  test('returns true when A ends on B start (adjacent, inclusive)', () => {
    const aStart = new Date('2026-06-01');
    const aEnd = new Date('2026-06-03');
    const bStart = new Date('2026-06-03');
    const bEnd = new Date('2026-06-05');
    expect(datesOverlap(aStart, aEnd, bStart, bEnd)).toBe(true);
  });

  test('returns false when A is completely before B with a gap', () => {
    const aStart = new Date('2026-06-01');
    const aEnd = new Date('2026-06-03');
    const bStart = new Date('2026-06-05');
    const bEnd = new Date('2026-06-07');
    expect(datesOverlap(aStart, aEnd, bStart, bEnd)).toBe(false);
  });

  test('returns false when A is completely after B with a gap', () => {
    const aStart = new Date('2026-06-05');
    const aEnd = new Date('2026-06-07');
    const bStart = new Date('2026-06-01');
    const bEnd = new Date('2026-06-03');
    expect(datesOverlap(aStart, aEnd, bStart, bEnd)).toBe(false);
  });

  test('handles string date inputs', () => {
    expect(datesOverlap('2026-06-01', '2026-06-05', '2026-06-03', '2026-06-08')).toBe(true);
    expect(datesOverlap('2026-06-01', '2026-06-03', '2026-06-05', '2026-06-08')).toBe(false);
  });

  test('same single day', () => {
    const d = new Date('2026-06-07');
    expect(datesOverlap(d, d, d, d)).toBe(true);
  });
});

describe('checkAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockItemDoc = (exists, data) => ({
    exists,
    data: () => data,
  });

  const mockRentalDoc = (id, data) => ({
    id,
    data: () => data,
  });

  test('returns item not found when item document does not exist', async () => {
    const itemId = 'nonexistent-item';
    db.collection.mockReturnValueOnce({
      doc: jest.fn().mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce(mockItemDoc(false, null)),
      }),
    });

    const result = await checkAvailability(itemId, new Date(), new Date(), 'full_day', 1);

    expect(result.available).toBe(false);
    expect(result.message).toBe('Item not found');
    expect(result.totalQuantity).toBe(0);
  });

  test('returns available when no conflicting rentals exist', async () => {
    const itemId = 'item-1';
    const startDate = new Date('2026-06-05');
    const endDate = new Date('2026-06-07');

    // Mock item document: quantity = 5 (remaining stock, no rentals active)
    db.collection.mockReturnValueOnce({
      doc: jest.fn().mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce(
          mockItemDoc(true, { quantity: 5, name: 'Sony FX3' }),
        ),
      }),
    });

    // getRentalsForItem: no customers
    db.collection.mockReturnValueOnce({
      get: jest.fn().mockResolvedValueOnce({
        docs: [],
      }),
    });

    const result = await checkAvailability(itemId, startDate, endDate, 'full_day', 2);

    expect(result.available).toBe(true);
    expect(result.status).toBe('available');
    expect(result.bookedQuantity).toBe(0);
    expect(result.availableQuantity).toBe(5);
    expect(result.totalQuantity).toBe(5);
    expect(result.message).toBe('🟢 Available');
  });

  test('returns low status when partially booked (less than half remaining)', async () => {
    const itemId = 'item-1';
    const startDate = new Date('2026-06-05');
    const endDate = new Date('2026-06-07');

    // After renting 3 of 5 units, remaining stock = 2
    db.collection.mockReturnValueOnce({
      doc: jest.fn().mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce(
          mockItemDoc(true, { quantity: 2, name: 'Sony FX3' }),
        ),
      }),
    });

    const existingRentals = [
      {
        id: 'rental-1',
        customerId: 'cust-1',
        startDate: new Date('2026-06-05'),
        endDate: new Date('2026-06-07'),
        rentalSlot: 'day',
        items: [{ itemId: 'item-1', quantity: 3 }],
      },
    ];

    // 2 remaining, 3 booked. Requesting 2 (matches remaining stock).
    const result = await checkAvailability(
      itemId,
      startDate,
      endDate,
      'day',
      2,
      existingRentals,
    );

    expect(result.available).toBe(true);
    expect(result.status).toBe('low');
    expect(result.bookedQuantity).toBe(3);
    expect(result.availableQuantity).toBe(2);
    expect(result.totalQuantity).toBe(5);
  });

  test('returns unavailable when requested quantity exceeds available stock', async () => {
    const itemId = 'item-1';
    const startDate = new Date('2026-06-05');
    const endDate = new Date('2026-06-07');

    // After renting 3 of 5 units, remaining stock = 2
    db.collection.mockReturnValueOnce({
      doc: jest.fn().mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce(
          mockItemDoc(true, { quantity: 2, name: 'Sony FX3' }),
        ),
      }),
    });

    const existingRentals = [
      {
        id: 'rental-1',
        customerId: 'cust-1',
        startDate: new Date('2026-06-05'),
        endDate: new Date('2026-06-07'),
        rentalSlot: 'day',
        items: [{ itemId: 'item-1', quantity: 3 }],
      },
    ];

    // 2 remaining, requesting 4 which exceeds remaining stock
    const result = await checkAvailability(
      itemId,
      startDate,
      endDate,
      'day',
      4,
      existingRentals,
    );

    expect(result.available).toBe(false);
    expect(result.status).toBe('unavailable');
    expect(result.bookedQuantity).toBe(3);
    expect(result.availableQuantity).toBe(2);
    expect(result.totalQuantity).toBe(5);
  });

  test('returns available when slots do not conflict (day vs evening)', async () => {
    const itemId = 'item-1';
    const startDate = new Date('2026-06-05');
    const endDate = new Date('2026-06-07');

    // 3 already rented on day shift, but we're requesting evening — no conflict
    db.collection.mockReturnValueOnce({
      doc: jest.fn().mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce(
          mockItemDoc(true, { quantity: 2, name: 'Sony FX3' }),
        ),
      }),
    });

    const existingRentals = [
      {
        id: 'rental-1',
        customerId: 'cust-1',
        startDate: new Date('2026-06-05'),
        endDate: new Date('2026-06-07'),
        rentalSlot: 'day',
        items: [{ itemId: 'item-1', quantity: 3 }],
      },
    ];

    // Requesting evening slot — day and evening do NOT conflict,
    // so all remaining stock (2) is available but marked low since <= 2
    const result = await checkAvailability(
      itemId,
      startDate,
      endDate,
      'evening',
      2,
      existingRentals,
    );

    expect(result.available).toBe(true);
    expect(result.status).toBe('low');
    expect(result.bookedQuantity).toBe(0); // no conflict, evening doesn't conflict with day
    expect(result.availableQuantity).toBe(2);
    expect(result.totalQuantity).toBe(2); // no conflicting rentals, so total = remaining only
  });

  test('returns available when dates do not overlap (no conflict)', async () => {
    const itemId = 'item-1';

    // 3 rented on different dates, remaining stock = 2
    db.collection.mockReturnValueOnce({
      doc: jest.fn().mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce(
          mockItemDoc(true, { quantity: 2, name: 'Sony FX3' }),
        ),
      }),
    });

    const existingRentals = [
      {
        id: 'rental-1',
        customerId: 'cust-1',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-03'),
        rentalSlot: 'day',
        items: [{ itemId: 'item-1', quantity: 3 }],
      },
    ];

    // Request different dates that don't overlap
    const result = await checkAvailability(
      itemId,
      new Date('2026-06-10'),
      new Date('2026-06-12'),
      'day',
      2,
      existingRentals,
    );

    expect(result.available).toBe(true);
    expect(result.bookedQuantity).toBe(0); // no date overlap
    expect(result.availableQuantity).toBe(2);
    expect(result.totalQuantity).toBe(2); // no conflicting rentals, so total = remaining only
  });

  test('returns low status when partially booked and <= 30% remaining', async () => {
    const itemId = 'item-1';
    const startDate = new Date('2026-06-05');
    const endDate = new Date('2026-06-07');

    // 8 of 10 booked, remaining stock = 2
    db.collection.mockReturnValueOnce({
      doc: jest.fn().mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce(
          mockItemDoc(true, { quantity: 2, name: 'Sony FX3' }),
        ),
      }),
    });

    const existingRentals = [
      {
        id: 'rental-1',
        customerId: 'cust-1',
        startDate: new Date('2026-06-05'),
        endDate: new Date('2026-06-07'),
        rentalSlot: 'day',
        items: [{ itemId: 'item-1', quantity: 8 }],
      },
    ];

    // 2 remaining, requesting 1
    const result = await checkAvailability(
      itemId,
      startDate,
      endDate,
      'day',
      1,
      existingRentals,
    );

    expect(result.available).toBe(true);
    expect(result.status).toBe('low');
    expect(result.availableQuantity).toBe(2);
    expect(result.totalQuantity).toBe(10);
  });

  test('Multiple existing rentals — sums conflicting quantities correctly', async () => {
    const itemId = 'item-1';
    const startDate = new Date('2026-06-05');
    const endDate = new Date('2026-06-07');

    // 5 of 10 already booked, remaining stock = 5
    db.collection.mockReturnValueOnce({
      doc: jest.fn().mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce(
          mockItemDoc(true, { quantity: 5, name: 'Sony FX3' }),
        ),
      }),
    });

    const existingRentals = [
      {
        id: 'rental-1',
        customerId: 'cust-1',
        startDate: new Date('2026-06-05'),
        endDate: new Date('2026-06-06'),
        rentalSlot: 'day',
        items: [{ itemId: 'item-1', quantity: 2 }],
      },
      {
        id: 'rental-2',
        customerId: 'cust-2',
        startDate: new Date('2026-06-06'),
        endDate: new Date('2026-06-08'),
        rentalSlot: 'full_day',
        items: [{ itemId: 'item-1', quantity: 3 }],
      },
    ];

    // 5 remaining, 5 booked. Requesting 6 — exceeds remaining stock.
    const result = await checkAvailability(
      itemId,
      startDate,
      endDate,
      'day',
      6,
      existingRentals,
    );

    expect(result.available).toBe(false);
    expect(result.bookedQuantity).toBe(5);
    expect(result.availableQuantity).toBe(5);
    expect(result.totalQuantity).toBe(10);
  });

  test('returns available when exact quantity matches remaining stock', async () => {
    const itemId = 'item-1';
    const startDate = new Date('2026-06-05');
    const endDate = new Date('2026-06-07');

    // 3 of 5 booked, remaining stock = 2
    db.collection.mockReturnValueOnce({
      doc: jest.fn().mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce(
          mockItemDoc(true, { quantity: 2, name: 'Sony FX3' }),
        ),
      }),
    });

    const existingRentals = [
      {
        id: 'rental-1',
        customerId: 'cust-1',
        startDate: new Date('2026-06-05'),
        endDate: new Date('2026-06-07'),
        rentalSlot: 'day',
        items: [{ itemId: 'item-1', quantity: 3 }],
      },
    ];

    // Requesting 2 — exactly equals remaining stock
    const result = await checkAvailability(
      itemId,
      startDate,
      endDate,
      'day',
      2,
      existingRentals,
    );

    expect(result.available).toBe(true);
    expect(result.bookedQuantity).toBe(3);
    expect(result.availableQuantity).toBe(2);
    expect(result.totalQuantity).toBe(5);
  });
});
