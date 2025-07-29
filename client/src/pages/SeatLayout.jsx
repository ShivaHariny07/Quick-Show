import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { assets } from "../assets/assets";
import Loading from "../components/Loading";
import { ArrowRightIcon, ClockIcon } from "lucide-react";
import isoTimeFormat from "../lib/isoTimeFormat";
import BlurCircle from "../components/BlurCircle";
import toast from "react-hot-toast";
import { useAppContext } from "../context/AppContext";

const SeatLayout = () => {
    const groupRows = [["A", "B"], ["C", "D"], ["E", "F"], ["G", "H"], ["I", "J"]];
    const { id, date } = useParams();
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [selectedTime, setSelectedTime] = useState(null);
    const [showDetails, setShowDetails] = useState(null);
    const [occupiedSeats, setOccupiedSeats] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const { axios, getToken, user } = useAppContext();

    const getShowDetails = async () => {
        try {
            const { data } = await axios.get(`/api/show/${id}`);
            if (data.success) {
                setShowDetails(data);
            } else {
                toast.error("Failed to load show details");
            }
        } catch (error) {
            toast.error("Failed to load show details");
        }
    };

    const getOccupiedSeats = async (timeInfo) => {
        if (!timeInfo?.showId) return;
        setIsLoading(true);
        try {
            const { data } = await axios.get(`/api/booking/seats/${timeInfo.showId}`);
            if (data.success) {
                setOccupiedSeats(data.occupiedSeats || {});
                setSelectedSeats([]);
            }
        } catch (error) {
            toast.error("Failed to fetch seat availability");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTimeSelection = (timeInfo) => {
        if(selectedTime?.showId !== timeInfo.showId) {
            setSelectedTime(timeInfo);
        }
    };

    const handleSeatClick = (seatId) => {
        if (!selectedTime) return toast("Please select a show time first");
        if (occupiedSeats[seatId]) return toast.error("This seat is already booked");

        setSelectedSeats(prev => {
            if (prev.includes(seatId)) {
                return prev.filter(seat => seat !== seatId);
            }
            if (prev.length >= 10) {
                toast.error("You can select up to 10 seats");
                return prev;
            }
            return [...prev, seatId];
        });
    };

    const bookTickets = async () => {
        if (!user) return toast.error("Please login to proceed");
        if (!selectedTime || !selectedTime.showId) {
            return toast.error("Please select a show time");
        }
        if (selectedSeats.length === 0) return toast.error("Please select at least one seat");

        setIsLoading(true);
        try {
            const { data } = await axios.post("/api/booking/create",
                { showId: selectedTime.showId, selectedSeats },
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            );
            if (data.success) {
                window.location.href = data.url;
            } else {
                toast.error(data.message || "Booking failed");
                if (data.unavailableSeats) {
                    getOccupiedSeats(selectedTime);
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Booking failed");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        getShowDetails();
        window.scrollTo(0, 0);
    }, [id, date]);

    useEffect(() => {
        if(selectedTime) {
            getOccupiedSeats(selectedTime);
        } else if (showDetails && date) {
            const availableTimes = showDetails.dateTime?.[date];
            if (availableTimes && availableTimes.length > 0) {
                setSelectedTime(availableTimes[0]);
            } else {
                setSelectedTime(null);
                setOccupiedSeats({});
            }
        }
    }, [selectedTime, showDetails, date]);

    if (!showDetails) return <Loading />;

    const timingList = (showDetails && date && showDetails.dateTime?.[date]) || [];

    function renderSeats(row, count = 9) {
        return (
            <div key={row} className="flex gap-2 mt-2">
                <div className="flex flex-wrap items-center justify-center gap-2">
                    {Array.from({ length: count }, (_, i) => {
                        const seatId = `${row}${i + 1}`;
                        const isSelected = selectedSeats.includes(seatId);
                        const isOccupied = !!occupiedSeats[seatId];
                        return (
                            <button key={seatId} onClick={() => handleSeatClick(seatId)} disabled={isOccupied} className={`h-8 w-8 rounded border border-primary/60 cursor-pointer flex items-center justify-center text-xs ${isSelected ? "bg-primary text-white" : ""} ${isOccupied ? "bg-gray-500 cursor-not-allowed opacity-50" : "hover:bg-primary/20"}`}>
                                {seatId}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-30 md:pt-50">
            <div className="w-60 bg-primary/10 border border-primary/20 rounded-lg py-10 h-max md:sticky md:top-30">
                <p className="text-lg font-semibold px-6">Available Timings</p>
                <div className="mt-5 space-y-1">
                    {timingList.length > 0 ? (
                        timingList.map((item) => (
                            <button key={item.showId} onClick={() => handleTimeSelection(item)} className={`flex items-center gap-2 px-6 py-2 w-full rounded-r-md cursor-pointer transition ${selectedTime?.showId === item.showId ? "bg-primary text-white" : "hover:bg-primary/20"}`}>
                                <ClockIcon className="w-4 h-4" />
                                <p className="text-sm">{isoTimeFormat(item.time)}</p>
                            </button>
                        ))
                    ) : (
                        <p className="p-6 text-sm text-gray-400">No shows for this date</p>
                    )}
                </div>
            </div>

            <div className="relative flex-1 flex flex-col items-center max-md:mt-16">
                <BlurCircle top="-100px" left="-100px" />
                <BlurCircle bottom="0" right="0" />
                <h1 className="text-2xl font-semibold mb-4">Select your seats</h1>
                <img src={assets.screenImage} alt="screen" className="w-full max-w-md" />
                <p className="text-gray-400 text-sm mb-6">SCREEN THIS WAY</p>
                <div className="flex flex-col items-center mt-10 text-xs text-gray-300">
                    <div className="grid grid-cols-1 gap-2 mb-6">
                        {groupRows[0].map(row => renderSeats(row))}
                    </div>
                    <div className="grid grid-cols-2 gap-11">
                        {groupRows.slice(1).map((group, idx) => (
                            <div key={idx}>{group.map(row => renderSeats(row))}</div>
                        ))}
                    </div>
                </div>
                <div className="mt-10 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2"><div className="h-4 w-4 rounded bg-primary"></div><span>Selected</span></div>
                        <div className="flex items-center gap-2"><div className="h-4 w-4 rounded border border-primary/60"></div><span>Available</span></div>
                        <div className="flex items-center gap-2"><div className="h-4 w-4 rounded bg-gray-500 opacity-50"></div><span>Booked</span></div>
                    </div>
                    {selectedSeats.length > 0 && <p className="text-primary font-medium">Seats: {selectedSeats.join(", ")}</p>}
                    <button onClick={bookTickets} disabled={isLoading || selectedSeats.length === 0} className={`flex items-center gap-1 mt-6 px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed`}>
                        {isLoading ? "Processing..." : `Pay ₹${(selectedSeats.length * (selectedTime?.price || 0))}`}
                        {!isLoading && <ArrowRightIcon strokeWidth={3} className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SeatLayout;