import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { template, targetProfile } = await request.json();

    if (!template || !targetProfile) {
      return NextResponse.json(
        { error: 'Missing template or target profile' },
        { status: 400 }
      );
    }

    // Replace template variables with actual values
    let personalizedMessage = template;

    // Replace first name
    const firstName = targetProfile.name?.split(' ')[0] || 'there';
    personalizedMessage = personalizedMessage.replace(/\{first_name\}/gi, firstName);
    personalizedMessage = personalizedMessage.replace(/\{name\}/gi, targetProfile.name || '');

    // Replace company
    personalizedMessage = personalizedMessage.replace(
      /\{company\}/gi, 
      targetProfile.company_name || 'your company'
    );

    // Replace role/position
    personalizedMessage = personalizedMessage.replace(
      /\{role\}/gi, 
      targetProfile.position || 'your role'
    );
    personalizedMessage = personalizedMessage.replace(
      /\{position\}/gi, 
      targetProfile.position || 'your position'
    );

    // Replace location
    personalizedMessage = personalizedMessage.replace(
      /\{location\}/gi, 
      targetProfile.location || ''
    );

    // Replace headline
    personalizedMessage = personalizedMessage.replace(
      /\{headline\}/gi, 
      targetProfile.headline || ''
    );

    // Add AI-enhanced personalization if profile data exists
    if (targetProfile.profile_data) {
      // Extract key points from profile for enhanced personalization
      const { experience, skills, education } = targetProfile.profile_data;

      // Find mutual connections or interests
      if (experience?.length > 0) {
        const recentCompany = experience[0]?.company;
        personalizedMessage = personalizedMessage.replace(
          /\{recent_company\}/gi,
          recentCompany || ''
        );
      }

      // Add skill-based personalization
      if (skills?.length > 0) {
        const topSkill = skills[0];
        personalizedMessage = personalizedMessage.replace(
          /\{top_skill\}/gi,
          topSkill || ''
        );
      }
    }

    // Clean up any remaining placeholders
    personalizedMessage = personalizedMessage.replace(/\{[^}]+\}/g, '');

    // Calculate personalization score
    const originalPlaceholders = (template.match(/\{[^}]+\}/g) || []).length;
    const remainingPlaceholders = (personalizedMessage.match(/\{[^}]+\}/g) || []).length;
    const personalizationScore = originalPlaceholders > 0
      ? Math.round(((originalPlaceholders - remainingPlaceholders) / originalPlaceholders) * 100)
      : 0;

    return NextResponse.json({
      message: personalizedMessage,
      personalizationScore,
      targetName: targetProfile.name,
    });
  } catch (error) {
    console.error('Preview generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}