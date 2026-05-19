const mockUse = jest.fn();
const mockOptions = jest.fn();
const mockDisable = jest.fn();
const mockJson = jest.fn(() => "json-middleware");

// Mocking the Express app and its methods to test the app configuration without starting an actual server
const mockExpress = jest.fn(() => ({ use: mockUse, options: mockOptions, disable: mockDisable }));
mockExpress.json = mockJson;

// Mocking the database connection function to prevent actual database interactions during tests
jest.mock("express", () => mockExpress);
jest.mock("cors", () => jest.fn(() => "cors-middleware"));
jest.mock("morgan", () => jest.fn(() => "morgan-middleware"));

jest.mock("../middleware/errorHandler", () => ({
  errorHandler: "error-handler-middleware",
}));

jest.mock("../routes/health", () => "health-routes");
jest.mock("../routes/auth", () => "auth-routes");
jest.mock("../routes/services", () => "services-routes");
jest.mock("../routes/bookings", () => "bookings-routes");
jest.mock("../routes/reviews", () => "reviews-routes");
jest.mock("../routes/offers", () => "offers-routes");
jest.mock("../routes/packages", () => "packages-routes");
jest.mock("../routes/invoices", () => "invoices-routes");
jest.mock("../routes/commissions", () => "commissions-routes");
jest.mock("../routes/reservationDetails", () => "reservation-details-routes");
jest.mock("../routes/tracking", () => "tracking-routes");
jest.mock("../routes/portfolios", () => "portfolios-routes");
jest.mock("../routes/competences", () => "competences-routes");
jest.mock("../routes/certifications", () => "certifications-routes");
jest.mock("../routes/availability", () => "availability-routes");
jest.mock("../routes/notations", () => "notations-routes");
jest.mock("../routes/transactions", () => "transactions-routes");
jest.mock("../routes/notifications", () => "notifications-routes");
jest.mock("../routes/chatbot", () => "chatbot-routes");
jest.mock("../routes/sse-realtime", () => "sse-realtime-routes");

describe("app configuration", () => {
  beforeEach(() => {
    jest.resetModules();
    mockUse.mockClear();
    mockOptions.mockClear();
    mockDisable.mockClear();
    mockJson.mockClear();
    mockExpress.mockClear();
  });

  it("registers core middlewares, feature routes, and the error handler", () => {
    const { app } = require("../app");

    expect(app).toBeDefined();
    expect(mockExpress).toHaveBeenCalledTimes(1);
    expect(mockDisable).toHaveBeenCalledWith("x-powered-by");
    expect(mockJson).toHaveBeenCalledTimes(1);

    expect(mockUse).toHaveBeenNthCalledWith(1, expect.any(Function));
    expect(mockUse).toHaveBeenNthCalledWith(2, "cors-middleware");
    expect(mockUse).toHaveBeenNthCalledWith(3, "json-middleware");
    expect(mockUse).toHaveBeenNthCalledWith(4, "morgan-middleware");
    expect(mockUse).toHaveBeenNthCalledWith(5, "/health", "health-routes");
    expect(mockUse).toHaveBeenNthCalledWith(6, "/auth", "auth-routes");
    expect(mockUse).toHaveBeenNthCalledWith(7, "/services", "services-routes");
    expect(mockUse).toHaveBeenNthCalledWith(8, "/bookings", "bookings-routes");
    expect(mockUse).toHaveBeenNthCalledWith(9, "/reviews", "reviews-routes");
    expect(mockUse).toHaveBeenNthCalledWith(10, "/offers", "offers-routes");
    expect(mockUse).toHaveBeenNthCalledWith(11, "/packages", "packages-routes");
    expect(mockUse).toHaveBeenNthCalledWith(12, "/invoices", "invoices-routes");
    expect(mockUse).toHaveBeenNthCalledWith(13, "/commissions", "commissions-routes");
    expect(mockUse).toHaveBeenNthCalledWith(14, "/reservation-details", "reservation-details-routes");
    expect(mockUse).toHaveBeenNthCalledWith(15, "/tracking", "tracking-routes");
    expect(mockUse).toHaveBeenNthCalledWith(16, "/portfolios", "portfolios-routes");
    expect(mockUse).toHaveBeenNthCalledWith(17, "/competences", "competences-routes");
    expect(mockUse).toHaveBeenNthCalledWith(18, "/certifications", "certifications-routes");
    expect(mockUse).toHaveBeenNthCalledWith(19, "/availability", "availability-routes");
    expect(mockUse).toHaveBeenNthCalledWith(20, "/notations", "notations-routes");
    expect(mockUse).toHaveBeenNthCalledWith(21, "/transactions", "transactions-routes");
    expect(mockUse).toHaveBeenNthCalledWith(22, "/notifications", "notifications-routes");
    expect(mockUse).toHaveBeenNthCalledWith(23, "/chatbot", "chatbot-routes");
    expect(mockUse).toHaveBeenNthCalledWith(24, "/realtime", "sse-realtime-routes");
    expect(mockUse).toHaveBeenNthCalledWith(25, "error-handler-middleware");
  });
});