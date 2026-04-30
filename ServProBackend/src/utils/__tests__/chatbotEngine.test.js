const {
  buildDynamicSuggestions,
  buildLocalChatbotResponse,
  parsePreferenceFromQuery,
  rankServicesByQuery,
} = require('../chatbotEngine');

describe('chatbotEngine', () => {
  const services = [
    {
      _id: 'service-plumbing',
      name: 'Leak Repair',
      category: 'PLOMBERIE',
      description: 'Fix faucets, pipes, and water leaks',
      priceMin: 40,
      duration: 60,
      provider: { _id: 'provider-1', name: 'Alpha Fix', email: 'alpha@example.com' },
    },
    {
      _id: 'service-cleaning',
      name: 'Deep Cleaning',
      category: 'NETTOYAGE',
      description: 'Home cleaning and sanitizing',
      priceMin: 30,
      duration: 120,
      provider: { _id: 'provider-2', name: 'Sparkle Team', email: 'sparkle@example.com' },
    },
    {
      _id: 'service-plumbing-fast',
      name: 'Quick Leak Fix',
      category: 'PLOMBERIE',
      description: 'Urgent leak fix for pipes and faucets',
      priceMin: 60,
      duration: 30,
      provider: { _id: 'provider-3', name: 'Rapid Flow', email: 'rapid@example.com' },
    },
  ];

  it('ranks the best matching service first', () => {
    const ranked = rankServicesByQuery({ services, query: 'I have a faucet leak' });

    expect(ranked[0].service.category).toBe('PLOMBERIE');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it('builds a local chatbot response with a concrete recommendation', () => {
    const response = buildLocalChatbotResponse({
      message: 'My faucet is leaking and I need a plumber',
      language: 'en',
      services,
    });

    expect(response.recommendedService).toMatchObject({
      id: 'service-plumbing',
      category: 'PLOMBERIE',
    });
    expect(response.recommendedServices.length).toBeGreaterThan(0);
    expect(response.recommendedServices[0].category).toBe('PLOMBERIE');
    expect(response.detectedService).toBe('plomberie');
    expect(response.message).toContain('plumbing');
  });

  it('parses preference hints from user query', () => {
    expect(parsePreferenceFromQuery('Show me the cheapest plumbing options')).toBe('cheapest');
    expect(parsePreferenceFromQuery('I need the fastest plumber')).toBe('fastest');
    expect(parsePreferenceFromQuery('')).toBeNull();
  });

  it('returns multiple recommendations and sorts by cheapest when requested', () => {
    const response = buildLocalChatbotResponse({
      message: 'I need a plumber, show me the cheapest options',
      language: 'en',
      services,
    });

    expect(response.recommendedServices.length).toBeGreaterThan(1);
    expect(response.recommendedServices[0].priceMin).toBeLessThanOrEqual(response.recommendedServices[1].priceMin);
    expect(response.message).toContain('cheapest');
  });

  it('builds dynamic suggestions from the catalog', () => {
    const suggestions = buildDynamicSuggestions({
      services,
      language: 'en',
    });

    expect(suggestions).toHaveLength(5);
    expect(suggestions[0]).toContain('plumber');
  });
});