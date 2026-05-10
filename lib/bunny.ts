// LARAPLAY — Bunny Stream API (source de vérité unique)
import "server-only";

const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID!;
const API_KEY = process.env.BUNNY_API_KEY!;
const PULL_ZONE = (process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");

export interface VideoFile {
  id: string;
  bunnyId: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  bunnyThumbnail?: string;
  videoMediaMetadata?: {
    width?: number;
    height?: number;
    durationMillis?: string;
  };
  modifiedTime?: string;
  createdTime?: string;
  description?: string;
  category?: string;
  collectionId?: string;
}

interface BunnyVideo {
  guid: string;
  title: string;
  dateUploaded: string;
  views: number;
  length: number;
  width: number;
  height: number;
  status: number;
  collectionId?: string;
  storageSize: number;
}

interface BunnyCollection {
  guid: string;
  name: string;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}${path}`, {
    headers: { AccessKey: API_KEY },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Bunny API error ${res.status} on ${path}`);
  return res.json();
}

async function fetchAllCollections(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const data = await apiFetch<{ items: BunnyCollection[] }>("/collections?itemsPerPage=100");
    for (const c of data.items ?? []) {
      map.set(c.guid, c.name);
    }
  } catch (err) {
    console.error("[bunny] fetchAllCollections error:", err);
  }
  return map;
}

async function fetchAllVideos(): Promise<BunnyVideo[]> {
  const all: BunnyVideo[] = [];
  let page = 1;
  while (true) {
    const data = await apiFetch<{ items: BunnyVideo[]; totalItems: number }>(
      `/videos?page=${page}&itemsPerPage=100&orderBy=date`
    );
    const items = (data.items ?? []).filter((v) => v.status === 4);
    all.push(...items);
    if (page * 100 >= data.totalItems) break;
    page++;
  }
  return all;
}

function thumbnailUrl(guid: string): string {
  return `https://${PULL_ZONE}/${guid}/thumbnail.jpg`;
}

export async function listAllVideos(): Promise<VideoFile[]> {
  const [videos, collections] = await Promise.all([
    fetchAllVideos(),
    fetchAllCollections(),
  ]);

  return videos.map((v) => {
    const thumb = PULL_ZONE ? thumbnailUrl(v.guid) : undefined;
    const durationMs = v.length ? String(v.length * 1000) : undefined;
    return {
      id: v.guid,
      bunnyId: v.guid,
      name: v.title,
      mimeType: "video/mp4",
      size: v.storageSize ? String(v.storageSize) : undefined,
      thumbnailLink: thumb,
      bunnyThumbnail: thumb,
      videoMediaMetadata: {
        width: v.width || undefined,
        height: v.height || undefined,
        durationMillis: durationMs,
      },
      createdTime: v.dateUploaded,
      modifiedTime: v.dateUploaded,
      category: v.collectionId ? collections.get(v.collectionId) ?? "Lara Fabian - Divers" : "Lara Fabian - Divers",
      collectionId: v.collectionId,
    };
  });
}