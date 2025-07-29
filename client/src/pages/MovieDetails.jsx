import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BlurCircle from '../components/BlurCircle';
import { Heart, PlayCircleIcon, StarIcon } from 'lucide-react';
import timeFormat from '../lib/timeFormat';
import DateSelect from '../components/DateSelect';
import MovieCard from '../components/MovieCard';
import Loading from '../components/Loading';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';
import fallbackImage from '../assets/screenImage.svg';

const MovieDetails = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [show, setShow] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const { shows, axios, getToken, user, fetchFavoriteMovies, favoriteMovies, image_base_url } = useAppContext();
    const isFavorite = favoriteMovies.some(m => String(m._id) === String(id));

    const getShow = async () => {
        setIsLoading(true);
        try {
            const { data } = await axios.get(`/api/show/${id}`);
            if (data.success && data.movie) {
                setShow(data);
            } else {
                toast.error("Could not find details for this movie.");
                navigate('/movies');
            }
        } catch {
            toast.error("Failed to load movie details.");
            navigate('/movies');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFavorite = async () => {
        if (!user) {
            toast.error("Please login to add to favorites");
            return;
        }
        try {
            const { data } = await axios.post(
                '/api/user/update-favorite',
                { movieId: id },
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            );
            if (data.success) {
                await fetchFavoriteMovies();
                toast.success(data.message);
            } else {
                toast.error(data.message);
            }
        } catch {
            toast.error('Failed to update favorites');
        }
    };

    useEffect(() => {
        getShow();
        window.scrollTo(0, 0);
    }, [id]);

    if (isLoading) return <Loading />;
    if (!show || !show.movie) return <div className='flex justify-center items-center h-screen'>Movie not found.</div>;
    
    const posterSrc = show.movie.poster_path;

    return (
        <div className='px-6 md:px-16 lg:px-40 pt-30 md:pt-50'>
            <div className='flex flex-col md:flex-row gap-8 max-w-6xl mx-auto'>
                <img src={posterSrc} alt={show.movie.title} className='max-md:mx-auto rounded-xl h-104 max-w-70 object-cover' />
                <div className='relative flex flex-col gap-3'>
                    <BlurCircle top='-100px' left='-100px' />
                    <p className='text-primary'>{show.movie.original_language?.toUpperCase()}</p>
                    <h1 className='text-4xl font-semibold max-w-96 text-balance'>{show.movie.title}</h1>
                    <div className='flex items-center gap-2 text-gray-300'>
                        <StarIcon className='w-5 h-5 text-primary fill-primary' />
                        {show.movie.vote_average?.toFixed(1)} User Rating
                    </div>
                    <p className='text-gray-400 mt-2 text-sm leading-tight max-w-xl'>{show.movie.overview}</p>
                    <p>
                        {timeFormat(show.movie.runtime)} •{' '}
                        {show.movie.genres?.map((g) => g.name).join(', ')} •{' '}
                        {show.movie.release_date?.split('-')[0]}
                    </p>
                    <div className='flex items-center flex-wrap gap-4 mt-4'>
                        <button className='flex items-center gap-2 px-7 py-3 text-sm bg-gray-800 hover:bg-gray-900 transition rounded-md font-medium cursor-pointer active:scale-95'>
                            <PlayCircleIcon className='w-5 h-5' /> Watch Trailer
                        </button>
                        <a href='#dateSelect' className='px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer active:scale-95'>
                            Buy Tickets
                        </a>
                        <button onClick={handleFavorite} className='bg-gray-700 p-2.5 rounded-full transition cursor-pointer active:scale-95'>
                            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-primary text-primary' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            <p className='text-lg font-medium mt-20'>Cast</p>
            <div className='overflow-x-auto no-scrollbar mt-8 pb-4'>
                <div className='flex items-center gap-4 w-max px-4'>
                    {show.movie.casts?.slice(0, 12).map((cast) => (
                        <div key={cast.id || cast.name} className='flex flex-col items-center text-center'>
                            <img src={cast.profile_path ? image_base_url + cast.profile_path : fallbackImage} alt={cast.name} className='rounded-full h-20 w-20 object-cover' />
                            <p className='font-medium text-xs mt-3 w-20 truncate'>{cast.name}</p>
                        </div>
                    ))}
                </div>
            </div>

            <DateSelect dateTime={show.dateTime || {}} id={id} />

            <p className='text-lg font-medium mt-20 mb-8'>You May Also Like</p>
            <div className='flex flex-wrap max-sm:justify-center gap-8'>
                {shows.filter(s => s.movie._id !== id).slice(0, 4).map((showItem) => (
                    showItem?.movie && <MovieCard key={showItem.movie._id} movie={showItem.movie} />
                ))}
            </div>

            <div className='flex justify-center mt-20'>
                <button onClick={() => { navigate('/movies'); }} className='px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium'>
                    Show more
                </button>
            </div>
        </div>
    );
};

export default MovieDetails;