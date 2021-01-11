"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsnConvert = void 0;
const parser_1 = require("./parser");
const serializer_1 = require("./serializer");
class AsnConvert {
    static serialize(obj) {
        return serializer_1.AsnSerializer.serialize(obj);
    }
    static parse(data, target) {
        return parser_1.AsnParser.parse(data, target);
    }
}
exports.AsnConvert = AsnConvert;
