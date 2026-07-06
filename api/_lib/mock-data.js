// Sample articles served when GNEWS_API_KEY is not set, so the app runs
// end-to-end (and can be developed/demoed) without burning API quota.
// Timestamps are generated relative to "now" so date filtering stays useful.

const hoursAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString();

export const MOCK_ARTICLES = [
  {
    title: 'Anthropic and OpenAI race to ship enterprise agent platforms',
    description:
      'The two AI labs announced competing agentic frameworks aimed at large enterprise customers, with early adopters citing productivity gains in software engineering and support workflows.',
    url: 'https://example.com/ai-agents-enterprise',
    image: null,
    publishedAt: hoursAgo(3),
    source: { name: 'TechWire', url: 'https://example.com' },
  },
  {
    title: 'New D&D sourcebook brings psionics back to fifth edition',
    description:
      'Wizards of the Coast previewed a tabletop expansion reintroducing psionic subclasses, alongside updated encounter-building rules for dungeon masters.',
    url: 'https://example.com/dnd-psionics',
    image: null,
    publishedAt: hoursAgo(6),
    source: { name: 'Tabletop Weekly', url: 'https://example.com' },
  },
  {
    title: 'SAP and Salesforce report slowing enterprise software spend',
    description:
      'Quarterly earnings from major enterprise software vendors point to longer sales cycles as CIOs consolidate budgets around AI initiatives.',
    url: 'https://example.com/enterprise-spend',
    image: null,
    publishedAt: hoursAgo(10),
    source: { name: 'Market Ledger', url: 'https://example.com' },
  },
  {
    title: 'Open-source LLM tops new reasoning benchmark',
    description:
      'A community-trained language model outperformed several commercial systems on a new mathematical reasoning benchmark, renewing debate about open weights in the AI industry.',
    url: 'https://example.com/oss-llm-benchmark',
    image: null,
    publishedAt: hoursAgo(14),
    source: { name: 'TechWire', url: 'https://example.com' },
  },
  {
    title: 'Board game cafes see record growth as tabletop gaming booms',
    description:
      'Industry data shows tabletop gaming revenue up double digits, driven by crowdfunded strategy games and a resurgence of in-person play.',
    url: 'https://example.com/boardgame-cafes',
    image: null,
    publishedAt: hoursAgo(20),
    source: { name: 'Culture Desk', url: 'https://example.com' },
  },
  {
    title: 'City council approves new bike lane network downtown',
    description:
      'The plan adds 40 kilometres of protected lanes over three years, funded by a regional transport levy.',
    url: 'https://example.com/bike-lanes',
    image: null,
    publishedAt: hoursAgo(26),
    source: { name: 'Metro Times', url: 'https://example.com' },
  },
  {
    title: 'Chipmaker unveils inference accelerator aimed at data centers',
    description:
      'The new silicon targets transformer inference workloads, claiming better performance per watt than current GPUs for large language models.',
    url: 'https://example.com/inference-chip',
    image: null,
    publishedAt: hoursAgo(30),
    source: { name: 'Silicon Report', url: 'https://example.com' },
  },
  {
    title: "Indie studio's tactics RPG tops charts after surprise launch",
    description:
      'The turn-based tactics game, inspired by classic tabletop role-playing systems, sold half a million copies in its first week.',
    url: 'https://example.com/tactics-rpg',
    image: null,
    publishedAt: hoursAgo(40),
    source: { name: 'Culture Desk', url: 'https://example.com' },
  },
  {
    title: 'Regulators outline transparency rules for AI models in hiring',
    description:
      'Draft guidance would require employers using machine learning screening tools to disclose automated decisions and offer human review.',
    url: 'https://example.com/ai-hiring-rules',
    image: null,
    publishedAt: hoursAgo(50),
    source: { name: 'Policy Brief', url: 'https://example.com' },
  },
  {
    title: 'Cloud providers cut prices on managed Kubernetes tiers',
    description:
      'A pricing skirmish among the big three cloud platforms lowers the cost of running containerized enterprise software at scale.',
    url: 'https://example.com/k8s-pricing',
    image: null,
    publishedAt: hoursAgo(60),
    source: { name: 'Market Ledger', url: 'https://example.com' },
  },
  {
    title: 'Local bakery wins national sourdough championship',
    description:
      'Judges praised the crumb structure and 72-hour fermentation process behind the winning loaf.',
    url: 'https://example.com/sourdough',
    image: null,
    publishedAt: hoursAgo(70),
    source: { name: 'Metro Times', url: 'https://example.com' },
  },
  {
    title: 'Miniature painting goes mainstream with new hobby lines',
    description:
      'Major craft retailers are stocking wargaming and tabletop miniature supplies as the painting hobby outgrows its niche.',
    url: 'https://example.com/mini-painting',
    image: null,
    publishedAt: hoursAgo(80),
    source: { name: 'Tabletop Weekly', url: 'https://example.com' },
  },
];
