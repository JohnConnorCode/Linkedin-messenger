/**
 * SuperDebate Outreach Configuration
 * Voice, audiences, facts, and message templates for SuperDebate.org outreach
 */

// John Thomas Connor's voice characteristics
export const JOHN_VOICE = {
  opener: 'Howdy',
  followUpOpener: 'Hey',
  warmPhrases: [
    'I hope you\'re doing amazing',
    'Hope you\'re having a great week',
    'Hope all is well',
  ],
  missionStatement: 'I\'m on a mission to save Western Civilization by building SuperDebate.org, a platform and league giving adults a real space to test ideas, sharpen thinking, and compete through structured debate.',
  signOff: 'Best, John Thomas Connor',
  shortSignOff: 'Best, John',
  softClose: 'if this resonates',
  referralAsk: 'or if anyone comes to mind who might want to support this mission',
};

// The four target audiences
export const AUDIENCES = {
  funder: {
    label: 'Funder',
    description: 'People who can financially support the mission: angel investors, VCs, grant-makers, event sponsors',
    signals: [
      'angel investor',
      'venture capital',
      'vc',
      'investor',
      'partner at',
      'managing director',
      'foundation',
      'grant',
      'philanthrop',
      'sponsor',
      'fund manager',
      'family office',
      'limited partner',
      'lp',
      'startup investor',
      'seed investor',
      'pre-seed',
    ],
    investmentInterests: [
      'community',
      'consumer',
      'sports',
      'esports',
      'media',
      'civic tech',
      'education',
      'ed-tech',
      'democracy',
      'network state',
      'libertarian',
    ],
    // MICRO-QUALIFIER: Mentions check size expectation + proof of traction to filter small checks
    cta: `We've run 6 events in Chicago, Portland, and Bali with ambassadors already committed in 5 cities. Raising $500K pre-seed to scale. If you back community or civic tech, I'd love 15 min. Deck: superdebate.org/pitch-deck`,
    // Secondary CTA for warm follow-up after positive response
    cta_warm: `Great to hear you're interested. We've got letters of intent from 3 investors and are closing in 3 weeks. Happy to send the data room or jump on a call—whatever works best for your process.`,
    includeDeck: true,
  },
  ambassador: {
    label: 'Ambassador',
    description: 'People who want to run local SuperDebate clubs in their city',
    signals: [
      'debate',
      'debater',
      'speech and debate',
      'forensics',
      'mock trial',
      'model un',
      'model united nations',
      'mun',
      'community organizer',
      'event organizer',
      'community builder',
      'meetup organizer',
      'club president',
      'toastmasters',
      'public speaking',
    ],
    locationImportance: 'high',
    // MICRO-QUALIFIER: Time commitment upfront to filter unserious inquiries
    cta: `We pay $100+/event for ambassadors who run local debate clubs (6-8 hours/month commitment). If that fits your schedule, I'd love to chat Wednesday or Thursday—which works better?`,
    // Second touch (after positive response) uses the harder ask
    cta_warm: `Our first cohort of ambassadors launches in 4 weeks. Would you want to lead the club in {location}? Here's what the role looks like...`,
    includeDeck: false,
  },
  debater: {
    label: 'Debater',
    description: 'People who want to compete in SuperDebate events',
    signals: [
      'former debater',
      'debate team',
      'debate captain',
      'debate champion',
      'policy debate',
      'lincoln-douglas',
      'ld debate',
      'parliamentary debate',
      'public forum',
      'extemporaneous',
      'impromptu speaking',
      'competitive speaker',
    ],
    interests: [
      'argumentation',
      'rhetoric',
      'public speaking',
      'intellectual discourse',
      'philosophy',
      'politics',
      'ideas',
    ],
    // MICRO-QUALIFIER: Competitive framing filters casual interest
    cta: `Infinita Debate Championship is February 2026 in Honduras—$5K prize pool. Registration opens next month. If you still have that competitive edge, would love to see you compete.`,
    cta_local: `We're running an event in {location} soon—$20 entry, cash prizes. If you miss the rush of competition, this is your shot. Want me to save you a spot?`,
    includeDeck: false,
  },
  friend: {
    label: 'Friend',
    description: 'People who vibe with the mission and might help in non-financial ways',
    signals: [
      'community building',
      'civic discourse',
      'intellectual community',
      'ideas matter',
      'free speech',
      'open dialogue',
      'heterodox',
      'viewpoint diversity',
      'bridge building',
      'depolarization',
    ],
    networkValue: [
      'well-connected',
      'influencer',
      'thought leader',
      'newsletter',
      'podcast host',
      'author',
      'speaker',
    ],
    // MICRO-QUALIFIER: Specific ask type with calendar-specific language
    cta: `I'm looking for advisors who understand community building. If you've got 15 min this week, I'd love your take on our go-to-market. Tuesday or Wednesday afternoon work?`,
    // Specific CTAs for friend subtypes
    cta_connector: `Know anyone who backs civic tech or community platforms? Looking for warm intros to the right investors. Happy to send a forwardable blurb if helpful.`,
    cta_amplifier: `Would you share this with your audience? A quick post could help us reach debate alumni and community builders. I can draft something if useful.`,
    cta_advisor: `Would love 15 min to get your take on our positioning. Tuesday or Wednesday this week—which works better?`,
    includeDeck: true,
  },
} as const;

