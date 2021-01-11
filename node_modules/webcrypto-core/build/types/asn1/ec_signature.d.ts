export declare class EcDsaSignature {
    static fromWebCryptoSignature(value: BufferSource): EcDsaSignature;
    r: ArrayBuffer;
    s: ArrayBuffer;
    toWebCryptoSignature(pointSize?: number): ArrayBufferLike;
    private getPointSize;
    private addPadding;
    private removePadding;
}
