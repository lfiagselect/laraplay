// LARAPLAY — Drive operations
// List vidéos récursif depuis dossier racine + métadonnées + stream via fetch.

import { getDrive } from "./google";
import { google } from "googleapis";

export interface VideoFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  videoMediaMetadata?: {
    width?: number;
    height?: number;
    durationMillis?: string;
  };
  parents?: string[];
  modifiedTime?: string;
  description?: string;
  category?: string;
}

const VIDEO_MIME_PREFIX = "video/";
const FOLDER_MIME = "application/vnd.google-apps.folder";

const FIELDS =
  "files(id,name,mimeType,size,thumbnailLink,videoMediaMetadata,parents,modifiedTime,description),nextPageToken";

export async function listAllVideos(rootFolderId: string): Promise<VideoFile[]> {
  const drive = getDrive();
  const videos: VideoFile[] = [];

  const folderNames = new Map<string, string>();
  folderNames.set(rootFolderId, "Racine");

  const folderQueue: string[] = [rootFolderId];

  while (folderQueue.length > 0) {
    const folderId = folderQueue.shift()!;
    let pageToken: string | undefined;

    do {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: FIELDS,
        pageSize: 1000,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const files = res.data.files ?? [];
      for (const f of files) {
        if (!f.id || !f.name || !f.mimeType) continue;

        if (f.mimeType === FOLDER_MIME) {
          folderNames.set(f.id, f.name);
          folderQueue.push(f.id);
        } else if (f.mimeType.startsWith(VIDEO_MIME_PREFIX)) {
          videos.push({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            size: f.size ?? undefined,
            thumbnailLink: f.thumbnailLink ?? undefined,
            videoMediaMetadata: f.videoMediaMetadata
              ? {
                  width: f.videoMediaMetadata.width ?? undefined,
                  height: f.videoMediaMetadata.height ?? undefined,
                  durationMillis: f.videoMediaMetadata.durationMillis ?? undefined,
                }
              : undefined,
            parents: f.parents ?? undefined,
            modifiedTime: f.modifiedTime ?? undefined,
            description: f.description ?? undefined,
            category: folderNames.get(f.parents?.[0] ?? "") ?? "Racine",
          });
        }
      }

      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
  }

  return videos;
}

export async function getVideo(fileId: string): Promise<VideoFile | null> {
  const drive = getDrive();
  try {
    const res = await drive.files.get({
      fileId,
      fields: "id,name,mimeType,size,thumbnailLink,videoMediaMetadata,parents,modifiedTime,description",
      supportsAllDrives: true,
    });
    const f = res.data;
    if (!f.id || !f.name || !f.mimeType?.startsWith(VIDEO_MIME_PREFIX)) return null;
    return {
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size ?? undefined,
      thumbnailLink: f.thumbnailLink ?? undefined,
      videoMediaMetadata: f.videoMediaMetadata
        ? {
            width: f.videoMediaMetadata.width ?? undefined,
            height: f.videoMediaMetadata.height ?? undefined,
            durationMillis: f.videoMediaMetadata.durationMillis ?? undefined,
          }
        : undefined,
      parents: f.parents ?? undefined,
      modifiedTime: f.modifiedTime ?? undefined,
      description: f.description ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Récupère token OAuth depuis service account.
 * Permet fetch direct vers Drive (plus robuste pour streaming que googleapis stream).
 */
async function getAccessToken(): Promise<string> {
  const inlineJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const scopes = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/spreadsheets.readonly",
  ];

  let auth;
  if (inlineJson) {
    auth = new google.auth.GoogleAuth({ credentials: JSON.parse(inlineJson), scopes });
  } else if (keyFile) {
    auth = new google.auth.GoogleAuth({ keyFile, scopes });
  } else {
    throw new Error("Google credentials missing");
  }

  const client = await auth.getClient();
  const tokenResp = await client.getAccessToken();
  if (!tokenResp.token) throw new Error("Failed to get access token");
  return tokenResp.token;
}

/**
 * Stream vidéo via fetch direct vers Drive.
 * Plus robuste que googleapis stream pour gros fichiers.
 * Pipe response brute (Web ReadableStream natif).
 */
export async function fetchDriveStream(fileId: string, range?: string) {
  const token = await getAccessToken();
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (range) headers["Range"] = range;

  const res = await fetch(url, { headers });
  return res;
}