export type AudienceType = keyof typeof AUDIENCES;

// Verified facts - ONLY use these, never make things up
export const SUPERDEBATE_FACTS = {
  platform: 'SuperDebate.org',
  pitchDeck: 'superdebate.org/pitch-deck',
  eventsRun: '6 small events',
  eventLocations: ['Chicago', 'Portland', 'Bali'],
  emailList: '200+',
  raising: '$500K pre-seed',
  ambassadorPay: {
    perEvent: '$100',
    bonuses: 'bonuses on larger events',
    tournaments: 'more on tournaments',
  },
  debaterCost: '$5-20 per event, sometimes more for special programming',
  upcoming: 'Infinita Debate Championship, Honduras, February 2026',
  format: 'Switch-sides debate (argue both sides)',
  founder: 'John Thomas Connor',
  founderCredential: 'former debate champion and coach',
  achievment: "John's students became first national champions from an urban debate league",
  targetCities: '20+',
};

// Conversation stages
export const CONVERSATION_STAGES = {
  first_message: 'First message sent, awaiting response',
  awaiting_response: 'Waiting for reply',
  in_dialogue: 'Active conversation',
  meeting_scheduled: 'Call/meeting booked',
  closed_won: 'Converted (funded, ambassador, debater, or connected)',
  closed_lost: 'Not interested / No response after sequence',
} as const;

export type ConversationStage = keyof typeof CONVERSATION_STAGES;

// Follow-up sequences - GENERIC (use audience-specific when possible)
export const FOLLOW_UP_SEQUENCES = {
  no_response_day_3: {
    days: 3,
    template: `Hey {first_name}—just floating this back up. No worries if the timing's off, but wanted to check once more in case this got buried.`,
  },
  no_response_day_7: {
    days: 7,
    template: `Hey {first_name}—last note on this. If the mission resonates at all, I'd love to connect. If not, no hard feelings. Either way, appreciate you reading.`,
  },
} as const;

