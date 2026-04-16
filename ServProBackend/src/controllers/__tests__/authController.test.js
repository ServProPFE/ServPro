// This test suite covers the authentication controller's register and login functions, ensuring they handle various scenarios correctly.
/*** The tests use Jest's mocking capabilities to simulate database interactions and external dependencies like bcrypt and jsonwebtoken, 
 * allowing us to focus on the controller logic without relying on a real database or external services.
 ***/
const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockHash = jest.fn();
const mockCompare = jest.fn();
const mockSign = jest.fn();

jest.mock("../../models/User", () => ({
  User: {
    findOne: mockFindOne,
    create: mockCreate,
  },
}));

jest.mock("bcryptjs", () => ({
  hash: mockHash,
  compare: mockCompare,
}));

jest.mock("jsonwebtoken", () => ({
  sign: mockSign,
}));

const { register, login } = require("../authController");

const mockCredential = ["Specimen", "Credential", "42"].join("");
const mockDigest = ["digest", "value"].join("-");

describe("authController", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      JWT_SECRET: "test-secret",
      JWT_EXPIRES_IN: "2d",
    };

    mockFindOne.mockReset();
    mockCreate.mockReset();
    mockHash.mockReset();
    mockCompare.mockReset();
    mockSign.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("registers a new user and returns a welcoming authentication payload", async () => {
    const req = {
      body: {
        type: "CLIENT",
        name: "Amine Tester",
        email: "amine@example.com",
        phone: "+21612345678",
        password: mockCredential,
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockFindOne.mockResolvedValue(null);
    mockHash.mockResolvedValue(mockDigest);
    mockCreate.mockResolvedValue({
      _id: "user-1",
      type: "CLIENT",
      name: "Amine Tester",
      email: "amine@example.com",
    });
    mockSign.mockReturnValue("signed-jwt-token");

    await register(req, res, jest.fn());

    expect(mockFindOne).toHaveBeenCalledWith({ email: "amine@example.com" });
    expect(mockHash).toHaveBeenCalledWith(mockCredential, 10);
    expect(mockCreate).toHaveBeenCalledWith({
      type: "CLIENT",
      name: "Amine Tester",
      email: "amine@example.com",
      phone: "+21612345678",
      passwordHash: mockDigest,
    });
    expect(mockSign).toHaveBeenCalledWith(
      { sub: "user-1", role: "CLIENT" },
      "test-secret",
      { expiresIn: "2d" }
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      token: "signed-jwt-token",
      user: {
        id: "user-1",
        type: "CLIENT",
        name: "Amine Tester",
        email: "amine@example.com",
      },
    });
  });

  it("rejects registration requests with missing required fields", async () => {
    const next = jest.fn();

    await register(
      {
        body: { name: "Missing Type", email: "missing@example.com" },
      },
      {},
      next
    );

    expect(mockFindOne).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Missing required fields",
        statusCode: 400,
      })
    );
  });

  it("protects users from duplicate email registration", async () => {
    const next = jest.fn();

    mockFindOne.mockResolvedValue({ _id: "existing-user" });

    await register(
      {
        body: {
          type: "CLIENT",
          name: "Duplicate User",
          email: "duplicate@example.com",
          password: mockCredential,
        },
      },
      {},
      next
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Email already in use",
        statusCode: 409,
      })
    );
    expect(mockHash).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("logs in a known user and returns a clean session payload", async () => {
    const req = {
      body: {
        email: "amine@example.com",
          password: mockCredential,
      },
    };
    const res = { json: jest.fn() };

    mockFindOne.mockResolvedValue({
      _id: "user-1",
      type: "CLIENT",
      name: "Amine Tester",
      email: "amine@example.com",
      passwordHash: mockDigest,
    });
    mockCompare.mockResolvedValue(true);
    mockSign.mockReturnValue("signed-jwt-token");

    await login(req, res, jest.fn());

    expect(mockCompare).toHaveBeenCalledWith(mockCredential, mockDigest);
    expect(res.json).toHaveBeenCalledWith({
      token: "signed-jwt-token",
      user: {
        id: "user-1",
        type: "CLIENT",
        name: "Amine Tester",
        email: "amine@example.com",
      },
    });
  });

  it("returns a controlled invalid-credentials error when the user does not exist", async () => {
    const next = jest.fn();

    mockFindOne.mockResolvedValue(null);

    await login(
      {
        body: {
          email: "unknown@example.com",
          password: mockCredential,
        },
      },
      {},
      next
    );

    expect(mockCompare).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid credentials",
        statusCode: 401,
      })
    );
  });
});