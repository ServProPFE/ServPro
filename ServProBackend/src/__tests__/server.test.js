describe("server startup", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  /***Arrange-Act-Assert pattern is used in the tests to ensure clarity and maintainability. 
   * Each test case is structured to first set up the necessary environment and mocks (Arrange), 
   * then execute the code under test (Act), and finally verify the expected outcomes (Assert). 
   * This approach helps in isolating the behavior being tested and makes it easier to understand the purpose of each step in the test.
  ***/
  it("connects to the database and starts listening when configuration is valid", async () => {
    process.env.PORT = "4100";
    process.env.MONGODB_URI = "mongodb://localhost:27017/servpro-test";

    const listen = jest.fn((port, callback) => callback());
    const connectDb = jest.fn().mockResolvedValue();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {});

    jest.doMock("../app", () => ({
      app: { listen },
    }));
    jest.doMock("../config/db", () => ({ connectDb }));

    require("../server");
    await new Promise(process.nextTick);

    expect(connectDb).toHaveBeenCalledWith("mongodb://localhost:27017/servpro-test");
    expect(listen).toHaveBeenCalledWith("4100", expect.any(Function));
    expect(logSpy).toHaveBeenCalledWith("Server running on port 4100");
    expect(errorSpy).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("logs the error and exits when MONGODB_URI is missing", async () => {
    process.env.MONGODB_URI = "";

    const listen = jest.fn();
    const connectDb = jest.fn();
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {});

    jest.doMock("../app", () => ({
      app: { listen },
    }));
    jest.doMock("../config/db", () => ({ connectDb }));

    require("../server");
    await new Promise(process.nextTick);

    expect(connectDb).not.toHaveBeenCalled();
    expect(listen).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
    expect(exitSpy).toHaveBeenCalledWith(1);

    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });
});