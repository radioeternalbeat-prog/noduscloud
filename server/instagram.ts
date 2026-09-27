const API_VERSION = "v26.0";
const GRAPH_HOST = "https://graph.facebook.com";

type InstagramPublishInput = {
  mediaUrl: string;
  mediaType: "IMAGE" | "REELS";
  caption?: string;
};

type InstagramResponse = { id?: string; error?: { message?: string; type?: string; code?: number } };

function getConfig() {
  return {
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
    instagramUserId: process.env.INSTAGRAM_USER_ID,
    publicAppUrl: process.env.PUBLIC_APP_URL,
  };
}

export function instagramConfigStatus() {
  const config = getConfig();
  return { configured: Boolean(config.accessToken && config.instagramUserId && config.publicAppUrl), requiresProfessionalAccount: true };
}

async function instagramRequest(path: string, params: Record<string, string>) {
  const config = getConfig();
  if (!config.accessToken || !config.instagramUserId) throw new Error("Instagram aún no está conectado en la configuración del servidor.");
  const body = new URLSearchParams({ ...params, access_token: config.accessToken });
  const response = await fetch(`${GRAPH_HOST}/${API_VERSION}${path}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const data = await response.json() as InstagramResponse;
  if (!response.ok || data.error) throw new Error(data.error?.message || `Instagram respondió con HTTP ${response.status}.`);
  return data;
}

export async function publishToInstagram(input: InstagramPublishInput) {
  const config = getConfig();
  if (!config.publicAppUrl) throw new Error("Falta PUBLIC_APP_URL para que Instagram pueda acceder al archivo.");
  const mediaUrl = new URL(input.mediaUrl, config.publicAppUrl).toString();
  const container = await instagramRequest(`/${config.instagramUserId}/media`, input.mediaType === "IMAGE" ? { image_url: mediaUrl, caption: input.caption || "" } : { media_type: "REELS", video_url: mediaUrl, caption: input.caption || "" });
  if (!container.id) throw new Error("Instagram no devolvió el identificador del contenedor.");
  if (input.mediaType === "REELS") {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const statusResponse = await fetch(`${GRAPH_HOST}/${API_VERSION}/${container.id}?fields=status_code&access_token=${encodeURIComponent(config.accessToken as string)}`);
      const status = await statusResponse.json() as { status_code?: string; error?: { message?: string } };
      if (status.error) throw new Error(status.error.message || "Instagram no pudo preparar el video.");
      if (status.status_code === "ERROR" || status.status_code === "EXPIRED") throw new Error(`Instagram informó estado ${status.status_code}.`);
      if (status.status_code === "FINISHED" || status.status_code === "PUBLISHED") break;
    }
  }
  const published = await instagramRequest(`/${config.instagramUserId}/media_publish`, { creation_id: container.id });
  if (!published.id) throw new Error("Instagram no devolvió el identificador de la publicación.");
  return { id: published.id, containerId: container.id };
}
