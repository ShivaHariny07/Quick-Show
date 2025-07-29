import stripe from "stripe";
import Booking from '../models/Booking.js';
import { inngest } from "../inngest/index.js";

export const stripeWebhooks = async (req, res) => {
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
        event = stripeInstance.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const bookingId = session.metadata.bookingId;

        try {
            const booking = await Booking.findByIdAndUpdate(bookingId, {
                isPaid: true,
                paymentLink: ""
            });

            if (booking) {
                await inngest.send({
                    name: "app/show.booked",
                    data: { bookingId }
                });
            }
        } catch (error) {
             res.status(500).json({ success: false, message: "Database update failed" });
        }
    }

    res.status(200).json({ received: true });
};