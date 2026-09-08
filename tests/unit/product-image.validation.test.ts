import { describe, expect, it } from "vitest";
import {
  PRODUCT_IMAGE_MAX_BYTES,
  validateProductImageUpload,
} from "@/features/media/product-image.validation";

describe("validateProductImageUpload", () => {
  it("rejects MIME types other than jpeg, png, and webp", () => {
    const result = validateProductImageUpload({
      mime: "image/gif",
      size: 1024,
      currentCount: 0,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.images).toEqual([
        "Usa una foto JPG, PNG o WebP.",
      ]);
    }
  });

  it("rejects files larger than 5 MB", () => {
    const result = validateProductImageUpload({
      mime: "image/jpeg",
      size: PRODUCT_IMAGE_MAX_BYTES + 1,
      currentCount: 0,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.images).toEqual([
        "La foto no puede superar 5 MB.",
      ]);
    }
  });

  it("rejects a thirteenth image", () => {
    const result = validateProductImageUpload({
      mime: "image/png",
      size: 1024,
      currentCount: 12,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.images).toEqual([
        "Puedes subir hasta 12 fotos por producto.",
      ]);
    }
  });

  it.each(["image/jpeg", "image/png", "image/webp"] as const)(
    "accepts a %s photo under the size and count limits",
    (mime) => {
      expect(
        validateProductImageUpload({
          mime,
          size: PRODUCT_IMAGE_MAX_BYTES,
          currentCount: 11,
        }),
      ).toEqual({ success: true });
    },
  );
});
