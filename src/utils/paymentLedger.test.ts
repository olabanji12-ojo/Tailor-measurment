/**
 * Payment Ledger & Financial Accuracy Unit Tests (TASK-07)
 */

interface PaymentRecord {
  id: string;
  amount: number;
  method: string;
  date: string;
  note?: string;
  idempotency_key?: string;
}

interface ClientOrder {
  id: string;
  total_cost: number;
  amount_paid: number;
  payments?: PaymentRecord[];
  status?: string;
  garment?: string;
  customer_name?: string;
}

export function computeFinancialSummary(order: ClientOrder) {
  const totalCost = Number(order.total_cost || 0);
  const amountPaid = Number(order.amount_paid || 0);
  const balance = Math.max(0, totalCost - amountPaid);

  const installmentsTotal = (order.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const legacyOpening = Math.max(0, amountPaid - installmentsTotal);

  let paymentStatus: 'unpaid' | 'partially_paid' | 'fully_paid' = 'unpaid';
  if (amountPaid >= totalCost && totalCost > 0) {
    paymentStatus = 'fully_paid';
  } else if (amountPaid > 0) {
    paymentStatus = 'partially_paid';
  }

  return {
    totalCost,
    amountPaid,
    balance,
    installmentsTotal,
    legacyOpening,
    paymentStatus,
  };
}

export function generateIdempotencyKey(): string {
  return `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function generateWhatsAppPaymentReminder(order: ClientOrder, shopName: string): string | null {
  const balance = Math.max(0, (order.total_cost || 0) - (order.amount_paid || 0));
  if (balance <= 0) {
    return null; // No reminder for fully settled orders
  }
  const clientName = order.customer_name || 'Valued Client';
  const garment = order.garment || 'outfit';
  const shop = shopName || 'our atelier';

  return `Hello ${clientName}! 🧵 This is a friendly reminder from ${shop} regarding your ${garment}. Work is underway in our atelier. Outstanding balance: ₦${balance.toLocaleString()}. Thank you! ✨`;
}

// -------------------------------------------------------------
// Test Execution Runner
// -------------------------------------------------------------
let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

console.log('\n--- 1. AUTHORITATIVE BALANCE & SETTLEMENT TESTS ---');

const orderNew: ClientOrder = {
  id: 'ord_1',
  total_cost: 100000,
  amount_paid: 30000,
  payments: [{ id: 'p1', amount: 30000, method: 'cash', date: '2026-10-08' }],
};
const summary1 = computeFinancialSummary(orderNew);
assert(summary1.balance === 70000, 'Initial balance is exactly 70,000 for 100k total and 30k deposit');
assert(summary1.paymentStatus === 'partially_paid', 'Order status is partially_paid');
assert(summary1.legacyOpening === 0, 'No legacy opening balance when payments array matches amount_paid');

// Multiple installments
const orderMultiple: ClientOrder = {
  id: 'ord_2',
  total_cost: 100000,
  amount_paid: 65000,
  payments: [
    { id: 'p1', amount: 30000, method: 'cash', date: '2026-10-01' },
    { id: 'p2', amount: 20000, method: 'bank_transfer', date: '2026-10-03' },
    { id: 'p3', amount: 15000, method: 'pos', date: '2026-10-05' },
  ],
};
const summary2 = computeFinancialSummary(orderMultiple);
assert(summary2.installmentsTotal === 65000, 'Sum of installments is exactly 65,000');
assert(summary2.balance === 35000, 'Remaining balance is exactly 35,000');
assert(summary2.paymentStatus === 'partially_paid', 'Status is partially_paid');

// Full settlement
const orderSettled: ClientOrder = {
  id: 'ord_3',
  total_cost: 100000,
  amount_paid: 100000,
  payments: [
    { id: 'p1', amount: 65000, method: 'cash', date: '2026-10-01' },
    { id: 'p2', amount: 35000, method: 'bank_transfer', date: '2026-10-08' },
  ],
};
const summary3 = computeFinancialSummary(orderSettled);
assert(summary3.balance === 0, 'Balance is 0 for fully settled order');
assert(summary3.paymentStatus === 'fully_paid', 'Status is fully_paid');

console.log('\n--- 2. LEGACY OPENING BALANCE COMPATIBILITY TESTS ---');

const legacyOrder: ClientOrder = {
  id: 'ord_legacy',
  total_cost: 80000,
  amount_paid: 50000,
  payments: [], // No ledger items exist
};
const summaryLeg = computeFinancialSummary(legacyOrder);
assert(summaryLeg.balance === 30000, 'Legacy order calculates correct balance (30,000)');
assert(summaryLeg.legacyOpening === 50000, 'Identifies full 50,000 as legacy opening deposit');
assert(summaryLeg.installmentsTotal === 0, 'Zero installments without fabricating false transactions');

// Subsequent installment added to legacy order
const legacyWithNewPayment: ClientOrder = {
  id: 'ord_legacy_2',
  total_cost: 80000,
  amount_paid: 70000,
  payments: [{ id: 'p_new', amount: 20000, method: 'bank_transfer', date: '2026-10-08' }],
};
const summaryLeg2 = computeFinancialSummary(legacyWithNewPayment);
assert(summaryLeg2.legacyOpening === 50000, 'Preserves 50,000 opening deposit after new 20,000 installment is recorded');
assert(summaryLeg2.amountPaid === 70000, 'Total received is 70,000 (50k legacy + 20k new)');
assert(summaryLeg2.balance === 10000, 'Remaining balance is 10,000');

console.log('\n--- 3. IDEMPOTENCY KEY GENERATION TESTS ---');

const key1 = generateIdempotencyKey();
const key2 = generateIdempotencyKey();
assert(key1.startsWith('pay_'), 'Idempotency key has standard pay_ prefix');
assert(key1 !== key2, 'Successive idempotency keys are strictly unique');

console.log('\n--- 4. WHATSAPP PAYMENT REMINDER FORMATTING TESTS ---');

const reminder = generateWhatsAppPaymentReminder(orderMultiple, 'Apex Bespoke');
assert(reminder !== null, 'Reminder is generated for active debtor');
assert(reminder!.includes('₦35,000'), 'Reminder displays exact balance ₦35,000');
assert(reminder!.includes('Apex Bespoke'), 'Reminder includes correct atelier name');

const reminderSettled = generateWhatsAppPaymentReminder(orderSettled, 'Apex Bespoke');
assert(reminderSettled === null, 'No debtor reminder generated for fully paid order');

console.log('\n=======================================');
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('=======================================\n');

if (failed > 0) {
  if (typeof (globalThis as any).process !== 'undefined') {
    (globalThis as any).process.exit(1);
  }
}
