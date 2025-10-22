export const mockEmbedding = (): number[] => {
  // Generate a mock 1536-dimensional embedding (OpenAI text-embedding-ada-002 dimensions)
  return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
};

export const mockSmallEmbedding = (): number[] => {
  // Small mock embedding for testing
  return [0.1, 0.2, 0.3, 0.4, 0.5];
};

export const mockPineconeMatches = () => [
  {
    id: 'doc-1',
    score: 0.95,
    metadata: {
      text: 'Our refund policy allows returns within 30 days of purchase for most items. The product must be in its original condition with all packaging and accessories.',
      source: 'Refund Policy',
      category: 'policy',
    },
  },
  {
    id: 'doc-2',
    score: 0.89,
    metadata: {
      text: 'Defective products can be returned at any time within the warranty period. We offer full refunds or replacements for defective items.',
      source: 'Warranty Information',
      category: 'policy',
    },
  },
  {
    id: 'doc-3',
    score: 0.82,
    metadata: {
      text: 'To initiate a refund, contact our customer service team with your order number. Refunds are typically processed within 5-7 business days.',
      source: 'Customer Service Guide',
      category: 'process',
    },
  },
  {
    id: 'doc-4',
    score: 0.75,
    metadata: {
      text: 'Some items are non-refundable, including digital downloads, personalized items, and clearance products. Please check the product page before purchasing.',
      source: 'Non-Refundable Items',
      category: 'policy',
    },
  },
];

export const mockLowScoreMatches = () => [
  {
    id: 'doc-5',
    score: 0.45,
    metadata: {
      text: 'This is a low relevance match that should be filtered out.',
      source: 'Irrelevant Source',
      category: 'other',
    },
  },
  {
    id: 'doc-6',
    score: 0.32,
    metadata: {
      text: 'Another low score match with minimal relevance.',
      source: 'Random Document',
      category: 'misc',
    },
  },
];
