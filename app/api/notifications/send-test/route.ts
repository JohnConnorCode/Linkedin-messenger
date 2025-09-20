import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { to, subject, message, targetName } = await request.json();

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In a production app, you would integrate with an email service like SendGrid, Resend, etc.
    // For now, we'll just log the test message and save it to the database
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Save the test message to a notifications table
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'test_message',
        title: subject || `Test Message for ${targetName}`,
        body: message,
        metadata: {
          targetName,
          sentTo: to,
          sentAt: new Date().toISOString(),
        },
        read: false,
      });

    if (error) {
      console.error('Failed to save notification:', error);
      return NextResponse.json(
        { error: 'Failed to send test message' },
        { status: 500 }
      );
    }

    // Log the test message
    console.log('Test Message Sent:', {
      to,
      subject,
      targetName,
      message,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Test message sent successfully',
      details: {
        to,
        targetName,
        messageLength: message.length,
      },
    });
  } catch (error) {
    console.error('Send test error:', error);
    return NextResponse.json(
      { error: 'Failed to send test message' },
      { status: 500 }
    );
  }
}