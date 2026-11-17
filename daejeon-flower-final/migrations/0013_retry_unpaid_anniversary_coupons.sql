-- Replacing an unpaid checkout releases its coupon without touching
-- orders that reached payment confirmation or completed payment.
CREATE TRIGGER IF NOT EXISTS anniversary_coupon_replace_unpaid_checkout
BEFORE INSERT ON anniversary_coupon_redemptions
WHEN NEW.status = 'RESERVED'
BEGIN
 UPDATE orders
 SET status = 'CANCELLED', payment_status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
 WHERE status = 'PENDING_PAYMENT' AND payment_status = 'PENDING'
 AND order_no IN (
   SELECT order_no FROM anniversary_coupon_redemptions
   WHERE coupon_id = NEW.coupon_id AND customer_id = NEW.customer_id
   AND order_no <> NEW.order_no AND status = 'RESERVED'
 );

 UPDATE anniversary_coupon_redemptions
 SET status = 'RELEASED', updated_at = CURRENT_TIMESTAMP
 WHERE coupon_id = NEW.coupon_id AND customer_id = NEW.customer_id
 AND order_no <> NEW.order_no AND status = 'RESERVED'
 AND EXISTS (
   SELECT 1 FROM orders
   WHERE orders.order_no = anniversary_coupon_redemptions.order_no
   AND orders.status = 'CANCELLED' AND orders.payment_status = 'CANCELLED'
 );
END;
