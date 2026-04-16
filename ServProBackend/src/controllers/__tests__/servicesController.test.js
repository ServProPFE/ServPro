/** 
 * This test suite validates the functionality of the servicesController, which manages CRUD operations for service entities in the application.
 * The tests cover listing services with filters, retrieving a service by ID, creating a new service, updating an existing service, and deleting a service.
 * Jest's mocking capabilities are utilized to simulate database interactions, allowing us to focus on the controller logic without relying on a real database.
 * Each test case follows the Arrange-Act-Assert pattern to ensure clarity and maintainability.
 * By verifying the expected outcomes for various scenarios, we can ensure that the servicesController behaves correctly and handles edge cases gracefully.
*/
const mockFind = jest.fn();
const mockFindById = jest.fn();
const mockCreate = jest.fn();
const mockFindByIdAndDelete = jest.fn();

jest.mock("../../models/Service", () => ({
  Service: {
    find: mockFind,
    findById: mockFindById,
    create: mockCreate,
    findByIdAndDelete: mockFindByIdAndDelete,
  },
}));

const {
  listServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} = require("../servicesController");

describe("servicesController", () => {
  beforeEach(() => {
    mockFind.mockReset();
    mockFindById.mockReset();
    mockCreate.mockReset();
    mockFindByIdAndDelete.mockReset();
  });

  it("lists services using the requested filters in a predictable order", async () => {
    const mockLean = jest.fn().mockResolvedValue([{ _id: "service-1" }]);
    const mockSort = jest.fn().mockReturnValue({ lean: mockLean });

    mockFind.mockReturnValue({ sort: mockSort });

    const res = { json: jest.fn() };

    await listServices(
      { query: { category: "PLOMBERIE", providerId: "provider-7" } },
      res,
      jest.fn()
    );

    expect(mockFind).toHaveBeenCalledWith({
      category: "PLOMBERIE",
      provider: "provider-7",
    });
    expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res.json).toHaveBeenCalledWith({ items: [{ _id: "service-1" }] });
  });

  it("returns a service by id when it exists", async () => {
    const mockLean = jest.fn().mockResolvedValue({ _id: "service-1", name: "Quick Fix" });
    const mockPopulate = jest.fn().mockReturnValue({ lean: mockLean });

    mockFindById.mockReturnValue({ populate: mockPopulate });

    const res = { json: jest.fn() };

    await getServiceById({ params: { id: "service-1" } }, res, jest.fn());

    expect(mockPopulate).toHaveBeenCalledWith("provider", "name email phone");
    expect(res.json).toHaveBeenCalledWith({ _id: "service-1", name: "Quick Fix" });
  });

  it("reports a friendly not-found error when a service is missing", async () => {
    const mockLean = jest.fn().mockResolvedValue(null);
    const mockPopulate = jest.fn().mockReturnValue({ lean: mockLean });
    const next = jest.fn();

    mockFindById.mockReturnValue({ populate: mockPopulate });

    await getServiceById({ params: { id: "missing-service" } }, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Service not found",
        statusCode: 404,
      })
    );
  });

  it("creates a service and returns it with a 201 response", async () => {
    const req = {
      body: {
        provider: "provider-1",
        name: "Premium Cleaning",
        category: "NETTOYAGE",
        priceMin: 80,
        priceMax: 150,
        duration: 120,
        currency: "TND",
      },
    };
    const createdService = { _id: "service-2", ...req.body };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockCreate.mockResolvedValue(createdService);

    await createService(req, res, jest.fn());

    expect(mockCreate).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(createdService);
  });

  it("updates an existing service and persists the new values", async () => {
    const save = jest.fn().mockResolvedValue();
    const service = {
      _id: "service-3",
      name: "Old Name",
      category: "PLOMBERIE",
      save,
    };
    const req = {
      params: { id: "service-3" },
      body: {
        name: "Updated Name",
        category: "ELECTRICITE",
        priceMin: 60,
        priceMax: 140,
        duration: 90,
        currency: "TND",
      },
    };
    const res = { json: jest.fn() };

    mockFindById.mockResolvedValue(service);

    await updateService(req, res, jest.fn());

    expect(service.name).toBe("Updated Name");
    expect(service.category).toBe("ELECTRICITE");
    expect(save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(service);
  });

  it("confirms when a service has been deleted", async () => {
    const res = { json: jest.fn() };

    mockFindByIdAndDelete.mockResolvedValue({ _id: "service-4" });

    await deleteService({ params: { id: "service-4" } }, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ message: "Service deleted" });
  });
});