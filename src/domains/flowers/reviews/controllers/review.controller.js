/**
 * Review Controller (Flowers Domain)
 * Handles Google Reviews fetching and caching
 */
import axios from 'axios';
import { asyncHandler } from '../../../../shared/common/utils/errorHandler.js';

// Simple in-memory cache
let reviewsCache = {
    data: null,
    timestamp: 0,
};

// Cache duration: 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// Mock Data (Fallback)
const MOCK_REVIEWS = [
    {
        author_name: "Sarah Johnson",
        relative_time_description: "2 days ago",
        rating: 5,
        text: "Absolutely stunning bouquet! The flowers were fresh and arranged beautifully. Delivery was prompt too.",
        profile_photo_url: "https://randomuser.me/api/portraits/women/1.jpg"
    },
    {
        author_name: "Michael Chen",
        relative_time_description: "1 week ago",
        rating: 5,
        text: "Great experience ordering from Flower Emporium. The cake was delicious and the presentation was top notch.",
        profile_photo_url: "https://randomuser.me/api/portraits/men/2.jpg"
    },
    {
        author_name: "Emily Davis",
        relative_time_description: "2 weeks ago",
        rating: 4,
        text: "Lovely flowers, very fragrant. Just wished the delivery window was a bit tighter, but otherwise perfect.",
        profile_photo_url: "https://randomuser.me/api/portraits/women/3.jpg"
    },
    {
        author_name: "Ahmed Al-Sayed",
        relative_time_description: "3 weeks ago",
        rating: 5,
        text: "Best florist in town. I order here for every occasion and they never disappoint. Highly recommended!",
        profile_photo_url: "https://randomuser.me/api/portraits/men/4.jpg"
    }
];

/**
 * @route   GET /api/flowers/reviews
 * @desc    Get Google Reviews (Cached or Mock)
 * @access  Public
 */
export const getGoogleReviews = asyncHandler(async (req, res, next) => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    const placeId = process.env.GOOGLE_PLACE_ID;

    // 1. Check Cache
    const now = Date.now();
    if (reviewsCache.data && (now - reviewsCache.timestamp < CACHE_DURATION)) {
        console.log('Serving reviews from cache');
        return res.status(200).json({
            success: true,
            source: 'cache',
            data: reviewsCache.data
        });
    }

    // 2. If API Key & Place ID exist, fetch from Google
    if (apiKey && placeId) {
        try {
            console.log('Fetching reviews from Google Places API...');
            const response = await axios.get(
                `https://maps.googleapis.com/maps/api/place/details/json`,
                {
                    params: {
                        place_id: placeId,
                        fields: 'reviews,rating,user_ratings_total',
                        key: apiKey,
                        language: 'en' // Force English reviews if preferred
                    }
                }
            );

            if (response.data.status === 'OK') {
                const result = response.data.result;

                // Update Cache
                reviewsCache = {
                    data: {
                        reviews: result.reviews || [],
                        rating: result.rating,
                        user_ratings_total: result.user_ratings_total
                    },
                    timestamp: now
                };

                return res.status(200).json({
                    success: true,
                    source: 'api',
                    data: reviewsCache.data
                });
            } else {
                console.error('Google API Error:', response.data.status, response.data.error_message);
                // Fallback to mock if API Request fails (but valid key/id)
            }

        } catch (error) {
            console.error('Failed to fetch from Google Places API:', error.message);
            // Fallback to mock on network error
        }
    } else {
        console.log('Google credentials missing. Usage Mock Data.');
    }

    // 3. Fallback: Return Mock Data
    // Construct mock data in same shape as Google API result
    const mockData = {
        reviews: MOCK_REVIEWS,
        rating: 4.9,
        user_ratings_total: 128
    };

    res.status(200).json({
        success: true,
        source: 'mock',
        data: mockData
    });
});
