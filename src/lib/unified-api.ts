const ANIMEFLV_API_BASE = 'https://animeflv.ahmedrangel.com/api';

export interface UnifiedItem {
  source_type: 'Jikan';
  content_type: 'anime';
  mal_id?: string;
  title: string;
  poster?: string;
  image_url?: string;
  synopsis?: string;
  episodes_count?: number;
  status?: string;
  score?: number;
  genres?: string[];
  release_year?: number;
}

export interface DetailedContent extends UnifiedItem {
  animeflv_id?: string; // This will be the slug
}

export interface VideoSource {
  url: string;
  type: 'embed' | 'direct';
  quality?: string;
  provider: string;
}

// Minimal shapes for the third-party AnimeFLV mirror API responses.
// Extra fields from the API are tolerated via the index signature.
interface AnimeFLVMedia {
  slug?: string;
  title?: string;
  cover?: string;
  synopsis?: string;
  rating?: string;
  debut?: string;
  genres?: string[];
  status?: string;
  episodes?: unknown[];
  [key: string]: unknown;
}

interface AnimeFLVServer {
  name?: string;
  embed?: string;
  [key: string]: unknown;
}

async function searchAnimeOnAnimeFLV(query: string): Promise<AnimeFLVMedia[]> {
  const searchUrl = `${ANIMEFLV_API_BASE}/search?query=${encodeURIComponent(query)}`;
  console.log(`Searching AnimeFLV for: ${query}`);
  try {
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`AnimeFLV search failed with status: ${response.status}`);
    }
    const data = await response.json();
    if (!data.success || !data.data || !data.data.media) {
      console.warn('AnimeFLV search returned no media:', data);
      return [];
    }
    return data.data.media;
  } catch (error) {
    console.error('Error in searchAnimeOnAnimeFLV:', error);
    return [];
  }
}

export async function fetchUnifiedDetail(sourceType: string, itemId: string, title: string): Promise<DetailedContent> {
  if (sourceType !== 'Jikan' || !title) {
    throw new Error('This function currently only supports searching by title from a Jikan source.');
  }

  console.log(`Attempting to find '${title}' on AnimeFLV...`);
  const searchResults = await searchAnimeOnAnimeFLV(title);

  if (searchResults.length === 0) {
    throw new Error(`No results found for "${title}" on AnimeFLV.`);
  }

  const bestMatch = searchResults[0];
  const slug = bestMatch.slug;

  if (!slug) {
    throw new Error(`Could not find a valid slug for "${title}" on AnimeFLV.`);
  }
  
  console.log(`Found slug '${slug}' for '${title}'. Fetching details...`);
  const detailUrl = `${ANIMEFLV_API_BASE}/anime/${slug}`;

  try {
    const response = await fetch(detailUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch details from AnimeFLV for slug: ${slug}`);
    }
    const detailsData = await response.json();

    if (!detailsData.success) {
      throw new Error(`AnimeFLV API returned success=false for slug: ${slug}`);
    }
    
    const animeData = detailsData.data;
    
    const unifiedDetails: DetailedContent = {
      source_type: 'Jikan',
      content_type: 'anime',
      mal_id: itemId,
      animeflv_id: slug, // The slug is our AnimeFLV ID
      title: animeData.title,
      poster: animeData.cover,
      synopsis: animeData.synopsis,
      episodes_count: animeData.episodes?.length || 0,
      status: animeData.status,
      score: parseFloat(animeData.rating) || undefined,
      genres: animeData.genres,
      release_year: parseInt(animeData.debut) || undefined
    };
    
    console.log('Successfully unified details from AnimeFLV:', unifiedDetails);
    return unifiedDetails;

  } catch (error) {
    console.error('Error fetching or processing AnimeFLV details:', error);
    throw error;
  }
}

export async function fetchVideoSources(animeFlvId: string, episodeNumber: number): Promise<VideoSource[]> {
  if (!animeFlvId) {
    console.error('No AnimeFLV ID (slug) provided to fetchVideoSources');
    return [];
  }

  const url = `${ANIMEFLV_API_BASE}/anime/${animeFlvId}/episode/${episodeNumber}`;
  console.log('Fetching video sources from:', url);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch video sources: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Video sources response:', data);
    
    if (!data.success || !data.data || !data.data.servers) {
      console.error('Invalid sources data received from AnimeFLV:', data);
      return [];
    }
    
    return data.data.servers.map((source: AnimeFLVServer) => ({
      url: source.embed || '',
      type: 'embed',
      quality: source.name,
      provider: 'AnimeFLV'
    })).filter((s: VideoSource) => s.url);
  } catch (error) {
    console.error('Error in fetchVideoSources:', error);
    return [];
  }
}

export async function consolidateVideoSources(
  animeFlvId?: string,
  episodeNumber: number = 1
): Promise<VideoSource[]> {
  if (!animeFlvId) {
    console.warn('No AnimeFLV ID provided to consolidateVideoSources');
    return [];
  }
  
  console.log(`Fetching video sources for AnimeFLV ID: ${animeFlvId}, Episode: ${episodeNumber}`);
  return await fetchVideoSources(animeFlvId, episodeNumber);
}
