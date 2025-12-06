import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { createEvents, EventAttributes } from "ics";
import { writeFileSync, unlinkSync } from "fs";
import path from "path";

interface ActivityConfig {
    title: string;
    startHour: number;
    startMinute: number;
    duration: { hours: number; minutes: number };
    description: string;
    color?: string;
    daysOfWeek?: number[]; // 0-6 (Sunday-Saturday), undefined means every day
    skipDays?: number[]; // Specific dates to skip (day of month)
}

interface ICSConfig {
    year: number;
    month: number;
    startDay?: number;
    endDay?: number;
    timezone?: string;
    filename?: string;
}

interface GenerateICSPayload {
    config: ICSConfig;
    activities: ActivityConfig[];
}

/**
 * @description Generate ICS file with custom events and configurations
 * @route POST /api/v1/ics/generate
 * @access Private
 */
const generateICS = asyncHandler(async (req, res) => {
    try {
        const { config, activities }: GenerateICSPayload = req.body;

        // Validate required fields
        if (!config || !activities || !Array.isArray(activities)) {
            throw new ApiError(400, "Config and activities array are required");
        }

        if (!config.year || !config.month) {
            throw new ApiError(400, "Year and month are required in config");
        }

        // Set defaults
        const finalConfig = {
            startDay: 1,
            endDay: 31,
            timezone: 'UTC',
            filename: `calendar_${config.year}_${config.month.toString().padStart(2, '0')}.ics`,
            ...config
        };

        // Validate month and day ranges
        const daysInMonth = new Date(finalConfig.year, finalConfig.month, 0).getDate();
        if (finalConfig.startDay < 1 || finalConfig.endDay > daysInMonth) {
            throw new ApiError(400, `Invalid day range. Month ${finalConfig.month} has ${daysInMonth} days`);
        }

        // Generate events for the specified period
        const events: EventAttributes[] = [];

        for (let day = finalConfig.startDay; day <= finalConfig.endDay; day++) {
            const currentDate = new Date(finalConfig.year, finalConfig.month - 1, day);
            const dayOfWeek = currentDate.getDay();

            activities.forEach(activity => {
                // Check if activity should run on this day
                if (activity.daysOfWeek && !activity.daysOfWeek.includes(dayOfWeek)) {
                    return; // Skip this activity for this day
                }

                if (activity.skipDays && activity.skipDays.includes(day)) {
                    return; // Skip this activity for this specific day
                }

                let eventDay = day;
                const eventHour = activity.startHour;
                const eventMinute = activity.startMinute;

                // Handle midnight events (next day)
                if (activity.startHour === 0) {
                    eventDay = day + 1;
                    // Skip if next day exceeds month
                    if (eventDay > daysInMonth) {return;}
                }

                events.push({
                    title: activity.title,
                    start: [finalConfig.year, finalConfig.month, eventDay, eventHour, eventMinute] as [number, number, number, number, number],
                    duration: activity.duration,
                    description: activity.description,
                    categories: [activity.title.split(' ')[0]], // Use first word as category
                    status: 'CONFIRMED',
                    busyStatus: activity.title.toLowerCase().includes('work') || 
                               activity.title.toLowerCase().includes('study') || 
                               activity.title.toLowerCase().includes('meeting') ? 'BUSY' : 'FREE',
                    organizer: { name: 'Calendar Generator', email: 'calendar@example.com' },
                });
            });
        }

        if (events.length === 0) {
            throw new ApiError(400, "No events generated. Please check your configuration.");
        }

        // Create ICS file
        createEvents(events, (error, value) => {
            if (error) {
                throw new ApiError(500, `Error creating ICS file: ${error.message}`);
            }

            const filePath = path.join(process.cwd(), finalConfig.filename);
            writeFileSync(filePath, value);

            // Send file as response
            res.setHeader('Content-Type', 'text/calendar');
            res.setHeader('Content-Disposition', `attachment; filename="${finalConfig.filename}"`);
            res.send(value);

            // Clean up file after sending
            setTimeout(() => {
                try {
                    unlinkSync(filePath);
                } catch (cleanupError) {
                    console.error('Error cleaning up ICS file:', cleanupError);
                }
            }, 1000);
        });

    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, "Something went wrong while generating ICS file");
    }
});

/**
 * @description Get sample configuration for ICS generation
 * @route GET /api/v1/ics/sample-config
 * @access Private
 */
const getSampleConfig = asyncHandler(async (req, res) => {
    const sampleConfig = {
        config: {
            year: 2025,
            month: 7,
            startDay: 1,
            endDay: 31,
            timezone: 'Asia/Kolkata',
            filename: 'my_calendar.ics'
        },
        activities: [
            {
                title: '🌅 Wake up & Freshen up',
                startHour: 7,
                startMinute: 0,
                duration: { hours: 0, minutes: 45 },
                description: 'Start your day with energy and positivity',
                color: '#FF6B6B',
                daysOfWeek: [1, 2, 3, 4, 5] // Monday to Friday only
            },
            {
                title: '📚 Read book / News',
                startHour: 7,
                startMinute: 45,
                duration: { hours: 0, minutes: 15 },
                description: 'Light reading or current affairs to stay informed',
                color: '#4ECDC4'
            },
            {
                title: '💼 Interview Prep',
                startHour: 8,
                startMinute: 0,
                duration: { hours: 2, minutes: 0 },
                description: 'Core study session for interview preparation',
                color: '#45B7D1',
                daysOfWeek: [1, 2, 3, 4, 5] // Weekdays only
            },
            {
                title: '🍳 Breakfast & Family Time',
                startHour: 10,
                startMinute: 0,
                duration: { hours: 1, minutes: 0 },
                description: 'Enjoy breakfast with family',
                color: '#96CEB4'
            },
            {
                title: '💻 Work Hours',
                startHour: 11,
                startMinute: 0,
                duration: { hours: 9, minutes: 0 },
                description: 'Professional work hours',
                color: '#FFEAA7',
                daysOfWeek: [1, 2, 3, 4, 5] // Weekdays only
            },
            {
                title: '👨‍👩‍👧‍👦 Family Time',
                startHour: 20,
                startMinute: 0,
                duration: { hours: 2, minutes: 0 },
                description: 'Quality time with family',
                color: '#DDA0DD'
            },
            {
                title: '📖 Study Session',
                startHour: 22,
                startMinute: 0,
                duration: { hours: 2, minutes: 0 },
                description: 'Evening study session',
                color: '#98D8C8',
                daysOfWeek: [1, 2, 3, 4, 5] // Weekdays only
            },
            {
                title: '🎮 Social / Entertainment',
                startHour: 0,
                startMinute: 0,
                duration: { hours: 1, minutes: 0 },
                description: 'Relaxation and entertainment time',
                color: '#F7DC6F',
                daysOfWeek: [5, 6] // Friday and Saturday only
            }
        ]
    };

    return res.status(200).json(
        new ApiResponse(200, sampleConfig, "Sample configuration retrieved successfully")
    );
});

export { generateICS, getSampleConfig }; 