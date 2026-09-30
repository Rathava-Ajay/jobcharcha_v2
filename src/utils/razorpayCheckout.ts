import { createPaymentOrder, verifyPayment, CreateOrderPayload, VerifyPaymentResponse } from '../api/payments';
import { loadRazorpayScript } from './loadRazorpay';

export type CheckoutOutcome =
  | { status: 'success'; result: VerifyPaymentResponse }
  | { status: 'failed'; message: string }
  | { status: 'cancelled' };

interface CheckoutOptions {
  name: string;
  description: string;
  prefillName?: string;
  prefillEmail?: string;
}

/** Order-create -> Razorpay Checkout -> server-side verify, shared by PricingSection and MockTestPage. */
export async function startRazorpayCheckout(payload: CreateOrderPayload, opts: CheckoutOptions): Promise<CheckoutOutcome> {
  try {
    await loadRazorpayScript();
  } catch {
    return { status: 'failed', message: 'Payment gateway failed to load. Please check your connection and try again.' };
  }

  let order;
  try {
    order = await createPaymentOrder(payload);
  } catch (err) {
    return { status: 'failed', message: err instanceof Error ? err.message : 'Could not start payment.' };
  }

  return new Promise<CheckoutOutcome>((resolve) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: opts.name,
      description: opts.description,
      order_id: order.razorpayOrderId,
      prefill: { name: opts.prefillName, email: opts.prefillEmail },
      theme: { color: '#059669' },
      handler: (response) => {
        verifyPayment({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        })
          .then((result) => resolve({ status: 'success', result }))
          .catch((err) => resolve({ status: 'failed', message: err instanceof Error ? err.message : 'Payment verification failed.' }));
      },
      modal: {
        ondismiss: () => resolve({ status: 'cancelled' }),
      },
    });
    rzp.open();
  });
}
