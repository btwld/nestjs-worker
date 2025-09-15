import { Injectable } from "@nestjs/common";
import { Worker, WorkerMethod } from "nestjs-worker";
import { createHash, generateKeyPairSync } from "crypto";

@Injectable()
@Worker("crypto-worker")
export class CryptoWorker {
  @WorkerMethod()
  async hashData(input: string): Promise<string> {
    // Simulate CPU-intensive hashing
    const hash = createHash("sha256");

    // Add some artificial delay to simulate heavy computation
    for (let i = 0; i < 100000; i++) {
      hash.update(input + i);
    }

    return hash.digest("hex");
  }

  @WorkerMethod({ timeout: 60000 })
  async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    // CPU-intensive key generation
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    });

    return { publicKey, privateKey };
  }
}
