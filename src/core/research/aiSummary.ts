export async function generateResearchSummary(topic: string, findings: string[], apiKey: string): Promise<string> {
  if (!apiKey) return 'API key is missing';
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Analyze this intelligence on ${topic}. Provide a professional OSINT brief based strictly on these findings:\n\n${findings.join('\n\n')}`
          }]
        }]
      })
    });
    
    if (!response.ok) throw new Error('Failed to generate summary');
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary generated.';
  } catch (err: any) {
    return `Error generating summary: ${err.message}`;
  }
}

export async function generateChatGptSummary(topic: string, findings: string[], apiKey: string): Promise<string> {
  if (!apiKey) return 'OpenAI API key is missing';
  
  try {
    const response = await fetch(`https://api.openai.com/v1/chat/completions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a professional OSINT analyst." },
          { role: "user", content: `Analyze this intelligence on ${topic}. Provide a professional OSINT brief based strictly on these findings:\n\n${findings.join('\n\n')}` }
        ]
      })
    });
    
    if (!response.ok) throw new Error('Failed to generate OpenAI summary');
    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No summary generated.';
  } catch (err: any) {
    return `Error generating summary: ${err.message}`;
  }
}
