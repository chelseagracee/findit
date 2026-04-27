export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const googleKey = process.env.GOOGLE_API_KEY;
  const googleCX = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!anthropicKey) {
    return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' });
  }

  const { query, size, budget } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  // Build the prompt
  const extras = [
    size && `Size: ${size}`,
    budget && `Budget: ${budget}`
  ].filter(Boolean).join(' | ');

  const fullQuery = query + (extras ? `\n\nAdditional info: ${extras}` : '');

  const prompt = `You are a fashion stylist AI helping users find clothing items fast.

User brief: "${fullQuery}"

Respond ONLY with valid JSON (no markdown, no backticks, no extra text):
{
  "summary": "Elegant 10-word summary of what they need",
  "stylistNote": "2 practical sentences about occasion, weather, styling advice",
  "items": [
    {
      "store": "Store name",
      "itemName": "Specific realistic product name, max 7 words",
      "why": "One punchy sentence, max 10 words, why this fits",
      "searchQuery": "exact search query to find this on the store website",
      "storeUrl": "Working encoded search URL for this store",
      "emoji": "one emoji"
    }
  ]
}

Rules:
- Return exactly 7 items across 5-6 different stores
- If budget given, only suggest stores in that price range
- Store URL formats (encode spaces as +): ASOS→https://www.asos.com/search/?q=QUERY, Zara→https://www.zara.com/us/en/search?searchTerm=QUERY, Net-a-Porter→https://www.net-a-porter.com/en-us/search?q=QUERY, Nordstrom→https://www.nordstrom.com/sr?origin=keywordsearch&keyword=QUERY, Revolve→https://www.revolve.com/search/?q=QUERY, Selfridges→https://www.selfridges.com/GB/en/cat/?q=QUERY, Mango→https://shop.mango.com/gb/search?q=QUERY, H&M→https://www2.hm.com/en_gb/search-results.html?q=QUERY, Anthropologie→https://www.anthropologie.com/search?text=QUERY, Free People→https://www.freepeople.com/search/?q=QUERY, Reiss→https://www.reiss.com/search/?q=QUERY, Karen Millen→https://www.karenmillen.com/search?q=QUERY, & Other Stories→https://www.stories.com/en_gbp/search.html?q=QUERY, Reformation→https://www.thereformation.com/search?q=QUERY, COS→https://www.cosstores.com/en_gbp/search?q=QUERY
- itemName must sound like a real, desirable product listing
- IMPORTANT: Each item must be specific to the user's actual request — not generic`;

  try {
    // Step 1: Get Claude's recommendations
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      console.error('Claude error:', err);
      return res.status(500).json({ error: 'Claude API failed', detail: err });
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content.map(b => b.text || '').join('');
    const cleanText = rawText.replace(/```json|```/g, '').trim();

    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanText);
    } catch (e) {
      console.error('JSON parse error:', cleanText);
      return res.status(500).json({ error: 'Failed to parse Claude response', raw: cleanText });
    }

    // Step 2: Fetch real product images from Google if keys exist
    if (googleKey && googleCX) {
      const itemsWithImages = await Promise.all(
        parsedResult.items.map(async (item) => {
          try {
            const q = encodeURIComponent(`${item.itemName} ${item.store}`);
            const url = `https://www.googleapis.com/customsearch/v1?key=${googleKey}&cx=${googleCX}&q=${q}&searchType=image&num=1&imgType=photo&imgSize=large&safe=active`;
            const imgRes = await fetch(url);
            const imgData = await imgRes.json();

            if (imgData.items && imgData.items.length > 0) {
              item.imageUrl = imgData.items[0].link;
            } else {
              console.log(`No image found for: ${item.itemName} ${item.store}`, imgData.error || '');
            }
          } catch (e) {
            console.error(`Image fetch failed for ${item.itemName}:`, e.message);
          }
          return item;
        })
      );
      parsedResult.items = itemsWithImages;
    }

    return res.status(200).json(parsedResult);

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: error.message });
  }
}
