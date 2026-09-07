import { expect, it, vi } from "vitest";

const { auth, get, post, toNextJsHandler } = vi.hoisted(() => {
  const get = vi.fn();
  const post = vi.fn();

  return {
    auth: { api: {} },
    get,
    post,
    toNextJsHandler: vi.fn(() => ({ GET: get, POST: post })),
  };
});

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("better-auth/next-js", () => ({ toNextJsHandler }));

import { GET, POST } from "@/app/api/auth/[...all]/route";

it("exposes Better Auth through Next.js GET and POST handlers", () => {
  expect(GET).toBe(get);
  expect(POST).toBe(post);
});
