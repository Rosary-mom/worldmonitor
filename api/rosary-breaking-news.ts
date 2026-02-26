// api/rosary-breaking-news.ts
export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Content-Type': 'application/json',
  };

  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/Rosary-mom/worldmonitor/main/data/breaking-news.json'
    );
    const data = await res.json();

    return new Response(JSON.stringify(data), { 
      status: 200, 
      headers: corsHeaders 
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Feed temporär nicht verfügbar' }), { 
      status: 503, 
      headers: corsHeaders 
    });
  }
}
