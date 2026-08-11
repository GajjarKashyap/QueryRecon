export async function fetchWeather(query: string, apiKey: string) {
  if (!apiKey) return { error: 'No OpenWeatherMap API Key provided.' };
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${apiKey}&units=metric`);
    if (!res.ok) throw new Error('Failed to fetch weather data');
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { error: err.message };
  }
}
