import { Router } from "express";

import { createCheckoutSession, handleStripeWebhook }  from "../controllers/payment.controller";

const router = Router();

router.post('/createCheckout',  createCheckoutSession);

router.post('/webhook', handleStripeWebhook);



export default router;
