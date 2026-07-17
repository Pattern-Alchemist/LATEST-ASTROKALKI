import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Generate availability slots for the next 60 days
  // Business hours: 10 AM - 6 PM IST, 6 days a week (closed Sundays)
  const now = new Date();
  const slots = [];

  for (let day = 0; day < 60; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);

    // Skip Sundays (Sunday = 0)
    if (date.getUTCDay() === 0) continue;

    // Business hours: 10 AM to 6 PM IST
    // In UTC: 4:30 AM to 12:30 PM (IST is UTC+5:30)
    const startHour = 4; // 4:30 AM UTC = 10 AM IST
    const startMin = 30;
    const endHour = 13; // 12:30 PM UTC = 6 PM IST
    const endMin = 30;

    // Create slots for durations: 30, 60, 90 minutes
    // Slot every 30 minutes
    for (let hour = startHour; hour < endHour; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const slotStart = new Date(date);
        slotStart.setUTCHours(hour, min, 0, 0);

        // Skip if before current time
        if (slotStart < now) continue;

        // Create 30-min, 60-min, and 90-min slot options
        for (const duration of [30, 60, 90]) {
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + duration);

          // Only create if end time is within business hours
          if (slotEnd.getUTCHours() < endHour || 
              (slotEnd.getUTCHours() === endHour && slotEnd.getUTCMinutes() <= endMin)) {
            slots.push({
              start: slotStart,
              end: slotEnd,
              duration,
              status: 'open',
            });
          }
        }
      }
    }
  }

  console.log(`Creating ${slots.length} availability slots...`);

  // Create slots in batches to avoid memory issues
  const batchSize = 100;
  for (let i = 0; i < slots.length; i += batchSize) {
    const batch = slots.slice(i, i + batchSize);
    await prisma.availabilitySlot.createMany({
      data: batch,
    });
    console.log(`Created ${i + batch.length}/${slots.length} slots`);
  }

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
