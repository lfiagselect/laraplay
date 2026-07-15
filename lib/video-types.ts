// LARAPLAY — Type vidéo partagé (client + serveur).
// VIDEO-01: Bunny est la source de vérité unique; bunnyId obligatoire.
// Importable depuis les composants client (aucune dépendance server-only).

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
  views?: number;
}
