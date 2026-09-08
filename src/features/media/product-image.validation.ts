import { z } from "zod";

export const PRODUCT_IMAGE_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_MAX_COUNT = 12;

export const STORAGE_CONFIG_ERROR =
  "No se puede subir la foto: falta configuración de almacenamiento.";

const uploadInputSchema = z
  .object({
    mime: z.string(),
    size: z.number(),
    currentCount: z.number(),
  })
  .superRefine((value, context) => {
    if (
      !PRODUCT_IMAGE_ALLOWED_MIME.includes(
        value.mime as (typeof PRODUCT_IMAGE_ALLOWED_MIME)[number],
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["images"],
        message: "Usa una foto JPG, PNG o WebP.",
      });
    }

    if (value.size > PRODUCT_IMAGE_MAX_BYTES) {
      context.addIssue({
        code: "custom",
        path: ["images"],
        message: "La foto no puede superar 5 MB.",
      });
    }

    if (value.currentCount >= PRODUCT_IMAGE_MAX_COUNT) {
      context.addIssue({
        code: "custom",
        path: ["images"],
        message: "Puedes subir hasta 12 fotos por producto.",
      });
    }
  });

export type ProductImageActionResult =
  | { ok: true; images: Array<{ id: string; url: string; sortOrder: number }> }
  | { ok: false; fieldErrors: Record<string, string[]> };

export function validateProductImageUpload(input: {
  mime: string;
  size: number;
  currentCount: number;
}):
  | { success: true }
  | { success: false; fieldErrors: { images: string[] } } {
  const parsed = uploadInputSchema.safeParse(input);
  if (parsed.success) {
    return { success: true };
  }

  return {
    success: false,
    fieldErrors: {
      images: parsed.error.issues.map((issue) => issue.message),
    },
  };
}
