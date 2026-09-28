import { describe, expect, it } from "vitest";
import { normalizeLinkUrl } from "./link-utils";

describe("normalizeLinkUrl", () => {
  it("adds https to a domain without protocol", () => {
    expect(normalizeLinkUrl("eternalbeatmedios.netlify.app")).toBe("https://eternalbeatmedios.netlify.app/");
  });

  it("preserves a valid URL with path", () => {
    expect(normalizeLinkUrl("https://example.com/guia?tema=contenido")).toBe("https://example.com/guia?tema=contenido");
  });

  it("rejects blank values and invalid hosts", () => {
    expect(normalizeLinkUrl(" ")).toBeNull();
    expect(normalizeLinkUrl("no-es-un-dominio")).toBeNull();
  });
});
