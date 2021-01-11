import { AsnParser } from "./parser";
import { AsnSerializer } from "./serializer";
export class AsnConvert {
    static serialize(obj) {
        return AsnSerializer.serialize(obj);
    }
    static parse(data, target) {
        return AsnParser.parse(data, target);
    }
}
