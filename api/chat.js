export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const googleKey = process.env.GOOGLE_API_KEY;
  const googleCX = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!anthropicKey) return res.status(500).json({ error: 'Anthropic API key not configured' });

  try {
    // Step 1: Get Claude's fashion recommendations
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const claudeData = await claudeResponse.json();

    // If no Google keys, return Claude's response as-is (fallback)
    if (!googleKey || !googleCX) {
      return res.status(200).json(claudeData);
    }

    // Step 2: Parse Claude's JSON output
    let parsedResult = null;
    try {
      const rawText = claudeData.content.map(b => b.text || '').join('');
      const clean = rawText.replace(/```json|```/g, '').trim();
      parsedResult = JSON.parse(clean);
    } catch (e) {
      return res.status(200).json(claudeData);
    }

    // Step 3: Fetch a real product image for each item via Google Custom Search
    const itemsWithImages = await Promise.all(
      parsedResult.items.map(async (item) => {
        try {
          const query = encodeURIComponent(`${item.itemName} ${item.store} fashion`);
          const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${googleKey}&cx=${googleCX}&q=${query}&searchType=image&num=1&imgType=photo&imgSize=large&safe=active`;

          const imgResponse = await fetch(googleUrl);
          const imgData = await imgResponse.json();

          if (imgData.items && imgData.items.length > 0) {
            item.imageUrl = imgData.items[0].link;
          }
        } catch (e) {
          // No image — card shows emoji fallback, no problem
        }
        return item;
      })
    );

    parsedResult.items = itemsWithImages;

    // Step 4: Return enriched data in same shape the frontend expects
    return res.status(200).json({
      content: [{ type: 'text', text: JSON.stringify(parsedResult) }]
    });

  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
