/**
 * Seed availability slots for the next 14 days.
 * Run: npx tsx scripts/seed-slots.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const DURATIONS = [30, 60, 90] as const;
const SLOTS_PER_DAY_PER_DURATION = 2;
const START_HOUR = 10; // 10 AM IST
const END_HOUR = 20;   // 8 PM IST

function addHours(date: Date, hours: number): Date {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

async function main() {
  console.log('Seeding availability slots...');

  const now = new Date();
  let created = 0;

  for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() + dayOffset);
    dayStart.setHours(START_HOUR, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(END_HOUR, 0, 0, 0);

    for (const duration of DURATIONS) {
      // Generate evenly spaced slots
      const slotCount = Math.min(
        SLOTS_PER_DAY_PER_DURATION,
        Math.floor((END_HOUR - START_HOUR) * 60 / duration)
      );

      for (let i = 0; i < slotCount; i++) {
        const totalMinutes = (END_HOUR - START_HOUR) * 60;
        const intervalMinutes = Math.floor(totalMinutes / (slotCount + 1));
        const startMinutes = START_HOUR * 60 + intervalMinutes * (i + 1);

        const slotStart = new Date(dayStart);
        slotStart.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

        const slotEnd = addHours(slotStart, duration / 60);

        // Skip if slot end goes past END_HOUR
        if (slotEnd.getHours() > END_HOUR) continue;

        // Check for overlapping slots
        const existing = await db.availabilitySlot.findFirst({
          where: {
            start: { lt: slotEnd },
            end: { gt: slotStart },
          },
        });

        if (!existing) {
          await db.availabilitySlot.create({
            data: {
              start: slotStart,
              end: slotEnd,
              duration,
              status: 'open',
            },
          });
          created++;
        }
      }
    }
  }

  console.log(`Done! Created ${created} availability slots.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());