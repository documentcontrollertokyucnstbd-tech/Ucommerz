const USER_COLS = "id, full_name, avatar_url, slug, rating, total_reviews, verified, location, bio";

/** PostgREST select string for bookings with service, seeker and provider relations. */
export const BOOKING_SELECT = `*, service:services(id, title, images, price, price_unit, category, location), seeker:users!bookings_seeker_id_fkey(${USER_COLS}), provider:users!bookings_provider_id_fkey(${USER_COLS})`;
