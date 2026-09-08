import { createClient } from "@supabase/supabase-js";

export const PRODUCT_IMAGES_BUCKET = "product-images";

export function extensionForMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  throw new Error("Unsupported image type");
}

export function productImageObjectKey(productId: string, mime: string) {
  return `${productId}/${crypto.randomUUID()}.${extensionForMime(mime)}`;
}

export function objectKeyFromPublicUrl(url: string) {
  const marker = `/object/public/${PRODUCT_IMAGES_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

export function createProductImageStorage(url: string, serviceRoleKey: string) {
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async upload(objectKey: string, body: Blob, contentType: string) {
      const { error } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(objectKey, body, { contentType, upsert: false });
      if (error) {
        throw new Error(error.message);
      }

      return supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .getPublicUrl(objectKey).data.publicUrl;
    },

    async remove(objectKey: string) {
      const { error } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .remove([objectKey]);
      if (error) {
        throw new Error(error.message);
      }
    },
  };
}
