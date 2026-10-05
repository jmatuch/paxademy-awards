import { describe, expect, it } from "vitest";
import { mentionList, truncate } from "./blockHelpers.js";

describe("mentionList", () => {
  it("formats a single mention", () => {
    expect(mentionList(["U1"])).toBe("<@U1>");
  });

  it("joins two mentions with 'and'", () => {
    expect(mentionList(["U1", "U2"])).toBe("<@U1> and <@U2>");
  });

  it("joins three+ mentions with commas and a trailing 'and'", () => {
    expect(mentionList(["U1", "U2", "U3"])).toBe("<@U1>, <@U2>, and <@U3>");
  });
});

describe("truncate", () => {
  it("leaves short text untouched", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates with an ellipsis when over the limit", () => {
    const result = truncate("hello world", 8);
    expect(result).toBe("hello w…");
    expect(result.length).toBe(8);
  });
});
