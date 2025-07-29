import axios from "axios";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import { inngest } from "../inngest/index.js";

export const getNowPlayingMovies = async (req, res) => {
    try {
        const { data } = await axios.get('https://api.themoviedb.org/3/movie/now_playing', {
            headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }
        });
        res.json({ success: true, movies: data.results });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch movies from TMDB" });
    }
};

export const addShow = async (req, res) => {
    try {
        const { movieId, showsInput, showPrice } = req.body;
        let movie = await Movie.findById(movieId);

        if (!movie) {
            const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
                axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
                    headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }
                }),
                axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
                    headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }
                })
            ]);
            
            const movieApiData = movieDetailsResponse.data;
            const movieCreditsData = movieCreditsResponse.data;

            movie = await Movie.create({
                _id: movieId,
                title: movieApiData.title,
                overview: movieApiData.overview,
                poster_path: movieApiData.poster_path,
                backdrop_path: movieApiData.backdrop_path,
                release_date: movieApiData.release_date,
                original_language: movieApiData.original_language,
                genres: movieApiData.genres,
                casts: movieCreditsData.cast,
                vote_average: movieApiData.vote_average,
                runtime: movieApiData.runtime
            });
        }

        const showsToCreate = showsInput.flatMap(show =>
            show.time.map(time => ({
                movie: movieId,
                showDateTime: new Date(`${show.date}T${time}`),
                showPrice: Number(showPrice),
                occupiedSeats: {}
            }))
        );

        if (showsToCreate.length > 0) {
            await Show.insertMany(showsToCreate);
        }

        await inngest.send({
            name: "app/show.added",
            data: { movieTitle: movie.title }
        });

        res.status(201).json({ success: true, message: "Shows added successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to add shows" });
    }
};

export const getShows = async (req, res) => {
    try {
        const shows = await Show.find({ showDateTime: { $gte: new Date() } })
            .populate('movie')
            .sort({ showDateTime: 1 });
            
        const uniqueMovieShows = Array.from(new Map(shows.map(show => [show.movie._id.toString(), show])).values());

        res.json({ success: true, shows: uniqueMovieShows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch shows" });
    }
};

export const getShow = async (req, res) => {
    try {
        const { movieId } = req.params;
        const movie = await Movie.findById(movieId);
        if (!movie) {
            return res.status(404).json({ success: false, message: "Movie not found" });
        }

        const shows = await Show.find({ movie: movieId, showDateTime: { $gte: new Date() } }).sort({ showDateTime: 1 });
        const dateTime = {};

        shows.forEach(show => {
            const date = show.showDateTime.toISOString().split("T")[0];
            if (!dateTime[date]) {
                dateTime[date] = [];
            }
            dateTime[date].push({
                time: show.showDateTime,
                showId: show._id.toString(),
                price: show.showPrice
            });
        });

        res.json({ success: true, movie, dateTime });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch show details" });
    }
};