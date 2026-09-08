"use client";

import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import {
  catalogMediaUrls,
  hoverScrubIndex,
  swipeMediaIndex,
} from "@/lib/catalog-image";

type ProductMediaProps = {
  images: { url: string }[];
  title: string;
  slug?: string;
};

export function ProductMediaPlaceholder() {
  return (
    <>
      <span>Selección Cauvira</span>
      <strong aria-hidden="true">CV</strong>
    </>
  );
}

export function ProductMedia({ images, title, slug }: ProductMediaProps) {
  const urls = catalogMediaUrls(images, slug);
  const [index, setIndex] = useState(0);
  const swipeOriginX = useRef<number | null>(null);
  const suppressClick = useRef(false);

  if (urls.length === 0) {
    return <ProductMediaPlaceholder />;
  }

  const canScrub = urls.length > 1;
  const current = urls[Math.min(index, urls.length - 1)]!;

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!canScrub || (event.pointerType && event.pointerType !== "mouse")) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setIndex(hoverScrubIndex(event.clientX - rect.left, rect.width, urls.length));
  }

  function onPointerLeave() {
    if (!canScrub) {
      return;
    }

    setIndex(0);
    swipeOriginX.current = null;
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!canScrub || !event.pointerType || event.pointerType === "mouse") {
      return;
    }

    swipeOriginX.current = event.clientX;
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!canScrub || swipeOriginX.current == null) {
      return;
    }

    const deltaX = event.clientX - swipeOriginX.current;
    swipeOriginX.current = null;
    setIndex((currentIndex) => {
      const nextIndex = swipeMediaIndex(currentIndex, deltaX, urls.length);
      if (nextIndex !== currentIndex) {
        suppressClick.current = true;
      }
      return nextIndex;
    });
  }

  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (!suppressClick.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressClick.current = false;
  }

  return (
    <div
      className="product-media"
      onClick={canScrub ? onClick : undefined}
      onPointerDown={canScrub ? onPointerDown : undefined}
      onPointerLeave={canScrub ? onPointerLeave : undefined}
      onPointerMove={canScrub ? onPointerMove : undefined}
      onPointerUp={canScrub ? onPointerUp : undefined}
    >
      <img alt={title} src={current} />
      {canScrub ? (
        <div
          aria-hidden="true"
          className="product-media__ticks"
          data-testid="gallery-ticks"
        >
          {urls.map((url, tickIndex) => (
            <span
              className={
                tickIndex === index
                  ? "product-media__tick product-media__tick--active"
                  : "product-media__tick"
              }
              key={`${url}-${tickIndex}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
