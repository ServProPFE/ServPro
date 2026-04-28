const {
  buildDynamicSuggestions,
  buildLocalChatbotResponse,
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
  ];

  it('ranks the best matching service first', () => {
    const ranked = rankServicesByQuery({ services, query: 'I have a faucet leak' });

    expect(ranked[0].service._id).toBe('service-plumbing');
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
    expect(response.detectedService).toBe('plomberie');
    expect(response.message).toContain('Leak Repair');
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