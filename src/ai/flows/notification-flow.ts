
'use server';
/**
 * @fileOverview A flow for sending notifications when a bin level is high.
 *
 * - sendHighLevelNotification - A function that generates an email notification.
 * - HighLevelNotificationInput - The input type for the notification function.
 * - HighLevelNotificationOutput - The return type for the notification function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { format } from 'date-fns';

const HighLevelNotificationInputSchema = z.object({
  userEmail: z.string().describe('The email address of the user to notify.'),
  binName: z.string().describe('The name of the bin.'),
  binLocation: z.string().describe('The location of the bin.'),
  level: z.number().describe('The current fill level percentage of the bin.'),
  weight: z.number().describe('The current weight in the bin (in grams).'),
  timestamp: z.number().describe('The Unix timestamp of the high-level reading.'),
});
export type HighLevelNotificationInput = z.infer<typeof HighLevelNotificationInputSchema>;

const HighLevelNotificationOutputSchema = z.object({
    subject: z.string().describe('The subject line for the notification email.'),
    body: z.string().describe('The HTML body content for the notification email.'),
});
export type HighLevelNotificationOutput = z.infer<typeof HighLevelNotificationOutputSchema>;


export async function sendHighLevelNotification(input: HighLevelNotificationInput): Promise<HighLevelNotificationOutput> {
  // In a real app, this would use a service like SendGrid or Nodemailer.
  // For this prototype, we'll generate the email content and log it.
  const output = await notificationFlow(input);
  console.log(`
    ==================== EMAIL NOTIFICATION ====================
    TO: ${input.userEmail}
    SUBJECT: ${output.subject}
    ------------------------------------------------------------
    BODY:
    ${output.body}
    ============================================================
  `);
  return output;
}

const prompt = ai.definePrompt({
  name: 'highLevelNotificationPrompt',
  input: {schema: HighLevelNotificationInputSchema},
  output: {schema: HighLevelNotificationOutputSchema},
  prompt: `
    You are an intelligent assistant for a smart waste management system called WeightWise.
    Your task is to generate a professional and urgent email notification.

    A waste bin has exceeded 90% of its capacity and needs to be emptied as soon as possible.

    Generate a subject line and an HTML email body using the following information:
    - Bin Name: {{{binName}}}
    - Bin Location: {{{binLocation}}}
    - Current Fill Level: {{{level}}}%
    - Current Weight: {{weightKg}} kg
    - Time of Reading: {{formattedTime}}

    The email should be addressed to the system user. It must be clear, concise, and professional.
    The tone should be urgent but not alarming.
    The subject line should be attention-grabbing, like "URGENT: Waste Bin '{binName}' Needs Emptying".
    The body should present the details in a clean, readable format (e.g., using a list or a small table).
    Conclude by instructing the user to arrange for the bin to be emptied promptly.
  `,
});

const notificationFlow = ai.defineFlow(
  {
    name: 'notificationFlow',
    inputSchema: HighLevelNotificationInputSchema,
    outputSchema: HighLevelNotificationOutputSchema,
  },
  async (input) => {
     const formattedTime = format(new Date(input.timestamp), "PPp"); // e.g., "July 25, 2024 at 3:30 PM"
     const weightInKg = (input.weight / 1000).toFixed(1);

    const {output} = await prompt({
        ...input,
        formattedTime: formattedTime,
        weightKg: weightInKg,
    });
    return output!;
  }
);
