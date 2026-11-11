// Keep checkout drafts and cancelled attempts out of order history.
// A refunded order still has its original provider approval.
export const approvedOrder = "o.status<>'PENDING_PAYMENT' AND o.payment_status IN ('PAID','PARTIAL_REFUND','REFUNDED','CANCELLED') AND EXISTS(SELECT 1 FROM payments pay WHERE pay.order_id=o.id AND pay.approved_at IS NOT NULL AND COALESCE(pay.provider_payment_key,'')<>'')";
