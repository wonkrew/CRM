import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Resend } from 'resend';
import ReminderEmail from '@/emails/reminder-email';
import { ObjectId } from 'mongodb';

// Gracefully fall back when the RESEND_API_KEY is missing (e.g., Vercel build or local build).
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : {
      emails: {
        // no-op stub so that code can still call resend.emails.send without crashing during build
        send: async () => ({ id: 'mock-email', stub: true }),
      },
    };

export async function GET(request) {
  // 1. Authenticate the request
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { db } = await connectToDatabase();

    // 2. Find reminders for today that haven't been sent
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow

    const reminders = await db.collection('followups').find({
      reminderAt: {
        $gte: today,
        $lt: tomorrow,
      },
      reminderSent: { $ne: true },
    }).toArray();

    if (reminders.length === 0) {
      return NextResponse.json({ message: 'No reminders to send today.' });
    }

    // 3. Process each reminder
    for (const reminder of reminders) {
      // Fetch lead and user details
      const lead = await db.collection('submissions').findOne({ _id: reminder.leadId });
      const user = await db.collection('users').findOne({ _id: reminder.userId });

      if (lead && user && user.email) {
        // Enrich lead object with some display data for the email
        const website = await db.collection('websites').findOne({ _id: lead.websiteId });
        const leadForEmail = {
            ...lead,
            name: lead.formData.name,
            email: lead.formData.email,
            source: website ? website.name : 'Unknown Website',
            submittedAt: lead.submittedAt
        };

        // Send email
        await resend.emails.send({
          from: 'FormTrack <onboarding@resend.dev>', // Replace with your desired from address
          to: [user.email],
          subject: `Reminder: Follow up with a lead`,
          react: ReminderEmail({ lead: leadForEmail, user }),
        });

        // 4. Mark reminder as sent
        await db.collection('followups').updateOne(
          { _id: reminder._id },
          { $set: { reminderSent: true } }
        );
      }
    }

    return NextResponse.json({ message: `Sent ${reminders.length} reminders.` });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 