import Stripe from 'stripe';
import Show from "../models/Show.js";
import Booking from "../models/Booking.js";
import { inngest } from '../inngest/index.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// export const createBooking = async (req, res) => {
//     try {
//         const { showId, selectedSeats } = req.body;
//         const userId = req.auth.userId;

//         const populatedShow = await Show.findById(showId).populate('movie');

//         if (!populatedShow) {
//             return res.status(404).json({ success: false, message: "Show not found." });
//         }
//         if (!populatedShow.movie) {
//             return res.status(404).json({ success: false, message: "Could not find the movie for this show." });
//         }

//         const unavailableSeats = selectedSeats.filter(seat => populatedShow.occupiedSeats[seat]);
//         if (unavailableSeats.length > 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: `Seats ${unavailableSeats.join(', ')} are no longer available.`,
//                 unavailableSeats: unavailableSeats,
//             });
//         }
        
//         const booking = await Booking.create({
//             user: userId,
//             show: showId,
//             bookedSeats: selectedSeats,
//             amount: populatedShow.showPrice * selectedSeats.length,
//         });

//         const seatUpdate = {};
//         selectedSeats.forEach(seat => {
//             seatUpdate[`occupiedSeats.${seat}`] = userId;
//         });
//         await Show.updateOne({ _id: showId }, { $set: seatUpdate });
        
//         const session = await stripe.checkout.sessions.create({
//             payment_method_types: ['card'],
//             line_items: [{
//                 price_data: {
//                     currency: 'inr',
//                     product_data: {
//                         name: `Tickets for ${populatedShow.movie.title}`,
//                         description: `Seats: ${selectedSeats.join(', ')}`
//                     },
//                     unit_amount: populatedShow.showPrice * 100,
//                 },
//                 quantity: selectedSeats.length,
//             }],
//             mode: 'payment',
//             success_url: `${process.env.FRONTEND_URL}/payment?success=true&bookingId=${booking._id}`,
//             cancel_url: `${process.env.FRONTEND_URL}/payment?success=false`,
//             metadata: { bookingId: booking._id.toString() },
//         });

//         booking.paymentLink = session.id;
//         await booking.save();
        
//         await inngest.send({
//             name: "app/checkpayment",
//             data: { bookingId: booking._id },
//         });

//         res.json({ success: true, url: session.url });
//     } catch (error) {
//         res.status(500).json({ success: false, message: "Booking creation failed due to a server error." });
//     }
// };

export const createBooking = async (req, res) => {
    try {
        const { showId, selectedSeats } = req.body;
        const userId = req.auth?.userId;

        console.log("🔹 Incoming booking request:");
        console.log("Show ID:", showId);
        console.log("User ID:", userId);
        console.log("Selected Seats:", selectedSeats);

        // Validate inputs
        if (!showId || !Array.isArray(selectedSeats) || selectedSeats.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid request: showId or selectedSeats missing.",
            });
        }

        // Fetch the show with movie populated
        const populatedShow = await Show.findById(showId).populate('movie');

        if (!populatedShow) {
            console.warn("❌ Show not found with ID:", showId);
            return res.status(404).json({ success: false, message: "Show not found." });
        }

        if (!populatedShow.movie) {
            console.warn("❌ Movie not found for show:", showId);
            return res.status(404).json({ success: false, message: "Could not find the movie for this show." });
        }

        const unavailableSeats = selectedSeats.filter(seat => populatedShow.occupiedSeats?.[seat]);
        if (unavailableSeats.length > 0) {
            console.log("⚠️ Seats already booked:", unavailableSeats);
            return res.status(400).json({
                success: false,
                message: `Seats ${unavailableSeats.join(', ')} are no longer available.`,
                unavailableSeats,
            });
        }

        // Create booking
        const amount = populatedShow.showPrice * selectedSeats.length;
        const booking = await Booking.create({
            user: userId,
            show: showId,
            bookedSeats: selectedSeats,
            amount,
        });

        // Update occupied seats in Show
        const seatUpdate = {};
        selectedSeats.forEach(seat => {
            seatUpdate[`occupiedSeats.${seat}`] = userId;
        });
        await Show.updateOne({ _id: showId }, { $set: seatUpdate });

        // Create Stripe checkout session
        console.log("💳 Creating Stripe checkout session...");
        console.log("Amount:", amount);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: `Tickets for ${populatedShow.movie.title}`,
                            description: `Seats: ${selectedSeats.join(', ')}`
                        },
                        unit_amount: populatedShow.showPrice * 100, // ₹ to paisa
                    },
                    quantity: selectedSeats.length,
                }
            ],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/payment?success=true&bookingId=${booking._id}`,
            cancel_url: `${process.env.FRONTEND_URL}/payment?success=false`,
            metadata: { bookingId: booking._id.toString() },
        });

        booking.paymentLink = session.id;
        await booking.save();

        // Trigger payment check event
        console.log("🚀 Triggering payment check for booking ID:", booking._id);
        await inngest.send({
            name: "app/checkpayment",
            data: { bookingId: booking._id },
        });

        console.log("✅ Booking successful. Redirecting to payment URL.");
        return res.json({ success: true, url: session.url });

    } catch (error) {
        console.error("❌ Booking creation failed:", error);
        return res.status(500).json({
            success: false,
            message: "Booking creation failed due to a server error.",
        });
    }
};

export const getOccupiedSeats = async (req, res) => {
    try {
        const { showId } = req.params;
        const show = await Show.findById(showId);
        if (!show) {
            return res.status(404).json({ success: false, message: "Show not found" });
        }
        res.json({ success: true, occupiedSeats: show.occupiedSeats });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch seats" });
    }
};