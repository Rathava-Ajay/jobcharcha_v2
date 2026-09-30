import { renewSubscription, topUpCredits, verifyEmployerPayment, EmployerVerifyPaymentResponse } from '../api/employerBilling';
import { loadRazorpayScript } from './loadRazorpay';

export type EmployerCheckoutOutcome =
  | { status: 'success'; result: EmployerVerifyPaymentResponse }
  | { status: 'failed'; message: string }
  | { status: 'cancelled' };

interface CheckoutOptions {
  name: string;
  description: string;
  prefillName?: string;
  prefillEmail?: string;
}

/** Employer-side mirror of src/utils/razorpayCheckout.ts — kept as a separate duplicate rather than
 * generalizing the shared aspirant util, so this new flow can't regress the already-working aspirant one. */
export async function startEmployerRazorpayCheckout(
  kind: 'renew' | 'top-up',
  employerPlanId: string,
  opts: CheckoutOptions,
): Promise<EmployerCheckoutOutcome> {
  try {
    await loadRazorpayScript();
  } catch {
    return { status: 'failed', message: 'Payment gateway failed to load. Please check your connection and try again.' };
  }

  let order;
  try {
    order = kind === 'renew' ? await renewSubscription(employerPlanId) : await topUpCredits(employerPlanId);
  } catch (err) {
    return { status: 'failed', message: err instanceof Error ? err.message : 'Could not start payment.' };
  }

  return new Promise<EmployerCheckoutOutcome>((resolve) => {
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
        verifyEmployerPayment({
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
