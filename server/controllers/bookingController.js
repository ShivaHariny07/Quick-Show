import { inngest } from "../inngest/index.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import stripe from "stripe";

// Check seat availability for a show
const checkSeatsAvailability = async (showId, selectedSeats) => {
  try {
    const showData = await Show.findById(showId);
    if (!showData) return false;

    const occupiedSeats = showData.occupiedSeats || {};

    // If any selected seat is already occupied
    const isAnySeatTaken = selectedSeats.some(seat => occupiedSeats[seat]);

    return !isAnySeatTaken;
  } catch (error) {
    console.log(error.message);
    return false;
  }
};

// Create booking controller
export const createBooking = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { showId, selectedSeats } = req.body;
    const { origin } = req.headers;

    const isAvailable = await checkSeatsAvailability(showId, selectedSeats);

    if (!isAvailable) {
      return res.json({
        success: false,
        message: "Selected seats are not available."
      });
    }

    const showData = await Show.findById(showId).populate("movie");

    if (!showData) {
      return res.status(404).json({ success: false, message: "Show not found" });
    }

    // Initialize occupiedSeats if unset
    showData.occupiedSeats = showData.occupiedSeats || {};

    // Mark seats occupied by this user
    selectedSeats.forEach(seat => {
      showData.occupiedSeats[seat] = userId;
    });

    showData.markModified("occupiedSeats");
    await showData.save();

    // Create booking record
    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: showData.showPrice * selectedSeats.length,
      bookedSeats: selectedSeats
    });

    // Stripe setup
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

    const line_items = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: showData.movie.title
          },
          unit_amount: Math.floor(booking.amount) * 100
        },
        quantity: 1
      }
    ];

    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/loading/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      line_items,
      mode: "payment",
      metadata: {
        bookingId: booking._id.toString()
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60 // 30 minutes
    });

    booking.paymentLink = session.url;
    await booking.save();

    await inngest.send({
      name: "app/checkpayment",
      data: { bookingId: booking._id.toString() }
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;
    const showData = await Show.findById(showId);

    if (!showData) {
      // Instead of 404, return empty array to avoid breaking frontend
      return res.json({ success: true, occupiedSeats: [] });
    }

    const occupiedSeatsObj = showData.occupiedSeats || {};
    const occupiedSeats = Object.keys(occupiedSeatsObj);

    res.json({ success: true, occupiedSeats });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
