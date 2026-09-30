import { checkoutCart, verifyStoreOrder, StoreCheckoutPayload, StoreVerifyResponse } from '../api/storeOrders';
import { loadRazorpayScript } from './loadRazorpay';

export type StoreCheckoutOutcome =
  | { status: 'success'; result: StoreVerifyResponse }
  | { status: 'failed'; message: string }
  | { status: 'cancelled' };

interface StoreCheckoutOptions {
  name: string;
  description: string;
  prefillName?: string;
  prefillEmail?: string;
}

/** Cart checkout-create -> Razorpay Checkout -> server-side verify, mirrors razorpayCheckout.ts's shape for the Store's own order/cart flow. */
export async function startStoreRazorpayCheckout(payload: StoreCheckoutPayload, opts: StoreCheckoutOptions): Promise<StoreCheckoutOutcome> {
  try {
    await loadRazorpayScript();
  } catch {
    return { status: 'failed', message: 'Payment gateway failed to load. Please check your connection and try again.' };
  }

  let order;
  try {
    order = await checkoutCart(payload);
  } catch (err) {
    return { status: 'failed', message: err instanceof Error ? err.message : 'Could not start checkout.' };
  }

  if (!order.razorpayOrderId || !order.keyId) {
    return { status: 'failed', message: 'Payment order could not be created.' };
  }

  return new Promise<StoreCheckoutOutcome>((resolve) => {
    const rzp = new window.Razorpay({
      key: order.keyId!,
      amount: order.razorpayAmount!,
      currency: 'INR',
      name: opts.name,
      description: opts.description,
      order_id: order.razorpayOrderId!,
      prefill: { name: opts.prefillName, email: opts.prefillEmail },
      theme: { color: '#059669' },
      handler: (response) => {
        verifyStoreOrder({
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
