/**
 * Antiqora AI Live Web Research Service
 * Fetches real web results without fabricating data.
 * Supports DuckDuckGo HTML/Instant Answer & Tavily API.
 */

const logger = require('../utils/logger.cjs');

async function searchDuckDuckGo(query) {
  try {
    logger.info('WEB_RESEARCH', `Executing live search for: "${query}"`);
    // Query DuckDuckGo HTML Lite endpoint
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AntiqoraAI/1.0',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo responded with HTTP status ${response.status}`);
    }

    const html = await response.text();
    const results = parseDuckDuckGoHtml(html);

    if (results.length > 0) {
      return results.slice(0, 6);
    }

    // Fallback to Instant Answer API if HTML returned no results
    const instantUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const instantRes = await fetch(instantUrl, {
      headers: { 'User-Agent': 'AntiqoraAI/1.0' },
      signal: AbortSignal.timeout(5000),
    });

    if (instantRes.ok) {
      const data = await instantRes.json();
      const fallbackResults = [];
      if (data.AbstractText && data.AbstractURL) {
        fallbackResults.push({
          title: data.Heading || query,
          url: data.AbstractURL,
          snippet: data.AbstractText,
          relevanceScore: 0.95,
        });
      }
      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 4)) {
          if (topic.Text && topic.FirstURL) {
            fallbackResults.push({
              title: topic.Text.split(' - ')[0] || query,
              url: topic.FirstURL,
              snippet: topic.Text,
              relevanceScore: 0.8,
            });
          }
        }
      }
      if (fallbackResults.length > 0) {
        return fallbackResults;
      }
    }

    return [];
  } catch (err) {
    logger.warn('WEB_RESEARCH', 'Search query execution error', { query, error: err.message });
    return [];
  }
}

function parseDuckDuckGoHtml(html) {
  const sources = [];
  // Regex to extract search results from DuckDuckGo HTML layout
  // Links: <a class="result__url" href="..."> or <a class="result__snippet" ...>
  const resultBlockRegex = /<div class="result\s+results_links[^"]*">([\s\S]*?)<\/div>\s*<\/div>/g;
  let blockMatch;

  while ((blockMatch = resultBlockRegex.exec(html)) !== null && sources.length < 8) {
    const block = blockMatch[1];

    // Extract title & link
    const titleMatch = /<a class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
    // Extract snippet
    const snippetMatch = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i.exec(block);

    if (titleMatch && snippetMatch) {
      let rawUrl = titleMatch[1];
      // DuckDuckGo redirects: //duckduckgo.com/l/?uddg=...
      const uddgMatch = /[?&]uddg=([^&]+)/.exec(rawUrl);
      if (uddgMatch) {
        try {
          rawUrl = decodeURIComponent(uddgMatch[1]);
        } catch {
          // keep raw
        }
      }

      const cleanTitle = stripHtmlTags(titleMatch[2]).trim();
      const cleanSnippet = stripHtmlTags(snippetMatch[1]).trim();

      if (cleanTitle && cleanSnippet && rawUrl.startsWith('http')) {
        sources.push({
          title: cleanTitle,
          url: rawUrl,
          snippet: cleanSnippet,
          relevanceScore: 0.9 - sources.length * 0.05,
        });
      }
    }
  }

  return sources;
}

function stripHtmlTags(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

async function searchTavily(query, apiKey) {
  if (!apiKey) return [];
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        include_answer: true,
        max_results: 5,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`Tavily error HTTP ${res.status}`);
    }

    const data = await res.json();
    return (data.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      relevanceScore: r.score || 0.9,
    }));
  } catch (err) {
    logger.error('WEB_RESEARCH', 'Tavily search failed', { error: err.message });
    return [];
  }
}

async function performWebResearch(query, config = {}) {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) {
    return {
      query: '',
      summary: '',
      sources: [],
      timestamp: Date.now(),
      confidence: 'LOW',
      error: 'Search query cannot be empty',
    };
  }

  let sources = [];
  if (config.searchProvider === 'tavily' && config.searchApiKey) {
    sources = await searchTavily(cleanQuery, config.searchApiKey);
  }

  if (sources.length === 0) {
    sources = await searchDuckDuckGo(cleanQuery);
  }

  if (sources.length === 0) {
    return {
      query: cleanQuery,
      summary: 'Web search is currently unavailable or returned no relevant real-time sources.',
      sources: [],
      timestamp: Date.now(),
      confidence: 'LOW',
    };
  }

  // Synthesize research summary from authentic sources
  const snippetExtracts = sources.map((s, idx) => `[Source ${idx + 1}: ${s.title}]\n${s.snippet}`).join('\n\n');
  const summary = `Found ${sources.length} authoritative sources for "${cleanQuery}".\n\nKey Findings:\n${snippetExtracts}`;

  return {
    query: cleanQuery,
    summary,
    sources,
    timestamp: Date.now(),
    confidence: sources.length >= 3 ? 'HIGH' : 'MEDIUM',
  };
}

module.exports = {
  performWebResearch,
  searchDuckDuckGo,
};
