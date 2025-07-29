import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [shows, setShows] = useState([]);
    const [favoriteMovies, setFavoriteMovies] = useState([]);

    const image_base_url = "https://image.tmdb.org/t/p/original";
    const { user } = useUser();
    const { getToken } = useAuth();
    const navigate = useNavigate();

    const fetchIsAdmin = async () => {
        if (!user) return;
        try {
            const token = await getToken();
            await axios.get('/api/admin/is-admin', { headers: { Authorization: `Bearer ${token}` } });
            setIsAdmin(true);
        } catch {
            setIsAdmin(false);
        }
    };

    const fetchShows = async () => {
        try {
            const { data } = await axios.get('/api/show/all');
            if (data.success) {
                setShows(data.shows);
            } else {
                setShows([]);
            }
        } catch {
            setShows([]);
        }
    };

    const fetchFavoriteMovies = async () => {
        if (!user) return;
        try {
            const token = await getToken();
            const { data } = await axios.get('/api/user/favorites', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (data.success) {
                setFavoriteMovies(data.movies);
            } else {
                setFavoriteMovies([]);
            }
        } catch {
            setFavoriteMovies([]);
        }
    };

    useEffect(() => {
        fetchShows();
    }, []);

    useEffect(() => {
        if (user) {
            fetchIsAdmin();
            fetchFavoriteMovies();
        } else {
            setIsAdmin(false);
            setFavoriteMovies([]);
        }
    }, [user]);

    const value = {
        axios,
        user,
        getToken,
        navigate,
        isAdmin,
        shows,
        favoriteMovies,
        fetchFavoriteMovies,
        image_base_url,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);