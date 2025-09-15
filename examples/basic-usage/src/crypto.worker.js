"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoWorker = void 0;
const common_1 = require("@nestjs/common");
const nestjs_worker_1 = require("nestjs-worker");
const crypto_1 = require("crypto");
let CryptoWorker = class CryptoWorker {
    hashData(input) {
        return __awaiter(this, void 0, void 0, function* () {
            const hash = (0, crypto_1.createHash)("sha256");
            for (let i = 0; i < 100000; i++) {
                hash.update(input + i);
            }
            return hash.digest("hex");
        });
    }
    generateKeyPair() {
        return __awaiter(this, void 0, void 0, function* () {
            const { publicKey, privateKey } = (0, crypto_1.generateKeyPairSync)("rsa", {
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
        });
    }
};
exports.CryptoWorker = CryptoWorker;
__decorate([
    (0, nestjs_worker_1.WorkerMethod)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CryptoWorker.prototype, "hashData", null);
__decorate([
    (0, nestjs_worker_1.WorkerMethod)({ timeout: 60000 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CryptoWorker.prototype, "generateKeyPair", null);
exports.CryptoWorker = CryptoWorker = __decorate([
    (0, common_1.Injectable)(),
    (0, nestjs_worker_1.Worker)("crypto-worker")
], CryptoWorker);
