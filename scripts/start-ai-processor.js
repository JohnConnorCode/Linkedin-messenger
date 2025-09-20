#!/usr/bin/env node

// Start the AI processor worker
require('dotenv').config({ path: '.env.production' });

// Import using dynamic import for ES modules
async function startProcessor() {
  try {
    console.log('Starting AI Processor...');

    // Dynamic import for TypeScript module
    const { getAIProcessor } = await import('../lib/workers/ai-processor.ts');

    const processor = getAIProcessor();

    // Start processing
    await processor.start();
    console.log('✅ AI Processor started successfully');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('Shutting down AI Processor...');
      processor.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('Shutting down AI Processor...');
      processor.stop();
      process.exit(0);
    });

    // Keep process alive
    setInterval(() => {
      console.log(`AI Processor running... ${new Date().toISOString()}`);
    }, 60000); // Log every minute

  } catch (error) {
    console.error('Failed to start AI Processor:', error);
    process.exit(1);
  }
}

startProcessor();