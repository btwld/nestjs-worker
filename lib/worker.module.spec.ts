import { WorkerModule } from "./worker.module";

describe("WorkerModule", () => {
  it("should be defined", () => {
    expect(WorkerModule).toBeDefined();
  });

  it("should have forRoot method", () => {
    expect(typeof WorkerModule.forRoot).toBe("function");
  });

  it("should have forRootAsync method", () => {
    expect(typeof WorkerModule.forRootAsync).toBe("function");
  });

  it("should create module with forRoot", () => {
    const module = WorkerModule.forRoot({
      global: {
        defaultMaxInstances: 2,
        defaultTimeout: 5000,
      },
    });

    expect(module).toBeDefined();
    expect(module.module).toBe(WorkerModule);
  });

  it("should create module with forRootAsync", () => {
    const module = WorkerModule.forRootAsync({
      useFactory: () => ({
        global: {
          defaultMaxInstances: 3,
          defaultTimeout: 10000,
        },
      }),
    });

    expect(module).toBeDefined();
    expect(module.module).toBe(WorkerModule);
  });
});
