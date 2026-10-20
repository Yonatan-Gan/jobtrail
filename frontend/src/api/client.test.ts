import { describe, expect, it, vi } from "vitest";
import { ApiError, apiUrl, describeError, request } from "./client";

function mockFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("apiUrl", () => {
  it("joins VITE_API_URL and the path, and encodes query values", () => {
    const jobUrl = "https://jobs.example/a?id=7&ref=li";
    const url = new URL(
      apiUrl("/applications", { status: "applied", job_url: jobUrl }),
    );

    expect(url.origin + url.pathname).toBe("http://api.test/applications");
    expect(url.searchParams.get("status")).toBe("applied");
    expect(url.searchParams.get("job_url")).toBe(jobUrl);
  });

  it("leaves out empty query values", () => {
    const url = apiUrl("/applications", {
      status: undefined,
      company_id: null,
      job_url: "",
    });
    expect(url).toBe("http://api.test/applications");
  });
});

describe("request", () => {
  it("sends a JSON body and returns the parsed response", async () => {
    const fetchMock = mockFetch(
      Response.json({ id: 1, name: "Wix" }, { status: 201 }),
    );

    const company = await request("/companies", {
      method: "POST",
      body: { name: "Wix" },
    });

    expect(company).toEqual({ id: 1, name: "Wix" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/companies");
    expect(init).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Wix" }),
    });
  });

  it("throws an ApiError with the API's detail message", async () => {
    mockFetch(
      Response.json(
        { detail: "Cannot move from 'saved' to 'offer'" },
        { status: 409 },
      ),
    );

    const error = await request("/applications/1/status").catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      message: "Cannot move from 'saved' to 'offer'",
    });
  });

  it("keeps the field errors of a 422 in detail", async () => {
    const detail = [
      { loc: ["body", "title"], msg: "Field required", type: "missing" },
    ];
    mockFetch(Response.json({ detail }, { status: 422 }));

    const error = await request("/applications").catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 422, detail });
  });

  it("returns undefined for 204 No Content", async () => {
    mockFetch(new Response(null, { status: 204 }));
    await expect(
      request("/applications/1", { method: "DELETE" }),
    ).resolves.toBeUndefined();
  });
});

describe("describeError", () => {
  it("explains that the API can't be reached", () => {
    expect(describeError(new TypeError("Failed to fetch"))).toBe(
      "Cannot reach the JobTrail API. Is the backend running?",
    );
  });
});