// Response-aware follow-up sequences by response type and audience
export const RESPONSE_AWARE_FOLLOW_UPS = {
  // When they say "busy" - respect their timeline
  busy: {
    default: {
      delay_days: 14, // 2 weeks, not 3 days
      template: `Hey {first_name}—circling back as promised. Hope timing is better now. Let me know if you'd like to connect.`,
    },
    funder: {
      delay_days: 21, // 3 weeks for busy funders
      template: `Hey {first_name}—wanted to circle back. We've made progress since we last connected—now at {current_traction}. Happy to share an update if timing is better.`,
    },
  },
  // When they request info - follow up after they've had time to read
  send_more_info: {
    default: {
      delay_days: 2, // 48 hours after sending deck
      template: `Hey {first_name}—just checking if you had a chance to look at the deck. Happy to answer any questions or jump on a quick call to walk through it.`,
    },
    funder: {
      delay_days: 3, // Give funders more time
      template: `Hey {first_name}—wanted to see if anything stood out from the deck. I'd love to answer questions or discuss the opportunity in more detail.`,
    },
  },
  // When they're positive but haven't scheduled - don't send generic follow-up
  positive: {
    default: {
      delay_days: 1,
      template: `Hey {first_name}—great to hear you're interested! Here's my calendar to make scheduling easy: [CALENDAR_LINK]. Or just throw out a time that works.`,
    },
  },
  // No response sequences by audience
  no_response: {
    funder: {
      day_3: {
        template: `Hey {first_name}—floating this back up. Also wanted to mention we just added {new_investor_or_update} to the round. Let me know if you'd like to chat.`,
      },
      day_7: {
        template: `Hey {first_name}—last note on this. If the timing or fit isn't right, totally understand. If you know anyone else who might be interested in backing this mission, I'd appreciate a warm intro.`,
      },
      day_14: {
        template: `Hey {first_name}—thought you might find this interesting: {relevant_article_or_update}. Still would love to connect if the mission resonates.`,
      },
    },
    ambassador: {
      day_3: {
        template: `Hey {first_name}—just checking in. Running a debate club could be a great side project with real earning potential. Any questions I can answer?`,
      },
      day_7: {
        template: `Hey {first_name}—last note on this. We're launching in {target_city} soon. If you're interested in being the founding ambassador there, let me know.`,
      },
      day_14: {
        template: `Hey {first_name}—even if this isn't for you, do you know anyone who organizes events or runs communities in {target_city}? Happy to reach out directly if you can point me in the right direction.`,
      },
    },
    debater: {
      day_3: {
        template: `Hey {first_name}—just a heads up, our next event is {next_event_date}. Would love to see you compete. Spots are limited.`,
      },
      day_7: {
        template: `Hey {first_name}—tournament registration closes soon. If you miss competing, this is your chance to get back in the ring.`,
      },
      day_14: {
        template: `Hey {first_name}—quick ask: know any former debaters who might want to compete again? We're building a community of people who miss the intellectual challenge. Happy to reach out if you can intro.`,
      },
    },
    friend: {
      day_3: {
        template: `Hey {first_name}—floating this back up. If the mission resonates, I'd love to connect. Even just for advice or intros.`,
      },
      day_7: {
        template: `Hey {first_name}—last note. If you know anyone who might want to support this mission (funders, potential ambassadors, or people who miss competing), I'd really appreciate an intro.`,
      },
      day_14: {
        template: `Hey {first_name}—circling back one more time. If you're not the right person, is there someone in your network who backs civic tech or community platforms? Even just a name would be helpful.`,
      },
    },
  },
} as const;

// Qualification templates by audience
export const QUALIFICATION_TEMPLATES = {
  funder: {
    question: `What's your typical check size and what sectors are you most active in?`,
    follow_up_questions: [
      'Are you actively deploying right now?',
      'What stage companies do you typically invest in?',
      'Would you prefer to lead or follow on a round like this?',
    ],
    disqualifiers: ['not investing right now', 'outside my focus', 'too early stage'],
  },
  ambassador: {
    question: `Which city would you want to run a club in, and what's your experience running events or communities?`,
    follow_up_questions: [
      'How many hours per month could you commit to this?',
      'Do you have a network of people who might want to compete?',
      'Have you organized events before?',
    ],
    disqualifiers: ['no time commitment', 'not interested in organizing'],
  },
  debater: {
    question: `What debate format did you compete in, and how long has it been since you last debated?`,
    follow_up_questions: [
      'What city are you based in?',
      'Would you prefer casual events or competitive tournaments?',
      'Are you interested in judging or just competing?',
    ],
    disqualifiers: ['never actually debated', 'not interested in competing'],
  },
  friend: {
    // Friends get different qualification - we want to know HOW they can help
    question: `Thanks for the support! How do you think you could help most—intros to funders, potential ambassadors, or spreading the word?`,
    follow_up_questions: [
      'Do you know any angel investors interested in community or civic tech?',
      'Know anyone who ran debate in college who might want to organize?',
      'Would you be open to sharing on social media?',
    ],
    disqualifiers: [], // Friends rarely disqualified
  },
} as const;

