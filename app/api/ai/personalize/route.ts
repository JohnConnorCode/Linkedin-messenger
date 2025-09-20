import { NextRequest, NextResponse } from 'next/server';
import { createServerActionClient } from '@/lib/supabase/server';
import { PersonalizationService } from '@/lib/ai/personalization-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerActionClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { connectionId, templateId, tone = 'professional', campaignId } = body;

    if (!connectionId || !templateId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get connection data
    const { data: connection, error: connError } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Get template data
    const { data: template, error: templateError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', templateId)
      .eq('user_id', user.id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Get profile data if available
    const { data: profileRaw } = await supabase
      .from('profile_raw')
      .select('*')
      .eq('connection_id', connectionId)
      .single();

    // Prepare profile data
    const profileData = profileRaw?.metadata || {
      name: connection.name,
      headline: connection.headline,
      company: connection.company,
      title: connection.title
    };

    // Initialize personalization service
    const personalizationService = new PersonalizationService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate personalization
    const personalization = await personalizationService.generatePersonalization({
      profileData,
      templateBody: template.body,
      tone: tone as any,
      campaignContext: template.description,
      variables: template.variables
    });

    // Save to database
    const { data: saved, error: saveError } = await supabase
      .from('profile_ai_summaries')
      .upsert({
        user_id: user.id,
        connection_id: connectionId,
        template_id: templateId,
        campaign_id: campaignId,
        tone,
        persona: personalization.persona,
        summary: personalization.summary,
        first_line: personalization.firstLine,
        midline: personalization.midline,
        custom_variables: personalization.variables,
        risk_flags: personalization.riskFlags,
        confidence_score: personalization.confidence,
        model: 'gpt-5-nano',
        validator_status: personalization.riskFlags.length === 0 ? 'approved' : 'flagged',
        input_hash: `${connectionId}-${templateId}-${tone}`,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('Save error:', saveError);
      return NextResponse.json(
        { error: 'Failed to save personalization' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: saved,
      personalization
    });

  } catch (error) {
    console.error('AI personalization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerActionClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Missing connection ID' },
        { status: 400 }
      );
    }

    // Get latest AI summary for connection
    const { data, error } = await supabase
      .from('profile_ai_summaries')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { message: 'No AI summary found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ data });

  } catch (error) {
    console.error('Get AI summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}