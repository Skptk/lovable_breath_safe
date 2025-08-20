export interface Article {
  id: string;
  title: string;
  summary: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  author: string;
  publishDate: string;
  publishedAt: string;
  category: 'health' | 'environment' | 'research' | 'tips';
  readTime: number; // in minutes
}

export const articles: Article[] = [
  {
    id: '1',
    title: 'Understanding PM2.5: The Invisible Threat in Our Air',
    summary: 'Learn about the tiny particles that pose the biggest risk to our respiratory health and how to protect yourself.',
    excerpt: 'Learn about the tiny particles that pose the biggest risk to our respiratory health and how to protect yourself from PM2.5 exposure.',
    content: `
      <div class="space-y-6">
        <p>PM2.5 particles are microscopic pollutants that are 2.5 micrometers or smaller in diameter - about 30 times smaller than the width of a human hair. Despite their tiny size, these particles pose significant health risks because they can penetrate deep into our lungs and even enter our bloodstream.</p>
        
        <h3 class="text-lg font-semibold">What Are PM2.5 Particles?</h3>
        <p>PM2.5 stands for "Particulate Matter 2.5" and includes a complex mixture of solid particles and liquid droplets found in the air. These particles come from various sources:</p>
        
        <ul class="list-disc pl-6 space-y-2">
          <li>Vehicle emissions from cars, trucks, and motorcycles</li>
          <li>Industrial processes and power plants</li>
          <li>Wildfires and prescribed burns</li>
          <li>Dust storms and construction activities</li>
          <li>Indoor sources like cooking and smoking</li>
        </ul>
        
        <h3 class="text-lg font-semibold">Health Impacts</h3>
        <p>Long-term exposure to PM2.5 has been linked to:</p>
        
        <ul class="list-disc pl-6 space-y-2">
          <li>Cardiovascular disease and heart attacks</li>
          <li>Respiratory diseases including asthma</li>
          <li>Reduced lung function</li>
          <li>Premature death</li>
          <li>Low birth weight in babies</li>
        </ul>
        
        <h3 class="text-lg font-semibold">Protection Strategies</h3>
        <p>To protect yourself from PM2.5 exposure:</p>
        
        <ul class="list-disc pl-6 space-y-2">
          <li>Monitor daily air quality reports</li>
          <li>Limit outdoor activities when AQI is high</li>
          <li>Use air purifiers with HEPA filters indoors</li>
          <li>Wear N95 masks during high pollution days</li>
          <li>Keep windows closed during poor air quality periods</li>
        </ul>
        
        <p>By understanding PM2.5 and taking protective measures, we can significantly reduce our exposure and protect our long-term health.</p>
      </div>
    `,
    imageUrl: '/placeholder.svg',
    author: 'Dr. Sarah Chen',
    publishDate: '2024-01-15',
    publishedAt: '2024-01-15',
    category: 'health',
    readTime: 5
  },
  {
    id: '2',
    title: 'Indoor Air Quality: Creating a Healthy Home Environment',
    summary: 'Discover practical tips for improving the air quality inside your home and creating a healthier living space.',
    excerpt: 'Discover practical tips for improving the air quality inside your home and creating a healthier living space for you and your family.',
    content: `
      <div class="space-y-6">
        <p>While we often focus on outdoor air pollution, the air inside our homes can be 2-5 times more polluted than outdoor air. Creating a healthy indoor environment is crucial for our well-being, especially since we spend about 90% of our time indoors.</p>
        
        <h3 class="text-lg font-semibold">Common Indoor Air Pollutants</h3>
        <p>Several pollutants can compromise indoor air quality:</p>
        
        <ul class="list-disc pl-6 space-y-2">
          <li>Volatile Organic Compounds (VOCs) from cleaning products and furniture</li>
          <li>Dust mites and allergens</li>
          <li>Mold and mildew</li>
          <li>Pet dander</li>
          <li>Cooking fumes and smoke</li>
          <li>Carbon monoxide from gas appliances</li>
        </ul>
        
        <h3 class="text-lg font-semibold">Improvement Strategies</h3>
        
        <h4 class="font-medium">Ventilation</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li>Open windows when outdoor air quality is good</li>
          <li>Use exhaust fans in bathrooms and kitchens</li>
          <li>Ensure HVAC systems are properly maintained</li>
        </ul>
        
        <h4 class="font-medium">Air Purification</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li>Invest in air purifiers with HEPA filters</li>
          <li>Change HVAC filters regularly</li>
          <li>Consider plants that naturally purify air</li>
        </ul>
        
        <h4 class="font-medium">Source Control</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li>Use low-VOC or natural cleaning products</li>
          <li>Vacuum regularly with a HEPA filter vacuum</li>
          <li>Control humidity levels (30-50%)</li>
          <li>Fix water leaks promptly to prevent mold</li>
        </ul>
        
        <p>By implementing these strategies, you can significantly improve your indoor air quality and create a healthier home environment for you and your family.</p>
      </div>
    `,
    imageUrl: '/placeholder.svg',
    author: 'Michael Rodriguez',
    publishDate: '2024-01-12',
    publishedAt: '2024-01-12',
    category: 'tips',
    readTime: 7
  },
    {
    id: '3',
    title: 'Climate Change and Air Quality: Understanding the Connection',
    summary: 'Explore how climate change affects air pollution patterns and what it means for public health.',
    excerpt: 'Explore how climate change affects air pollution patterns and what it means for public health and environmental protection.',
    content: `
      <div class="space-y-6">
        <p>Climate change and air quality are intricately connected, creating a complex web of environmental and health challenges. As global temperatures rise, we're seeing significant changes in air pollution patterns that directly impact human health.</p>
        
        <h3 class="text-lg font-semibold">How Climate Change Affects Air Quality</h3>
        
        <h4 class="font-medium">Temperature Effects</h4>
        <p>Higher temperatures accelerate chemical reactions in the atmosphere, leading to increased formation of ground-level ozone and secondary particulate matter. This means more smog and poor air quality days.</p>
        
        <h4 class="font-medium">Wildfire Frequency</h4>
        <p>Climate change has led to longer, more intense wildfire seasons. These fires release massive amounts of particulate matter and toxic compounds into the atmosphere, affecting air quality across vast regions.</p>
        
        <h4 class="font-medium">Weather Pattern Changes</h4>
        <ul class="list-disc pl-6 space-y-2">
          <li>Altered precipitation patterns affect pollutant washout</li>
          <li>Changes in wind patterns influence pollutant transport</li>
          <li>Increased stagnation events trap pollutants near the surface</li>
        </ul>
        
        <h3 class="text-lg font-semibold">Health Implications</h3>
        <p>The intersection of climate change and air pollution creates compounding health risks:</p>
        
        <ul class="list-disc pl-6 space-y-2">
          <li>Heat stress combined with poor air quality</li>
          <li>Increased respiratory and cardiovascular disease</li>
          <li>Vulnerable populations face disproportionate impacts</li>
          <li>Longer allergy seasons due to extended pollen periods</li>
        </ul>
        
        <h3 class="text-lg font-semibold">Solutions and Adaptation</h3>
        
        <h4 class="font-medium">Mitigation Strategies</h4>
        <ul class="list-disc pl-6 space-y-2">
          <li>Transition to renewable energy sources</li>
          <li>Improve public transportation systems</li>
          <li>Implement stricter emission standards</li>
          <li>Promote energy efficiency in buildings</li>
        </ul>
        
        <h4 class="font-medium">Adaptation Measures</h4>
        <ul class="list-disc pl-6 space-y-2">
          <li>Enhanced air quality monitoring systems</li>
          <li>Early warning systems for poor air quality</li>
          <li>Urban planning that considers air flow</li>
          <li>Building design that filters outdoor air</li>
        </ul>
        
        <p>Understanding the connection between climate change and air quality is crucial for developing effective policies and personal protection strategies for the future.</p>
      </div>
    `,
    imageUrl: '/placeholder.svg',
    author: 'Dr. Emma Thompson',
    publishDate: '2024-01-10',
    publishedAt: '2024-01-10',
    category: 'environment',
    readTime: 8
  }
];

export function getLatestArticles(limit: number = 3): Article[] {
  return articles
    .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
    .slice(0, limit);
}

export function getArticleById(id: string): Article | undefined {
  return articles.find(article => article.id === id);
}

export function getAllArticles(): Article[] {
  return articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}
