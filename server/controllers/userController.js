import { clerkClient } from "@clerk/clerk-sdk-node";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";

export const getUserBookings = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const bookings = await Booking.find({ user: userId, isPaid: true }).populate({
            path: "show",
            populate: { path: "movie" }
        }).sort({ createdAt: -1 });
        res.json({ success: true, bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

export const updateFavorite = async (req, res) => {
    try {
        const { movieId } = req.body;
        const userId = req.auth.userId;

        const user = await clerkClient.users.getUser(userId);
        const favorites = (user.privateMetadata.favorites || []);
        
        let message = "";
        let updatedFavorites;

        if (favorites.includes(movieId)) {
            updatedFavorites = favorites.filter(id => id !== movieId);
            message = "Removed from favorites";
        } else {
            updatedFavorites = [...favorites, movieId];
            message = "Added to favorites";
        }

        await clerkClient.users.updateUserMetadata(userId, {
            privateMetadata: { ...user.privateMetadata, favorites: updatedFavorites }
        });

        res.json({ success: true, message });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

export const getFavorites = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const user = await clerkClient.users.getUser(userId);
        const favoriteIds = user.privateMetadata.favorites || [];

        if (favoriteIds.length === 0) {
            return res.json({ success: true, movies: [] });
        }
        
        const movies = await Movie.find({ _id: { $in: favoriteIds } });
        res.json({ success: true, movies });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};