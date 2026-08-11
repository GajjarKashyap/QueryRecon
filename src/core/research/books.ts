export async function searchBooks(topic: string): Promise<Array<{title: string, authors: string[], url: string, thumbnail?: string, publishedDate?: string}>> {
  try {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(topic)}&maxResults=10`);
    const data = await response.json();
    if (!data.items) return [];
    return data.items.map((item: any) => ({
      title: item.volumeInfo.title,
      authors: item.volumeInfo.authors || [],
      url: item.volumeInfo.infoLink,
      thumbnail: item.volumeInfo.imageLinks?.thumbnail,
      publishedDate: item.volumeInfo.publishedDate
    }));
  } catch (e) {
    console.error('Books search error', e);
    return [];
  }
}
