import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { createServiceRoleClient } from '@/lib/supabase/server';

export interface ProfileData {
  name: string;
  headline?: string;
  location?: string;
  about?: string;
  experience?: Array<{
    title: string;
    company: string;
    duration?: string;
    description?: string;
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    field?: string;
  }>;
  skills?: string[];
  recommendations?: number;
  connections?: string;
  profileUrl: string;
  scrapedAt: Date;
}

export class LinkedInScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private supabase: any;

  constructor() {
    this.initializeSupabase();
  }

  private async initializeSupabase() {
    this.supabase = await createServiceRoleClient();
  }

  async initialize() {
    if (this.browser) return;

    // Get LinkedIn session from database
    const { data: session } = await this.supabase
      .from('linkedin_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    this.browser = await chromium.launch({
      headless: false, // Set to true in production
      args: ['--disable-blink-features=AutomationControlled']
    });

    if (session?.cookies) {
      // Create context with saved cookies
      this.context = await this.browser.newContext({
        storageState: session.cookies
      });
    } else {
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
    }
  }

  async scrapeProfile(profileUrl: string): Promise<ProfileData | null> {
    try {
      await this.initialize();

      const page = await this.context!.newPage();

      // Add random delay to mimic human behavior
      await this.randomDelay(1000, 3000);

      // Navigate to profile
      await page.goto(profileUrl, { waitUntil: 'networkidle' });

      // Check if we're logged in
      if (page.url().includes('/login') || page.url().includes('/checkpoint')) {
        console.log('Not logged in to LinkedIn');
        await page.close();
        return null;
      }

      // Wait for profile to load
      await page.waitForSelector('[class*="text-heading-xlarge"]', { timeout: 10000 });

      // Scrape profile data
      const profileData = await page.evaluate(() => {
        const getText = (selector: string): string => {
          const element = document.querySelector(selector);
          return element?.textContent?.trim() || '';
        };

        const getTextAll = (selector: string): string[] => {
          const elements = document.querySelectorAll(selector);
          return Array.from(elements).map(el => el.textContent?.trim() || '').filter(Boolean);
        };

        // Get name
        const name = getText('[class*="text-heading-xlarge"]');

        // Get headline
        const headline = getText('[class*="text-body-medium break-words"]');

        // Get location
        const location = getText('[class*="text-body-small inline t-black--light break-words"]');

        // Get about section
        const aboutSection = document.querySelector('#about')?.parentElement;
        const about = aboutSection?.querySelector('[class*="inline-show-more-text"]')?.textContent?.trim();

        // Get experience
        const experienceSection = document.querySelector('#experience')?.parentElement;
        const experienceItems = experienceSection?.querySelectorAll('[class*="display-flex flex-column full-width align-self-center"]') || [];

        const experience = Array.from(experienceItems).map(item => {
          const titleElement = item.querySelector('[class*="t-bold"]');
          const companyElement = item.querySelector('[class*="t-14 t-normal"]');
          const durationElement = item.querySelector('[class*="t-14 t-normal t-black--light"]');
          const descElement = item.querySelector('[class*="inline-show-more-text"]');

          return {
            title: titleElement?.textContent?.trim() || '',
            company: companyElement?.textContent?.trim().split(' · ')[0] || '',
            duration: durationElement?.textContent?.trim() || '',
            description: descElement?.textContent?.trim() || ''
          };
        }).filter(exp => exp.title);

        // Get education
        const educationSection = document.querySelector('#education')?.parentElement;
        const educationItems = educationSection?.querySelectorAll('[class*="display-flex flex-column full-width align-self-center"]') || [];

        const education = Array.from(educationItems).map(item => {
          const schoolElement = item.querySelector('[class*="t-bold"]');
          const degreeElement = item.querySelector('[class*="t-14 t-normal"]');

          const degreeText = degreeElement?.textContent?.trim() || '';
          const [degree, field] = degreeText.split(',').map(s => s.trim());

          return {
            school: schoolElement?.textContent?.trim() || '',
            degree: degree || '',
            field: field || ''
          };
        }).filter(edu => edu.school);

        // Get skills
        const skillsSection = document.querySelector('#skills')?.parentElement;
        const skillElements = skillsSection?.querySelectorAll('[class*="t-bold"]') || [];
        const skills = Array.from(skillElements)
          .map(el => el.textContent?.trim() || '')
          .filter(skill => skill && !skill.includes('endorsement'));

        // Get connections count
        const connectionsText = Array.from(document.querySelectorAll('span'))
          .find(el => el.textContent?.includes('connections'))?.textContent?.trim() || '';

        return {
          name,
          headline,
          location,
          about,
          experience,
          education,
          skills,
          connections: connectionsText
        };
      });

      await page.close();

      const fullProfileData: ProfileData = {
        ...profileData,
        profileUrl,
        scrapedAt: new Date()
      };

      // Save to database
      await this.saveProfileData(profileUrl, fullProfileData);

      return fullProfileData;

    } catch (error) {
      console.error('Error scraping profile:', error);
      return null;
    }
  }

  private async saveProfileData(profileUrl: string, profileData: ProfileData) {
    try {
      // Find connection by LinkedIn URL
      const { data: connection } = await this.supabase
        .from('connections')
        .select('id')
        .eq('linkedin_url', profileUrl)
        .single();

      if (connection) {
        // Save raw profile data
        await this.supabase
          .from('profile_raw')
          .upsert({
            connection_id: connection.id,
            raw_data: profileData,
            scraped_at: profileData.scrapedAt
          });

        // Update connection with latest data
        await this.supabase
          .from('connections')
          .update({
            headline: profileData.headline,
            location: profileData.location,
            company: profileData.experience?.[0]?.company,
            last_scraped_at: profileData.scrapedAt
          })
          .eq('id', connection.id);
      }
    } catch (error) {
      console.error('Error saving profile data:', error);
    }
  }

  private async randomDelay(min: number, max: number) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async close() {
    if (this.context) {
      // Save cookies for next session
      const storageState = await this.context.storageState();

      await this.supabase
        .from('linkedin_sessions')
        .insert({
          cookies: storageState,
          created_at: new Date().toISOString()
        });

      await this.context.close();
    }

    if (this.browser) {
      await this.browser.close();
    }

    this.browser = null;
    this.context = null;
  }

  // Batch scraping with rate limiting
  async scrapeMultipleProfiles(profileUrls: string[], delayBetween: number = 5000): Promise<ProfileData[]> {
    const results: ProfileData[] = [];

    for (const url of profileUrls) {
      const profile = await this.scrapeProfile(url);
      if (profile) {
        results.push(profile);
      }

      // Add delay between profiles to avoid rate limiting
      if (profileUrls.indexOf(url) < profileUrls.length - 1) {
        await this.randomDelay(delayBetween, delayBetween + 2000);
      }
    }

    return results;
  }
}