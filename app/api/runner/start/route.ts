import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

let runnerProcess: any = null;

export async function POST(request: Request) {
  try {
    const { debug = false } = await request.json();

    // Check if runner is already running
    if (runnerProcess && !runnerProcess.killed) {
      return NextResponse.json({
        error: 'Runner is already running'
      }, { status: 400 });
    }

    // Check if session exists
    const sessionPath = path.join(process.cwd(), 'runner', 'linkedin-session.json');
    try {
      await fs.access(sessionPath);
    } catch {
      return NextResponse.json({
        error: 'LinkedIn session not configured'
      }, { status: 400 });
    }

    // Start the runner process
    const runnerPath = path.join(process.cwd(), 'runner', 'index-production.js');
    const env = {
      ...process.env,
      NODE_ENV: debug ? 'development' : 'production',
      HEADLESS_MODE: debug ? 'false' : 'true',
      DEBUG: debug ? 'true' : 'false'
    };

    runnerProcess = spawn('node', [runnerPath], {
      env,
      cwd: path.join(process.cwd(), 'runner'),
      detached: false,
      stdio: 'pipe'
    });

    // Log process output
    runnerProcess.stdout.on('data', (data: Buffer) => {
      console.log(`Runner: ${data.toString()}`);
    });

    runnerProcess.stderr.on('data', (data: Buffer) => {
      console.error(`Runner Error: ${data.toString()}`);
    });

    runnerProcess.on('close', (code: number) => {
      console.log(`Runner process exited with code ${code}`);
      runnerProcess = null;
    });

    // Update database status
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase.from('runner_status').insert({
      status: 'running',
      started_at: new Date().toISOString(),
      pid: runnerProcess.pid,
      debug_mode: debug
    });

    return NextResponse.json({
      success: true,
      message: 'Runner started successfully',
      pid: runnerProcess.pid,
      mode: debug ? 'debug' : 'production'
    });

  } catch (error) {
    console.error('Failed to start runner:', error);
    return NextResponse.json({
      error: 'Failed to start runner',
      details: error.message
    }, { status: 500 });
  }
}