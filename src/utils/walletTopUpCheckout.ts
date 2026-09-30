import { createWalletTopUpOrder, verifyWalletTopUp } from '../api/wallet';
import { loadRazorpayScript } from './loadRazorpay';

export type WalletTopUpOutcome =
  | { status: 'success' }
  | { status: 'failed'; message: string }
  | { status: 'cancelled' };

interface WalletTopUpOptions {
  prefillName?: string;
  prefillEmail?: string;
}

/** Top-up order-create -> Razorpay Checkout -> server-side verify, mirrors razorpayCheckout.ts's shape for wallet top-ups. */
export async function startWalletTopUpCheckout(amount: number, opts: WalletTopUpOptions): Promise<WalletTopUpOutcome> {
  try {
    await loadRazorpayScript();
  } catch {
    return { status: 'failed', message: 'Payment gateway failed to load. Please check your connection and try again.' };
  }

  let order;
  try {
    order = await createWalletTopUpOrder(amount);
  } catch (err) {
    return { status: 'failed', message: err instanceof Error ? err.message : 'Could not start top-up.' };
  }

  return new Promise<WalletTopUpOutcome>((resolve) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'JobCharcha Wallet Top-Up',
      description: `Add ₹${amount} to wallet`,
      order_id: order.razorpayOrderId,
      prefill: { name: opts.prefillName, email: opts.prefillEmail },
      theme: { color: '#059669' },
      handler: (response) => {
        verifyWalletTopUp({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        })
          .then(() => resolve({ status: 'success' }))
          .catch((err) => resolve({ status: 'failed', message: err instanceof Error ? err.message : 'Top-up verification failed.' }));
      },
      modal: {
        ondismiss: () => resolve({ status: 'cancelled' }),
      },
    });
    rzp.open();
  });
}
