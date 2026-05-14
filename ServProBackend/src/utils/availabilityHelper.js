const { Availability } = require("../models/Availability");

/**
 * Check if a provider is available at a specific date and time
 * @param {string} providerId - The provider's user ID
 * @param {Date|string} expectedAt - The requested booking date/time
 * @returns {Promise<{available: boolean, message: string, availability?: Object}>}
 */
const checkProviderAvailability = async (providerId, expectedAt) => {
  try {
    // Parse the date
    const bookingDate = new Date(expectedAt);
    if (isNaN(bookingDate.getTime())) {
      return {
        available: false,
        message: "Invalid date/time format",
      };
    }

    // Get the day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayOfWeek = bookingDate.getDay();

    // Get the time in HH:mm format
    const hours = String(bookingDate.getHours()).padStart(2, "0");
    const minutes = String(bookingDate.getMinutes()).padStart(2, "0");
    const bookingTime = `${hours}:${minutes}`;

    // Find availability for the provider on this day
    const availability = await Availability.findOne({
      provider: providerId,
      day: dayOfWeek,
    }).lean();

    if (!availability) {
      return {
        available: false,
        message: `Provider is not available on ${getDayName(dayOfWeek)}`,
      };
    }

    // Check if the booking time falls within the available time range
    const isTimeInRange = bookingTime >= availability.start && bookingTime <= availability.end;

    if (!isTimeInRange) {
      return {
        available: false,
        message: `Provider is available on ${getDayName(dayOfWeek)} from ${availability.start} to ${availability.end}, but requested time is ${bookingTime}`,
        availability,
      };
    }

    return {
      available: true,
      message: "Provider is available at the requested time",
      availability,
    };
  } catch (error) {
    return {
      available: false,
      message: `Error checking availability: ${error.message}`,
    };
  }
};

/**
 * Get all available time slots for a provider on a specific day
 * @param {string} providerId - The provider's user ID
 * @param {number} dayOfWeek - Day of week (0-6, where 0 is Sunday)
 * @returns {Promise<{available: boolean, startTime?: string, endTime?: string}>}
 */
const getProviderAvailabilityForDay = async (providerId, dayOfWeek) => {
  try {
    const availability = await Availability.findOne({
      provider: providerId,
      day: dayOfWeek,
    }).lean();

    if (!availability) {
      return {
        available: false,
        message: `Provider is not available on ${getDayName(dayOfWeek)}`,
      };
    }

    return {
      available: true,
      dayName: getDayName(dayOfWeek),
      startTime: availability.start,
      endTime: availability.end,
      availabilityId: availability._id,
    };
  } catch (error) {
    return {
      available: false,
      message: `Error fetching availability: ${error.message}`,
    };
  }
};

/**
 * Get all availability records for a provider
 * @param {string} providerId - The provider's user ID
 * @returns {Promise<Array>} Array of availability objects
 */
const getProviderAllAvailabilities = async (providerId) => {
  try {
    const availabilities = await Availability.find({
      provider: providerId,
    })
      .select("day start end")
      .lean()
      .sort({ day: 1 });

    return availabilities.map((avail) => ({
      ...avail,
      dayName: getDayName(avail.day),
    }));
  } catch (error) {
    console.error("Error fetching provider availabilities:", error);
    return [];
  }
};

/**
 * Helper function to convert day index to day name
 * @param {number} dayIndex - Day index (0-6)
 * @returns {string} Day name
 */
const getDayName = (dayIndex) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[dayIndex] || "Unknown";
};

/**
 * Helper function to convert day name to day index
 * @param {string} dayName - Day name
 * @returns {number} Day index (0-6)
 */
const getDayIndex = (dayName) => {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const index = days.indexOf(dayName.toLowerCase());
  return index >= 0 ? index : -1;
};

module.exports = {
  checkProviderAvailability,
  getProviderAvailabilityForDay,
  getProviderAllAvailabilities,
  getDayName,
  getDayIndex,
};
