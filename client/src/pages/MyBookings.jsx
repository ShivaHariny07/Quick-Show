import React, { useEffect, useState } from 'react'
import Loading from '../components/Loading'
import BlurCircle from '../components/BlurCircle'
import timeFormat from '../lib/timeFormat'
import { dateFormat } from '../lib/dateFormat'
import { useAppContext } from '../context/AppContext'
import { Link } from 'react-router-dom'

const MyBookings = () => {
    const currency = "₹";
    const { axios, getToken, user, image_base_url } = useAppContext();
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const getMyBookings = async () => {
        setIsLoading(true);
        try {
            const { data } = await axios.get('/api/user/bookings', {
                headers: { Authorization: `Bearer ${await getToken()}` }
            });
            if (data.success) {
                setBookings(data.bookings);
            }
        } catch (error) {
            console.log(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            getMyBookings();
        } else {
            setIsLoading(false);
        }
    }, [user]);

    const getPosterUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http')) {
            return path;
        }
        return image_base_url + path;
    };

    if (isLoading) {
        return <Loading />;
    }

    return (
        <div className='relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]'>
            <BlurCircle top="100px" left="100px" />
            <div>
                <BlurCircle bottom="0px" left="600px" />
            </div>
            <h1 className='text-lg font-semibold mb-4'>My Bookings</h1>

            {bookings.length > 0 ? (
                bookings.map((item) => (
                    <div key={item._id} className='flex flex-col md:flex-row justify-between bg-primary/8 border border-primary/20 rounded-lg mt-4 p-2 max-w-3xl'>
                        <div className='flex flex-col md:flex-row'>
                            <img src={getPosterUrl(item.show.movie.poster_path)} alt={item.show.movie.title} className='md:w-40 aspect-[2/3] object-cover rounded'/>
                            <div className='flex flex-col p-4'>
                                <p className='text-lg font-semibold'>{item.show.movie.title}</p>
                                <p className='text-gray-400 text-sm'>{timeFormat(item.show.movie.runtime)}</p>
                                <p className='text-gray-400 text-sm mt-auto'>{dateFormat(item.show.showDateTime)}</p>
                            </div>
                        </div>
                        <div className='flex flex-col md:items-end md:text-right justify-between p-4'>
                            <div className='flex items-center gap-4'>
                                <p className='text-2xl font-semibold mb-3'>{currency}{item.amount}</p>
                                {!item.isPaid && <Link to={item.paymentLink} className='bg-primary px-4 py-1.5 mb-3 text-sm rounded-full font-medium cursor-pointer'>Pay Now</Link>}
                            </div>
                            <div className='text-sm'>
                                <p><span className='text-gray-400'>Total Tickets:</span> {item.bookedSeats.length}</p>
                                <p><span className='text-gray-400'>Seat Numbers:</span> {item.bookedSeats.join(", ")}</p>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <p className='text-gray-400 mt-8'>You have no bookings yet.</p>
            )}
        </div>
    );
};

export default MyBookings;