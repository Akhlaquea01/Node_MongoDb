import { writeFileSync } from 'fs';
import { createEvents, EventAttributes } from 'ics';
import logger from './logger.js';

const icsLogger = logger.child({ module: 'ics-generator' });

// Configuration
const config = {
    year: 2025,
    month: 7, // July
    startDay: 1, // Start from 1st of the month
    endDay: 31, // End on 31st of the month
    timezone: 'Asia/Kolkata' // Adjust to your timezone
};

// Activity definitions with colors and descriptions
const activities = {
    wakeUp: {
        title: '🌅 Wake up & Freshen up',
        startHour: 7,
        startMinute: 0,
        duration: { hours: 0, minutes: 45 },
        description: 'Start your day with energy and positivity',
        color: '#FF6B6B' // Red
    },
    reading: {
        title: '📚 Read book / News',
        startHour: 7,
        startMinute: 45,
        duration: { hours: 0, minutes: 15 },
        description: 'Light reading or current affairs to stay informed',
        color: '#4ECDC4' // Teal
    },
    interviewPrep: {
        title: '💼 Interview Prep',
        startHour: 8,
        startMinute: 0,
        duration: { hours: 2, minutes: 0 },
        description: 'Core study session for interview preparation',
        color: '#45B7D1' // Blue
    },
    breakfast: {
        title: '🍳 Breakfast & Family Time',
        startHour: 10,
        startMinute: 0,
        duration: { hours: 1, minutes: 0 },
        description: 'Enjoy breakfast with family',
        color: '#96CEB4' // Green
    },
    work: {
        title: '💻 Work Hours',
        startHour: 11,
        startMinute: 0,
        duration: { hours: 9, minutes: 0 },
        description: 'Professional work hours',
        color: '#FFEAA7' // Yellow
    },
    familyTime: {
        title: '👨‍👩‍👧‍👦 Family Time',
        startHour: 20,
        startMinute: 0,
        duration: { hours: 2, minutes: 0 },
        description: 'Quality time with family',
        color: '#DDA0DD' // Plum
    },
    study: {
        title: '📖 Study Session',
        startHour: 22,
        startMinute: 0,
        duration: { hours: 2, minutes: 0 },
        description: 'Evening study session',
        color: '#98D8C8' // Mint
    },
    entertainment: {
        title: '🎮 Social / Entertainment',
        startHour: 0,
        startMinute: 0,
        duration: { hours: 1, minutes: 0 },
        description: 'Relaxation and entertainment time',
        color: '#F7DC6F' // Light Yellow
    }
};

// Generate events for the entire month
function generateMonthlyEvents(): EventAttributes[] {
    const events: EventAttributes[] = [];
    
    for (let day = config.startDay; day <= config.endDay; day++) {
        // Skip if day is invalid for the month
        if (day > 31) {break;}
        
        // Generate events for each day
        Object.values(activities).forEach(activity => {
            let eventDay = day;
            const eventHour = activity.startHour;
            const eventMinute = activity.startMinute;
            
            // Handle midnight events (next day)
            if (activity.startHour === 0) {
                eventDay = day + 1;
                // Skip if next day exceeds month
                if (eventDay > 31) {return;}
            }
            
            events.push({
                title: activity.title,
                start: [config.year, config.month, eventDay, eventHour, eventMinute] as [number, number, number, number, number],
                duration: activity.duration,
                description: activity.description,
                categories: [activity.title.split(' ')[0]], // Use emoji as category
                status: 'CONFIRMED',
                busyStatus: activity.title.includes('Work') || activity.title.includes('Study') ? 'BUSY' : 'FREE',
                organizer: { name: 'Your Daily Routine', email: 'routine@example.com' },
                // Note: ICS doesn't directly support colors, but we can add them as custom properties
                // or use categories for color coding in calendar applications
            });
        });
    }
    
    return events;
}

// Generate the calendar
const monthlyEvents = generateMonthlyEvents();

const monthStr = config.month.toString().padStart(2, '0');
icsLogger.info({ 
    year: config.year, 
    month: monthStr, 
    eventCount: monthlyEvents.length 
}, '📅 Generating calendar');

createEvents(monthlyEvents, (error, value) => {
    if (error) {
        icsLogger.error(error, '❌ Error creating ICS file');
        return;
    }
    
    const filename = `monthly_routine_${config.year}_${monthStr}.ics`;
    writeFileSync(filename, value);
    
    const activitySummary: Record<string, number> = {};
    Object.entries(activities).forEach(([key, activity]) => {
        const eventCount = monthlyEvents.filter(e => e.title === activity.title).length;
        activitySummary[activity.title] = eventCount;
    });
    
    icsLogger.info({
        filename,
        fileLocation: `${process.cwd()}/${filename}`,
        eventCount: monthlyEvents.length,
        days: config.endDay - config.startDay + 1,
        activitySummary
    }, '✅ ICS file created successfully');
});

// Export for use in other modules
export { generateMonthlyEvents, activities, config };
