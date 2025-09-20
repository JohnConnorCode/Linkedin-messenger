import { getAIProcessor } from './ai-processor';

// Start AI processor when the module is loaded
if (typeof window === 'undefined') {
  // Only run on server and if environment is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('⚠️ AI Processor skipped - missing Supabase configuration');
  } else {
    try {
      const processor = getAIProcessor();

      // Start processing in the background
      processor.start()
        .then(() => {
          console.log('✅ AI Processor started successfully');
        })
        .catch((error) => {
          console.error('❌ Failed to start AI Processor:', error);
        });
    } catch (error) {
      console.error('❌ Failed to initialize AI Processor:', error);
    }
  }

  // Graceful shutdown
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
}

export {};