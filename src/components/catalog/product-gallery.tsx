"use client";

import { useRef, useState, type PointerEvent } from "react";
import { ProductMediaPlaceholder } from "@/components/catalog/product-media";
import { catalogMediaUrls, swipeMediaIndex } from "@/lib/catalog-image";

type ProductGalleryProps = {
  images: { url: string }[];
  title: string;
  slug?: string;
};

export function ProductGallery({ images, title, slug }: ProductGalleryProps) {
  const urls = catalogMediaUrls(images, slug);
  const [index, setIndex] = useState(0);
  const swipeOriginX = useRef<number | null>(null);

  if (urls.length === 0) {
    return <ProductMediaPlaceholder />;
  }

  const canSwipe = urls.length > 1;
  const current = urls[Math.min(index, urls.length - 1)]!;

  function onPointerDown(event: PointerEvent<HTMLImageElement>) {
    if (!canSwipe || !event.pointerType || event.pointerType === "mouse") {
      return;
    }

    swipeOriginX.current = event.clientX;
  }

  function onPointerUp(event: PointerEvent<HTMLImageElement>) {
    if (!canSwipe || swipeOriginX.current == null) {
      return;
    }

    const deltaX = event.clientX - swipeOriginX.current;
    swipeOriginX.current = null;
    setIndex((currentIndex) => swipeMediaIndex(currentIndex, deltaX, urls.length));
  }

  return (
    <div className="product-gallery">
      <div className="product-gallery__stage">
        <img
          alt={title}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          src={current}
        />
      </div>
      {canSwipe ? (
        <ul className="product-gallery__thumbs">
          {urls.map((url, thumbIndex) => (
            <li key={`${url}-${thumbIndex}`}>
              <button
                aria-current={thumbIndex === index}
                aria-label={`${title} ${thumbIndex + 1}`}
                className={
                  thumbIndex === index
                    ? "product-gallery__thumb is-active"
                    : "product-gallery__thumb"
                }
                onClick={() => setIndex(thumbIndex)}
                onMouseEnter={() => setIndex(thumbIndex)}
                type="button"
              >
                <img alt="" src={url} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
