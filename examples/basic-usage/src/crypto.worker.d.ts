export declare class CryptoWorker {
    hashData(input: string): Promise<string>;
    generateKeyPair(): Promise<{
        publicKey: string;
        privateKey: string;
    }>;
}
