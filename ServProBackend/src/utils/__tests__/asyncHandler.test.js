const { asyncHandler } = require("../asyncHandler");

describe("asyncHandler", () => {
  it("calls the wrapped handler with req, res, and next", async () => {
    const req = { id: "req-1" };
    const res = { ok: true };
    const next = jest.fn();
    const handler = jest.fn().mockResolvedValue("done");

    await asyncHandler(handler)(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards rejected errors to next", async () => {
    const error = new Error("Database unavailable");
    const next = jest.fn();
    const handler = jest.fn().mockRejectedValue(error);

    await asyncHandler(handler)({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});