// Response templates
export const RESPONSE_TEMPLATES = {
  positive: `Really glad this resonates. Would love to find 15-20 minutes to connect. Here's my calendar: [CALENDAR_LINK]. Or just throw out a time that works for you.`,
  send_more_info: `Absolutely. Here's the deck: superdebate.org/pitch-deck. Take a look and let me know what questions come up—happy to jump on a call.`,
  busy: `Totally understand. When would be a better time to circle back?`,
  intro_offered: `That would be amazing. Happy to make it easy—here's a blurb you can forward, or I can send them a note directly if you want to intro.`,
  hard_no: `Appreciate you letting me know. Best of luck with everything.`,
} as const;

// Objection handling
export const OBJECTIONS = {
  market_size: `Hundreds of thousands of people debated in high school and college. Zero infrastructure exists for adults. We're creating the category, not competing for share.`,
  seems_niche: `That's the unlock. Niche + passionate = defensible community. Same playbook as CrossFit or pickleball—starts niche, scales through tribal identity.`,
  traction: `6 events in Chicago, Portland, and Bali. 200+ email list. Ambassadors committed in multiple cities. Early but validated.`,
  business_model: `Event fees from debaters, sponsorships, and eventually championship tickets and media rights.`,
  havent_debated: `That's actually ideal. You remember why you loved it without being stuck in the competitive circuit mentality.`,
  no_time: `Fair. If it was 4-6 hours/month and you earned $100+ per event, would that change things?`,
  vs_toastmasters: `Toastmasters is collaborative self-improvement. We're competitive—tournaments, rankings, championships. The people who loved debate loved the competition.`,
} as const;

// Quality control rules
export const QUALITY_RULES = {
  never: [
    'Send identical messages',
    'Mention AI or automation',
    'Push after a soft no',
    'Overstate traction (no "sold out events")',
    'Be robotic or corporate-sounding',
    'Lose the mission-driven warmth',
  ],
  always: [
    'Lead with the mission',
    'Be warm and genuine',
    'Give people an easy out',
    'Reference something specific about them',
    'Keep messages concise',
    'Sign off as John Thomas Connor',
  ],
  bannedPhrases: [
    'quick call',
    'synergy',
    'win-win',
    'guarantee',
    'limited time',
    'act now',
    'exclusive offer',
    'sold out',
    'tremendous traction',
    'viral',
    'game changer',
  ],
};

// Lost/Disqualification reasons for tracking why opportunities didn't convert
export const LOST_REASONS = {
  // Hard disqualifiers - unlikely to ever convert
  not_interested: {
    label: 'Not interested in mission',
    reengageable: false,
    description: 'Explicitly stated no interest in debate/civic discourse',
  },
  competitor_conflict: {
    label: 'Conflict with competitor',
    reengageable: false,
    description: 'Already involved with competing platform or organization',
  },
  wrong_person: {
    label: 'Wrong decision maker',
    reengageable: false,
    description: 'Not the right person to make this decision',
  },

  // Soft disqualifiers - may convert later
  timing_bad: {
    label: 'Bad timing',
    reengageable: true,
    reengageAfterDays: 90,
    description: 'Interested but timing is wrong (budget cycle, busy period)',
  },
  budget_allocated: {
    label: 'Budget already allocated',
    reengageable: true,
    reengageAfterDays: 180,
    description: 'No budget available this period',
  },
  too_early_stage: {
    label: 'Too early for them',
    reengageable: true,
    reengageAfterDays: 120,
    description: 'They want to see more traction before engaging',
  },
  location_mismatch: {
    label: 'Location mismatch',
    reengageable: true,
    reengageAfterDays: 365,
    description: 'Not in a city we operate in (yet)',
  },

  // No response - status unknown
  ghosted: {
    label: 'No response (ghosted)',
    reengageable: true,
    reengageAfterDays: 60,
    description: 'Never responded after full follow-up sequence',
  },
  unresponsive: {
    label: 'Stopped responding',
    reengageable: true,
    reengageAfterDays: 45,
    description: 'Engaged initially but stopped responding',
  },

  // Other
  other: {
    label: 'Other',
    reengageable: true,
    reengageAfterDays: 90,
    description: 'Custom reason (specify in notes)',
  },
} as const;

export type LostReason = keyof typeof LOST_REASONS;
