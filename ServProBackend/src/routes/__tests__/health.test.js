/**
 * This test suite validates the functionality of the health route, 
 * which is a simple endpoint designed to check the status of the application.
 */
const healthRouter = require("../health");

describe("health route", () => {
  it("responds with an ok status payload", () => {
    const layer = healthRouter.stack.find(
      (entry) => entry.route?.path === "/" && entry.route?.methods?.get
    );

    expect(layer).toBeDefined();

    const handler = layer.route.stack[0].handle;
    const res = { json: jest.fn() };

    handler({}, res);

    expect(res.json).toHaveBeenCalledWith({ status: "ok" });
  });
});