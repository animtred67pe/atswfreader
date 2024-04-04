var ByteStream = function() {
	this.arrayBuffer = null;
	this.dataView = null;
	this.start = 0;
	this.end = 0;
	this.bit_offset = 0;
	this._position = 0;
	this.littleEndian = true;
}
Object.defineProperties(ByteStream.prototype, {
	"position": {
		get: function() {
			return this._position - this.start;
		},
		set: function(value) {
			this._position = (value + this.start);
		}
	}
});
ByteStream.prototype.setData = function(arrayBuffer) {
	this.arrayBuffer = arrayBuffer;
	this.dataView = new DataView(arrayBuffer);
	this.end = arrayBuffer.byteLength;
}
ByteStream.prototype.readString = function(length) {
	var str = "";
	var count = length;
	while (count) {
		var code = this.dataView.getUint8(this._position++);
		str += String.fromCharCode(code);
		count--;
	}
	return str;
}
ByteStream.prototype.readBytes = function(length) {
	this.byteAlign();
	var bytes = this.arrayBuffer.slice(this._position, this._position + length);
	this._position += length;
	return bytes;
}
ByteStream.prototype.readStringWithUntil = function() {
	this.byteAlign();
	var bo = this._position;
	var offset = 0;
	var length = this.end;
	var ret = '';
	while (true) {
		var val = this.dataView.getUint8(bo + offset);
		offset++;
		if (val === 0 || (bo + offset) >= length) {
			break;
		}
		ret += String.fromCharCode(val);
	}
	this._position = bo + offset;
	return ret;
}
ByteStream.prototype.readStringWithLength = function() {
	var count = this.readUint8();
	var val = '';
	while (count--) {
		var dat = this.dataView.getUint8(this._position++);;
		if (dat == 0) {
			continue;
		}
		val += String.fromCharCode(dat);
	}
	return val;
}
ByteStream.prototype.incrementOffset = function(byteInt, bitInt) {
	this._position += byteInt;
	this.bit_offset += bitInt;
	this.byteCarry();
}
ByteStream.prototype.setOffset = function(byteInt, bitInt) {
	this._position = byteInt + this.start;
	this.bit_offset = bitInt;
}
ByteStream.prototype.getLength = function() {
	return this.end - this.start;
};
ByteStream.prototype.getBytesAvailable = function() {
	return this.end - this._position;
};
//////// ByteReader ////////
ByteStream.prototype.byteAlign = function() {
	if (!this.bit_offset) return;
	this._position += ((this.bit_offset + 7) / 8) | 0;
	this.bit_offset = 0;
}
ByteStream.prototype.readUint8 = function() {
	this.byteAlign();
	return this.dataView.getUint8(this._position++);
}
ByteStream.prototype.readUint16 = function() {
	this.byteAlign();
	var value = this.dataView.getUint16(this._position, this.littleEndian);
	this._position += 2;
	return value;
}
ByteStream.prototype.readUint24 = function() {
	this.byteAlign();
	var value = this.dataView.getUint8(this._position++);
	value += (0x100 * this.dataView.getUint8(this._position++));
	value += (0x10000 * this.dataView.getUint8(this._position++));
	return value;
}
ByteStream.prototype.readUint32 = function() {
	this.byteAlign();
	var value = this.dataView.getUint32(this._position, this.littleEndian);
	this._position += 4;
	return value;
}
ByteStream.prototype.readUint64 = function() {
	this.byteAlign();
	var value = this.dataView.getUint8(this._position++);
	value += (0x100 * this.dataView.getUint8(this._position++));
	value += (0x10000 * this.dataView.getUint8(this._position++));
	value += (0x1000000 * this.dataView.getUint8(this._position++));
	value += (0x100000000 * this.dataView.getUint8(this._position++));
	value += (0x10000000000 * this.dataView.getUint8(this._position++));
	value += (0x1000000000000 * this.dataView.getUint8(this._position++));
	value += ((0x100000000 * 0x1000000) * this.dataView.getUint8(this._position++));
	return value;
}
ByteStream.prototype.readInt8 = function() {
	this.byteAlign();
	return this.dataView.getInt8(this._position++);
}
ByteStream.prototype.readInt16 = function() {
	this.byteAlign();
	var value = this.dataView.getInt16(this._position, this.littleEndian);
	this._position += 2;
	return value;
}
ByteStream.prototype.readInt24 = function() {
	let t = this.readUint24();
	return t >> 23 && (t -= 16777216),t
}
ByteStream.prototype.readInt32 = function() {
	this.byteAlign();
	var value = this.dataView.getInt32(this._position, this.littleEndian);
	this._position += 4;
	return value;
}
ByteStream.prototype.readFixed8 = function() {
	return +(this.readInt16() / 0x100).toFixed(1);
}
ByteStream.prototype.readFixed16 = function() {
	return +(this.readInt32() / 0x10000).toFixed(2);
}
ByteStream.prototype.readFloat16 = function() {
	const t = this.dataView.getUint8(this._position++);
	let e = 0;
	return e |= this.dataView.getUint8(this._position++) << 8,e |= t << 0,e
}
ByteStream.prototype.readFloat32 = function() {
	var t = this.dataView.getUint8(this._position++);
	var e = this.dataView.getUint8(this._position++)
	var s = this.dataView.getUint8(this._position++);
	var a = 0;
	a |= this.dataView.getUint8(this._position++) << 24,a |= s << 16,a |= e << 8,a |= t << 0;
	const i = a >> 23 & 255;
	return a && 2147483648 !== a ? (2147483648 & a ? -1 : 1) * (8388608 | 8388607 & a) * Math.pow(2, i - 127 - 23) : 0
}
ByteStream.prototype.readFloat64 = function() {
	var upperBits = this.readUint32();
	var lowerBits = this.readUint32();
	var sign = upperBits >>> 31 & 0x1;
	var exp = upperBits >>> 20 & 0x7FF;
	var upperFraction = upperBits & 0xFFFFF;
	return (!upperBits && !lowerBits) ? 0 : ((sign === 0) ? 1 : -1) * (upperFraction / 1048576 + lowerBits / 4503599627370496 + 1) * Math.pow(2, exp - 1023);
}
ByteStream.prototype.readDouble = function() {
	var v = this.dataView.getFloat64(this._position, this.littleEndian);
	this._position += 8;
	return v;
}
ByteStream.prototype.getU30 = function() {
	this.byteAlign();
	let t = 0;
	for (let e = 0; 5 > e; ++e) {
		const s = this.dataView.getUint8(this._position++);
		if (t |= (127 & s) << 7 * e, !(128 & s)) break
	}
	return t
}
ByteStream.prototype.getS30 = function() {
	const t = this._position;
	let e = this.getU30();
	const s = 8 * (this._position - t) | 0;
	return e >> s - 1 && (e -= Math.pow(2, s)),e
}
//////// BitReader ////////
ByteStream.prototype.byteCarry = function() {
	if (this.bit_offset > 7) {
		this._position += ((this.bit_offset + 7) / 8) | 0;
		this.bit_offset &= 0x07;
	} else {
		while (this.bit_offset < 0) {
			this._position--;
			this.bit_offset += 8;
		}
	}
}
ByteStream.prototype.getUIBits = function(n) {
	var value = 0;
	while (n--) {
		value <<= 1;
		value |= this.getUIBit();
	}
	return value;
}
ByteStream.prototype.getUIBit = function() {
	this.byteCarry();
	return (this.dataView.getUint8(this._position) >> (7 - this.bit_offset++)) & 0x1;	
}
ByteStream.prototype.getSIBits = function(n) {
	var value = this.getUIBits(n);
	var msb = value & (0x1 << (n - 1));
	if (msb) {
		var bitMask = (2 * msb) - 1;
		return -(value ^ bitMask) - 1;
	}
	return value;
}
ByteStream.prototype.getSIBitsFixed8 = function(n) {
	return +(this.getSIBits(n) / 0x100).toFixed(2);
}
ByteStream.prototype.getSIBitsFixed16 = function(n) {
	return +(this.getSIBits(n) / 0x10000).toFixed(4);
}
var zlibParser = function(data, size, startOffset) {
	this.stream = new Uint8Array(data);
	this.isEnd = false;
	this.result = null;
	this.size = size + startOffset;
	this.loaded = 0;
	this.isLoad = false;
	this._data = new Uint8Array(size);
	for (let i = 0; i < startOffset; i++) {
		this._data[i] = this.stream[i];
	}
	this._size = startOffset;
	this.byte_offset = startOffset + 2;
	this.bit_offset = 8;
	this.bit_buffer = null;
}
zlibParser.fixedDistTable = {
	key: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
	value: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]
}
zlibParser.fixedLitTable = {
	key: [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
	value: [256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 280, 281, 282, 283, 284, 285, 286, 287, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255]
}
zlibParser.ORDER = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
zlibParser.LEXT = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 99, 99]);
zlibParser.LENS = new Uint16Array([3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0]);
zlibParser.DEXT = new Uint8Array([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]);
zlibParser.DISTS = new Uint16Array([ 1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577]);
zlibParser.decompress = function(arrayBuffer, uncompressedSizesize, startOffset) {
	var r = new zlibParser(arrayBuffer, uncompressedSizesize, startOffset || 0);
	return r.tick(true);
}
zlibParser.prototype.readUB = function(length) {
	var value = 0;
	for (var i = 0; i < length; i++) {
		if (this.bit_offset === 8) {
			this.bit_buffer = this.readNumber(1);
			this.bit_offset = 0;
		}
		value |= (this.bit_buffer & (1 << this.bit_offset++) ? 1 : 0) << i;
	}
	return value;
}
zlibParser.prototype.readNumber = function(n) {
	var value = 0;
	var o = this.byte_offset;
	var i = o + n;
	while (i > o) {
		value = (value << 8) | this.stream[--i];
	}
	this.byte_offset += n;
	return value;
}
zlibParser.prototype.tick = function(tsTurbo) {
	if (this.isEnd) {
		return;
	}
	var _buildHuffTable = this.buildHuffTable.bind(this);
	var _decodeSymbol = this.decodeSymbol.bind(this);
	var sym = 0;
	var i = 0;
	var length = 0;
	var data = this._data;
	var _this = this;
	var flag = 0;
	var _size = this._size;
	var startTime = Date.now();
	while (true) {
		flag = _this.readUB(1);
		var type = _this.readUB(2);
		var distTable = null;
		var litTable = null;
		switch (type) {
			case 0:
				this.bit_offset = 8;
				this.bit_buffer = null;
				length = _this.readNumber(2);
				_this.readNumber(2);
				while (length--) {
					data[_size++] = _this.readNumber(1);
				}
				break;
			default:
				switch (type) {
					case 1:
						distTable = zlibParser.fixedDistTable;
						litTable = zlibParser.fixedLitTable;
						break;
					default:
						const numLitLengths = _this.readUB(5) + 257;
						const numDistLengths = _this.readUB(5) + 1;
						const numCodeLengths = _this.readUB(4) + 4;
						var codeLengths = new Uint8Array(19);
						for (i = 0; i < numCodeLengths; i++) {
							codeLengths[zlibParser.ORDER[i]] = _this.readUB(3);
						}
						const codeTable = _buildHuffTable(codeLengths);
						codeLengths = null;
						var prevCodeLen = 0;
						const maxLengths = numLitLengths + numDistLengths;
						const litLengths = new Array(maxLengths);
						let litLengthSize = 0;
						while (litLengthSize < maxLengths) {
							sym = _decodeSymbol(_this, codeTable.key, codeTable.value);
							switch (sym) {
								case 0:
								case 1:
								case 2:
								case 3:
								case 4:
								case 5:
								case 6:
								case 7:
								case 8:
								case 9:
								case 10:
								case 11:
								case 12:
								case 13:
								case 14:
								case 15:
									litLengths[litLengthSize++] = sym;
									prevCodeLen = sym;
									break;
								case 16:
									i = _this.readUB(2) + 3;
									while (i--) {
										litLengths[litLengthSize++] = prevCodeLen;
									}
									break;
								case 17:
									i = _this.readUB(3) + 3;
									while (i--) {
										litLengths[litLengthSize++] = 0;
									}
									break;
								case 18:
									i = _this.readUB(7) + 11;
									while (i--) {
										litLengths[litLengthSize++] = 0;
									}
									break;
							}
						}
						distTable = _buildHuffTable(litLengths.splice(numLitLengths, numDistLengths));
						litTable = _buildHuffTable(litLengths);
				}
				sym = 0;
				while (true) {
					sym = (0 | _decodeSymbol(_this, litTable.key, litTable.value));
					if (256 === sym) break;
					if (sym < 256) {
						data[_size++] = sym;
					} else {
						const mapIdx = sym - 257 | 0;
						length = zlibParser.LENS[mapIdx] + _this.readUB(zlibParser.LEXT[mapIdx]) | 0;
						const distMap = _decodeSymbol(_this, distTable.key, distTable.value);
						i = _size - (zlibParser.DISTS[distMap] + _this.readUB(zlibParser.DEXT[distMap]) | 0) | 0;
						while (length--) {
							data[_size++] = data[i++];
						}
					}
				}
		}
		if (flag) {
			this.isEnd = true;
			this.isLoad = true;
			if (_size !== this._data.length) {
				console.log("ZLib: " + _size + this._data.length + " has gone");
			}
			this.result = data.buffer;
			break;
		}
		if (!tsTurbo && ((Date.now() - startTime) > 20)) {
			break;
		}
	}
	if (tsTurbo) {
		return this.result;
	}
	this._size = _size;
	this.loaded = (_size / this.size);
}
zlibParser.prototype.buildHuffTable = function(data) {
	const length = data.length;
	const blCount = [];
	const nextCode = [];
	var maxBits = 0;
	for (var i = 0; i < length; i++) {
		maxBits = Math.max(maxBits, data[i]);
	}
	maxBits++;
	i = length;
	var len = 0;
	while (i--) {
		len = data[i];
		blCount[len] = (blCount[len] || 0) + (len > 0);
	}
	var code = 0;
	for (i = 1; i < maxBits; i++) {
		len = i - 1;
		if (!(len in blCount)) {
			blCount[len] = 0;
		}
		code = (code + blCount[len]) << 1;
		nextCode[i] = code | 0;
	}
	var key = [];
	var value = [];
	for (i = 0; i < length; i++) {
		len = data[i];
		if (len) {
			const tt = nextCode[len];
			key[tt] = len;
			value[tt] = i;
			nextCode[len] = tt + 1 | 0;
		}
	}
	return {key, value};
}
zlibParser.prototype.decodeSymbol = function(b, key, value) {
	var len = 0;
	var code = 0;
	while (true) {
		code = (code << 1) | b.readUB(1);
		len++;
		if (!(code in key)) {
			continue;
		}
		if (key[code] === len) {
			return value[code];
		}
	}
}
var LZMAParser = (function () {const LZMA = {init: function(e) {const t = [];t.push(e[12], e[13], e[14], e[15], e[16], e[4], e[5], e[6], e[7]);let s = 8;for (let e = 5; e < 9; ++e) {if (t[e] >= s) {t[e] = t[e] - s | 0;break}t[e] = 256 + t[e] - s | 0,s = 1}return t.push(0, 0, 0, 0),e.set(t, 4),e.subarray(4)},reverseDecode2: function(e, t, s, i) {let r = 1, o = 0, d = 0;for (; d < i; ++d) {const i = s.decodeBit(e, t + r);r = r << 1 | i,o |= i << d}return o},decompress: function(e, t) {const s = new Decoder, i = s.decodeHeader(e), r = i.uncompressedSize;if (s.setProperties(i),!s.decodeBody(e, t, r))throw new Error("Error in lzma data stream");return t}};class OutWindow {constructor() {this._buffer = null,this._stream = null,this._pos = 0,this._streamPos = 0,this._windowSize = 0}create(e) {this._buffer && this._windowSize === e || (this._buffer = new Uint8Array(e)),this._windowSize = e}flush() {const e = this._pos - this._streamPos;e && (this._stream.writeBytes(this._buffer, e),this._pos >= this._windowSize && (this._pos = 0),this._streamPos = this._pos)}releaseStream() {this.flush(),this._stream = null}setStream(e) {this._stream = e}init(e=!1) {e || (this._streamPos = 0,this._pos = 0)}copyBlock(e, t) {let s = this._pos - e - 1;for (s < 0 && (s += this._windowSize); t--; )s >= this._windowSize && (s = 0),this._buffer[this._pos++] = this._buffer[s++],this._pos >= this._windowSize && this.flush()}putByte(e) {this._buffer[this._pos++] = e,this._pos >= this._windowSize && this.flush()}getByte(e) {let t = this._pos - e - 1;return t < 0 && (t += this._windowSize),this._buffer[t]}}class RangeDecoder {constructor() {this._stream = null,this._code = 0,this._range = -1}setStream(e) {this._stream = e}releaseStream() {this._stream = null}init() {let e = 5;for (this._code = 0,this._range = -1; e--; )this._code = this._code << 8 | this._stream.readByte()}decodeDirectBits(e) {let t = 0, s = e;for (; s--; ) {this._range >>>= 1;const e = this._code - this._range >>> 31;this._code -= this._range & e - 1,t = t << 1 | 1 - e,0 == (4278190080 & this._range) && (this._code = this._code << 8 | this._stream.readByte(),this._range <<= 8)}return t}decodeBit(e, t) {const s = e[t], i = (this._range >>> 11) * s;return (2147483648 ^ this._code) < (2147483648 ^ i) ? (this._range = i,e[t] += 2048 - s >>> 5,0 == (4278190080 & this._range) && (this._code = this._code << 8 | this._stream.readByte(),this._range <<= 8),0) : (this._range -= i,this._code -= i,e[t] -= s >>> 5,0 == (4278190080 & this._range) && (this._code = this._code << 8 | this._stream.readByte(),this._range <<= 8),1)}}class BitTreeDecoder {constructor(e) {this._models = Array(1 << e).fill(1024),this._numBitLevels = e}decode(e) {let t = 1, s = this._numBitLevels;for (; s--; )t = t << 1 | e.decodeBit(this._models, t);return t - (1 << this._numBitLevels)}reverseDecode(e) {let t = 1, s = 0, i = 0;for (; i < this._numBitLevels; ++i) {const r = e.decodeBit(this._models, t);t = t << 1 | r,s |= r << i}return s}}class LenDecoder {constructor() {this._choice = [1024, 1024],this._lowCoder = [],this._midCoder = [],this._highCoder = new BitTreeDecoder(8),this._numPosStates = 0}create(e) {for (; this._numPosStates < e; ++this._numPosStates)this._lowCoder[this._numPosStates] = new BitTreeDecoder(3),this._midCoder[this._numPosStates] = new BitTreeDecoder(3)}decode(e, t) {return 0 === e.decodeBit(this._choice, 0) ? this._lowCoder[t].decode(e) : 0 === e.decodeBit(this._choice, 1) ? 8 + this._midCoder[t].decode(e) : 16 + this._highCoder.decode(e)}}class Decoder2 {constructor() {this._decoders = Array(768).fill(1024)}decodeNormal(e) {let t = 1;do {t = t << 1 | e.decodeBit(this._decoders, t)} while (t < 256);return 255 & t}decodeWithMatchByte(e, t) {let s = 1;do {const i = t >> 7 & 1;t <<= 1;const r = e.decodeBit(this._decoders, (1 + i << 8) + s);if (s = s << 1 | r,i !== r) {for (; s < 256; )s = s << 1 | e.decodeBit(this._decoders, s);break}} while (s < 256);return 255 & s}}class LiteralDecoder {constructor() {}create(e, t) {if (this._coders && this._numPrevBits === t && this._numPosBits === e)return;this._numPosBits = e,this._posMask = (1 << e) - 1,this._numPrevBits = t,this._coders = [];let s = 1 << this._numPrevBits + this._numPosBits;for (; s--; )this._coders[s] = new Decoder2}getDecoder(e, t) {return this._coders[((e & this._posMask) << this._numPrevBits) + ((255 & t) >>> 8 - this._numPrevBits)]}}class Decoder {constructor() {this._outWindow = new OutWindow,this._rangeDecoder = new RangeDecoder,this._isMatchDecoders = Array(192).fill(1024),this._isRepDecoders = Array(12).fill(1024),this._isRepG0Decoders = Array(12).fill(1024),this._isRepG1Decoders = Array(12).fill(1024),this._isRepG2Decoders = Array(12).fill(1024),this._isRep0LongDecoders = Array(192).fill(1024),this._posDecoders = Array(114).fill(1024),this._posAlignDecoder = new BitTreeDecoder(4),this._lenDecoder = new LenDecoder,this._repLenDecoder = new LenDecoder,this._literalDecoder = new LiteralDecoder,this._dictionarySize = -1,this._dictionarySizeCheck = -1,this._posSlotDecoder = [new BitTreeDecoder(6), new BitTreeDecoder(6), new BitTreeDecoder(6), new BitTreeDecoder(6)]}setDictionarySize(e) {return !(e < 0) && (this._dictionarySize !== e && (this._dictionarySize = e,this._dictionarySizeCheck = Math.max(this._dictionarySize, 1),this._outWindow.create(Math.max(this._dictionarySizeCheck, 4096))),!0)}setLcLpPb(e, t, s) {if (e > 8 || t > 4 || s > 4)return !1;const i = 1 << s;return this._literalDecoder.create(t, e),this._lenDecoder.create(i),this._repLenDecoder.create(i),this._posStateMask = i - 1,!0}setProperties(e) {if (!this.setLcLpPb(e.lc, e.lp, e.pb))throw Error("Incorrect stream properties");if (!this.setDictionarySize(e.dictionarySize))throw Error("Invalid dictionary size")}decodeHeader(e) {if (e._$size < 13)return !1;let t = e.readByte();const s = t % 9;t = ~~(t / 9);const i = t % 5, r = ~~(t / 5);let o = e.readByte();o |= e.readByte() << 8,o |= e.readByte() << 16,o += 16777216 * e.readByte();let d = e.readByte();return d |= e.readByte() << 8,d |= e.readByte() << 16,d += 16777216 * e.readByte(),e.readByte(),e.readByte(),e.readByte(),e.readByte(),{lc: s,lp: i,pb: r,dictionarySize: o,uncompressedSize: d}}decodeBody(e, t, s) {let i, r, o = 0, d = 0, h = 0, c = 0, n = 0, _ = 0, a = 0;for (this._rangeDecoder.setStream(e),this._rangeDecoder.init(),this._outWindow.setStream(t),this._outWindow.init(!1); _ < s; ) {const e = _ & this._posStateMask;if (0 === this._rangeDecoder.decodeBit(this._isMatchDecoders, (o << 4) + e)) {const e = this._literalDecoder.getDecoder(_++, a);a = o >= 7 ? e.decodeWithMatchByte(this._rangeDecoder, this._outWindow.getByte(d)) : e.decodeNormal(this._rangeDecoder),this._outWindow.putByte(a),o = o < 4 ? 0 : o - (o < 10 ? 3 : 6)} else {if (1 === this._rangeDecoder.decodeBit(this._isRepDecoders, o))i = 0,0 === this._rangeDecoder.decodeBit(this._isRepG0Decoders, o) ? 0 === this._rangeDecoder.decodeBit(this._isRep0LongDecoders, (o << 4) + e) && (o = o < 7 ? 9 : 11,i = 1) : (0 === this._rangeDecoder.decodeBit(this._isRepG1Decoders, o) ? r = h : (0 === this._rangeDecoder.decodeBit(this._isRepG2Decoders, o) ? r = c : (r = n,n = c),c = h),h = d,d = r),0 === i && (i = 2 + this._repLenDecoder.decode(this._rangeDecoder, e),o = o < 7 ? 8 : 11);else {n = c,c = h,h = d,i = 2 + this._lenDecoder.decode(this._rangeDecoder, e),o = o < 7 ? 7 : 10;const t = this._posSlotDecoder[i <= 5 ? i - 2 : 3].decode(this._rangeDecoder);if (t >= 4) {const e = (t >> 1) - 1;if (d = (2 | 1 & t) << e,t < 14)d += LZMA.reverseDecode2(this._posDecoders, d - t - 1, this._rangeDecoder, e);else if (d += this._rangeDecoder.decodeDirectBits(e - 4) << 4,d += this._posAlignDecoder.reverseDecode(this._rangeDecoder),d < 0) {if (-1 === d)break;return !1}} else d = t}if (d >= _ || d >= this._dictionarySizeCheck)return !1;this._outWindow.copyBlock(d, i),_ += i,a = this._outWindow.getByte(0)}}return this._outWindow.releaseStream(),this._rangeDecoder.releaseStream(),!0}}class InStream {constructor(e) {this._$data = e;this._$size = e.length;this._$offset = 0;}readByte() {return this._$data[this._$offset++];}}class OutStream {constructor(e) {this.size = 8;this.buffers = e;}writeBytes(e, t) {if (e.length === t) {this.buffers.set(e, this.size);} else {this.buffers.set(e.subarray(0, t), this.size);}this.size += t;}}return {parse: function (data, fileLength) {const t = fileLength,s = data,i = new Uint8Array(t + 8);i.set(s.slice(0, 8), 0);LZMA.decompress(new InStream(LZMA.init(s)), new OutStream(i));return i}};}());
var SwfParser = function(data) {
	this.byteStream = new ByteStream();
	this.byteStream.setData(data);
	this.clear();
	this.tick = this.tick.bind(this);
}
SwfParser.tagCodes = {0: "End", 1: "ShowFrame", 2: "DefineShape", 4: "PlaceObject", 5: "RemoveObject", 6: "DefineBits", 7: "DefineButton", 8: "JpegTables", 9: "SetBackgroundColor", 10: "DefineFont", 11: "DefineText", 12: "DoAction", 13: "DefineFontInfo", 14: "DefineSound", 15: "StartSound", 17: "DefineButtonSound", 18: "SoundStreamHead", 19: "SoundStreamBlock", 20: "DefineBitsLossless", 21: "DefineBitsJpeg2", 22: "DefineShape2", 23: "DefineButtonCxform", 24: "Protect", 26: "PlaceObject2", 28: "RemoveObject2", 32: "DefineShape3", 33: "DefineText2", 34: "DefineButton2", 35: "DefineBitsJpeg3", 36: "DefineBitsLossless2", 37: "DefineEditText", 39: "DefineSprite", 40: "NameCharacter", 41: "ProductInfo", 43: "FrameLabel", 45: "SoundStreamHead2", 46: "DefineMorphShape", 48: "DefineFont2", 56: "ExportAssets", 57: "ImportAssets", 58: "EnableDebugger", 59: "DoInitAction", 60: "DefineVideoStream", 61: "VideoFrame", 62: "DefineFontInfo2", 63: "DebugId", 64: "EnableDebugger2", 65: "ScriptLimits", 66: "SetTabIndex", 69: "FileAttributes", 70: "PlaceObject3", 71: "ImportAssets2", 73: "DefineFontAlignZones", 74: "CsmTextSettings", 75: "DefineFont3", 76: "SymbolClass", 77: "Metadata", 78: "DefineScalingGrid", 82: "DoAbc", 83: "DefineShape4", 84: "DefineMorphShape2", 86: "DefineSceneAndFrameLabelData", 87: "DefineBinaryData", 88: "DefineFontName", 89: "StartSound2", 90: "DefineBitsJpeg4", 91: "DefineFont4", 93: "EnableTelemetry", 94: "PlaceObject4"};
SwfParser.prototype.clear = function() {
	this.isLoad = false;
	this.result = null;
	this.header = null;
	this.headerMovie = null;
	this._interval = null;
	this._swfVersion = 0;
	this._stopped = false;
	this._loadedType = 0;
	this._compression = null;
	this._uncompressedLength = 0;
	this._compressStream = null;
	this.tagstack = [];
	this.tagstackSize = 0;
	this.taglengthstack = [];
	this.taglengthstackSize = 0;

	this.onload = null;
	this.onerror = null;
	this.onprogress = null;
}
SwfParser.prototype.load = function() {
	this._interval = setInterval(this.tick, 5);
}
SwfParser.prototype.getTagStack = function() {
	return this.tagstack[this.tagstackSize - 1];
}
SwfParser.prototype.getTagLengthStack = function() {
	return this.taglengthstack[this.taglengthstackSize - 1];
}
SwfParser.prototype.tick = function() {
	if (this.isLoad) {
		return;
	}
	if (this._stopped) {
		return;
	}
	this._stopped = true;
	try {
		this.tickParse();
	} catch(e) {
		if (this._interval) {
			clearInterval(this._interval);
			this._interval = null;
		}
		if (this.onerror) {
			this.onerror(e);
		}
	}
	if (this.isLoad) {
		if (this.onload) {
			this.onload();
		}
	}
	this._stopped = false;
}
SwfParser.prototype.tickParse = function() {
	if (this._loadedType == 4) {
		if (this._interval) {
			clearInterval(this._interval);
			this._interval = null;
		}
		var resultTags = this.tagstack[0];
		this.result = {
			header: this.header,
			headerMovie: this.headerMovie,
			tags: resultTags
		};
		this.isLoad = true;
	} else {
		if (this._loadedType == 3) {
			if (this.onprogress) {
				this.onprogress([1, this.byteStream.position / this._uncompressedLength]);
			}
			var stopped = false;
			var startTime = Date.now();
			while (true) {
				var stack = this.getTagStack();
				while (true) {
					var tag = this.parseTag();
					if ((tag.tagcode == 0) || !(this.byteStream.position < this.getTagLengthStack())) {
						if (this.tagstackSize == 1) {
							this._loadedType++;
							stopped = true;
						} else {
							this.byteStream.position = this.getTagLengthStack();
							this.byteStream.bit_offset = 0;
							this.tagstackSize--;
							this.taglengthstackSize--;
						}
						break;
					}
					stack.push(tag);
					if (tag.tagcode == 39) break;
					if ((Date.now() - startTime) > 20) {
						stopped = true;
						break;
					}
				}
				if (stopped) break;
			}
		} else {
			if (this._loadedType == 2) {
				// Some SWF streams may not be compressed correctly,
				// (e.g. incorrect data length in the stream), so decompressing
				// may throw an error even though the data otherwise comes
				// through the stream.
				// We'll still try to parse what we get if the full decompression fails.
				// (+ 8 for header size)
				if (this.byteStream.getLength() !== this._uncompressedLength) {
					console.log("SWF length doesn't match header, may be corrupt " + this.byteStream.data.length + " == " + this._uncompressedLength);
				}
				var headerMovie = this.parseHeaderMovie();
				this.headerMovie = headerMovie;
				this.rectangle = headerMovie.bounds;
				this.frameRate = headerMovie.frameRate;
				this.numframes = headerMovie.frameCount;
				this.taglengthstack[this.taglengthstackSize++] = this._uncompressedLength;
				this.parseTags();
				this.onprogress([1, 0]);
				this._loadedType++;
			} else {
				if (this._loadedType == 1) {
					// Now the SWF switches to a compressed stream.
					if (this._compressStream) {
						this._compressStream.tick();
						this.onprogress([0, this._compressStream.loaded]);
						if (this._compressStream.isLoad) {
							this.byteStream.setData(this._compressStream.result);
							this.byteStream.setOffset(8, 0);
							this._compressStream = null;
							this._loadedType++;
						}
					} else {
						var _fileLength = this._uncompressedLength;
						var compressStream = this.decompressStream(this._compression, this._uncompressedLength);
						if (compressStream) {
							if (compressStream instanceof Uint8Array) {
								var FixedData = new Uint8Array(_fileLength);
								for (let i = 0; i < _fileLength; i++) {
									FixedData[i] = compressStream[i];
								}
								this.byteStream.setData(FixedData.buffer);
								this.byteStream.setOffset(8, 0);
								this._loadedType++;
							} else {
								this._compressStream = compressStream;
							}
						} else {
							this._loadedType++;
						}
					}
					if (this._loadedType == 2) {
						this.onprogress([1, 0]);
					}
				} else {
					var header = this.parseHeader();
					this.header = header;
					this._compression = header.compression;
					this._swfVersion = header.version;
					this._uncompressedLength = header.uncompressedLength;
					this.onprogress([0, 0]);
					this._loadedType++;
				}
			}
		}
	}
}
SwfParser.prototype.parseHeader = function() {
	// Read SWF header.
	var compression = this.byteStream.readString(3);
	var version = this.byteStream.readUint8();

	// Check whether the SWF version is 0.
	// Note that the behavior should actually vary, depending on the player version:
	// - Flash Player 9 and later bail out (the behavior we implement).
	// - Flash Player 8 loops through all the frames, without running any AS code.
	// - Flash Player 7 and older don't fail and use the player version instead: a
	// function like `getSWFVersion()` in AVM1 will then return the player version.
	if (version == 0) {
		throw new Error("Invalid SWF version");
	}
	var uncompressedLength = this.byteStream.readUint32();
	return {compression, version, uncompressedLength}
}
SwfParser.prototype.decompressStream = function(compression, size) {
	// Now the SWF switches to a compressed stream.
	switch (compression) {
		case "FWS":
			return null;
		case "CWS":
			return new zlibParser(this.byteStream.arrayBuffer, size, 8);
		case "ZWS":
			return LZMAParser.parse(new Uint8Array(this.byteStream.arrayBuffer), size);
		default:
			throw new Error("Invalid SWF");
	}
}
SwfParser.prototype.parseHeaderMovie = function() {
	var bounds = this.rect();
	var frameRate = this.byteStream.readFixed8();
	var numFrames = this.byteStream.readUint16();
	return {bounds, frameRate, numFrames}
}
SwfParser.prototype.parseTags = function() {
	this.tagstack[this.tagstackSize++] = [];
	return this.getTagStack();
}
SwfParser.prototype.parseTag = function() {
	var {tagcode, length} = this.parseTagCodeLength();
	var tagDataStartOffset = this.byteStream.position;
	var result = this.parseTagWithCode(tagcode, length);
	result.tagcode = tagcode;
	result.tagType = SwfParser.tagCodes[tagcode] || "Unknown";
	result._byteLength = length;
	if (result.tagcode !== 39) { // Sprite
		if ((tagDataStartOffset + length) !== this.byteStream.position) {
			console.log(this.byteStream.position - tagDataStartOffset, length, SwfParser.tagCodes[tagcode]);
			this.byteStream.position = (tagDataStartOffset + length);
			this.byteStream.bit_offset = 0;
		}
	}
	return result;
}
SwfParser.prototype.parseTagCodeLength = function() {
	var tagCodeAndLength = this.byteStream.readUint16();
	var tagcode = tagCodeAndLength >> 6;
	var length = (tagCodeAndLength & 0b111111);
	if (length == 0b111111) {
		// Extended tag.
		length = this.byteStream.readUint32();
	}
	return {tagcode, length}
}
SwfParser.prototype.parseTagWithCode = function(tagType, length) {
	var byteStream = this.byteStream;
	var obj = Object.create(null);
	switch (tagType) {
		case 0: // End
		case 1: // ShowFrame
			break;
		case 2:  // DefineShape
			obj = this.parseDefineShape(1);
			break;
		case 22: // DefineShape2
			obj = this.parseDefineShape(2);
			break;
		case 32: // DefineShape3
			obj = this.parseDefineShape(3);
			break;
		case 83: // DefineShape4
			obj = this.parseDefineShape(4);
			break;
		case 6: // DefineBits
			obj = this.parseDefineBits(1, length);
			break;
		case 21: // DefineBitsJPEG2
			obj = this.parseDefineBits(2, length);
			break;
		case 35: // DefineBitsJPEG3
			obj = this.parseDefineBits(3, length);
			break;
		case 90: // DefineBitsJPEG4
			obj = this.parseDefineBits(4, length);
			break;
		case 7: // DefineButton
			obj = this.parseDefineButton(1, length);
			break;
		case 34: // DefineButton2
			obj = this.parseDefineButton(2, length);
			break;
		case 10: // DefineFont
			obj = this.parseDefineFont1(length);
			break;
		case 48: // DefineFont2
			obj = this.parseDefineFont2(2, length);
			break;
		case 75: // DefineFont3
			obj = this.parseDefineFont2(3, length);
			break;
		case 91: // DefineFont4
			obj = this.parseDefineFont4(length);
			break;
		case 11: // DefineText
			obj = this.parseDefineText(1);
			break;
		case 33: // DefineText2
			obj = this.parseDefineText(2);
			break;
		case 13: // DefineFontInfo
			obj = this.parseDefineFontInfo(1, length);
			break;
		case 62: // DefineFontInfo2
			obj = this.parseDefineFontInfo(2, length);
			break;
		case 14: // DefineSound
			obj = this.parseDefineSound(length);
			break;
		case 17: // DefineButtonSound
			obj = this.parseDefineButtonSound();
			break;
		case 20: // DefineBitsLossless
			obj = this.parseDefineBitsLossLess(1, length);
			break;
		case 36: // DefineBitsLossless2
			obj = this.parseDefineBitsLossLess(2, length);
			break;
		case 23: // DefineButtonCxform
			obj = this.parseDefineButtonCxform(length);
			break;
		case 37: // DefineEditText
			obj = this.parseDefineEditText();
			break;
		case 39: // DefineSprite
			obj = this.parseDefineSprite(length);
			break;
		case 46: // DefineMorphShape
			obj = this.parseDefineMorphShape(1);
			break;
		case 84: // DefineMorphShape2
			obj = this.parseDefineMorphShape(2);
			break;
		case 60: // DefineVideoStream
			obj = this.parseDefineVideoStream();
			break;
		case 73: // DefineFontAlignZones
			obj = this.parseDefineFontAlignZones(length);
			break;
		case 78: // DefineScalingGrid
			obj = this.parseDefineScalingGrid();
			break;
		case 86: // DefineSceneAndFrameLabelData
			obj = this.parseDefineSceneAndFrameLabelData();
			break;
		case 87: // DefineBinaryData
			obj = this.parseDefineBinaryData(length);
			break;
		case 88: // DefineFontName
			obj = this.parseDefineFontName();
			break;
		case 4: // PlaceObject
			obj = this.parsePlaceObject(1, length);
			break;
		case 26: // PlaceObject2
			obj = this.parsePlaceObject(2, length);
			break;
		case 70: // PlaceObject3
			obj = this.parsePlaceObject(3, length);
			break;
		case 94: // PlaceObject4
			obj = this.parsePlaceObject(4, length);
			break;
		case 5: // RemoveObject1
			obj = this.parseRemoveObject(1);
			break;
		case 28: // RemoveObject2
			obj = this.parseRemoveObject(2);
			break;
		case 8: // JpegTables
			obj.jpegtable = byteStream.readBytes(length);
			break;
		case 9: // SetBackgroundColor
			obj.rgb = this.rgb();
			break;
		case 12: // DoAction
			obj = this.parseDoAction(length);
			break;
		case 15: // StartSound
			obj = this.parseStartSound(1);
			break;
		case 89: // StartSound2
			obj = this.parseStartSound(2);
			break;
		case 18: // SoundStreamHead
			obj = this.parseSoundStreamHead(1);
			break;
		case 45: // SoundStreamHead2
			obj = this.parseSoundStreamHead(2);
			break;
		case 19: // SoundStreamBlock
			obj = this.parseSoundStreamBlock(length);
			break;
		case 24: // Protect
			if (length > 0) {
				byteStream.readUint16(); // Reserved
				obj.data = byteStream.readBytes(length - 2);
			}
			break;
		case 40: // NameCharacter
			obj = this.parseNameCharacter();
			break;
		case 41: // ProductInfo
			obj = this.parseProductInfo();
			break;
		case 43: // FrameLabel
			obj = this.parseFrameLabel(length);
			break;
		case 56: // ExportAssets
			obj = this.parseExportAssets();
			break;
		case 57: // ImportAssets
			obj = this.parseImportAssets(1);
			break;
		case 71: // ImportAssets2
			obj = this.parseImportAssets(2);
			break;
		case 58: // EnableDebugger
			obj.debugger = byteStream.readStringWithUntil();
			break;
		case 64: // EnableDebugger2
			byteStream.readUint16(); // Reserved
			obj.debugger = byteStream.readStringWithUntil();
			break;
		case 59: // DoInitAction
			obj = this.parseDoInitAction(length);
			break;
		case 61: // VideoFrame
			obj = this.parseVideoFrame(length);
			break;
		case 63: // DebugID
			obj = this.parseDebugID(length);
			break;
		case 65: // ScriptLimits
			obj.maxRecursionDepth = byteStream.readUint16();
			obj.timeoutSeconds = byteStream.readUint16();
			break;
		case 66: // SetTabIndex
			obj.depth = byteStream.readUint16();
			obj.tabIndex = byteStream.readUint16();
			break;
		case 69: // FileAttributes
			obj = this.parseFileAttributes();
			break;
		case 72: // DoAbc
			obj = this.parseDoABC(1, length);
			break;
		case 82: // DoAbc2
			obj = this.parseDoABC(2, length);
			break;
		case 74: // CsmTextSettings
			obj = this.parseCSMTextSettings();
			break;
		case 76: // SymbolClass
			obj = this.parseSymbolClass();
			break;
		case 77: // Metadata
			obj.metadata = byteStream.readStringWithUntil();
			break;
		case 93: // EnableTelemetry
			byteStream.readUint16(); // Reserved
			if (length > 2) {
				obj.passwordHash = byteStream.readBytes(32);
			}
			break;
		case 38: // DefineVideo
		case 42: // DefineTextFormat
		case 44: // DefineBehavior
		case 50: // DefineCommandObject
		case 53: // DefineFunction
		case 3:  // FreeCharacter
		case 16: // StopSound
		case 25: // PathsArePostScript
		case 29: // SyncFrame
		case 31: // FreeAll
		case 47: // FrameTag
		case 49: // GeProSet
		case 51: // CharacterSet
		case 52: // FontRef
		case 54: // PlaceFunction
		case 55: // GenTagObject
			console.log("[base] tagType -> " + tagType);
			this.byteStream.position += length;
			break;
		case 27: // 27 (invalid)
		case 30: // 30 (invalid)
		case 67: // 67 (invalid)
		case 68: // 68 (invalid)
		case 79: // 79 (invalid)
		case 80: // 80 (invalid)
		case 81: // 81 (invalid)
		case 85: // 85 (invalid)
		case 92: // 92 (invalid)
			this.byteStream.position += length;
			break;
		default: // null
			this.byteStream.position += length;
			break;
	}
	return obj;
}

//////// color rect matrix ////////
SwfParser.prototype.rect = function() {
	var byteStream = this.byteStream;
	byteStream.byteAlign();
	var nBits = byteStream.getUIBits(5);
	var obj = Object.create(null);
	obj.xMin = byteStream.getSIBits(nBits);
	obj.xMax = byteStream.getSIBits(nBits);
	obj.yMin = byteStream.getSIBits(nBits);
	obj.yMax = byteStream.getSIBits(nBits);
	return obj;
}
SwfParser.prototype.rgb = function() {
	var byteStream = this.byteStream;
	return [byteStream.readUint8(), byteStream.readUint8(), byteStream.readUint8(), 1];
}
SwfParser.prototype.rgba = function() {
	var byteStream = this.byteStream;
	return [byteStream.readUint8(), byteStream.readUint8(), byteStream.readUint8(), byteStream.readUint8() / 255];
}
SwfParser.prototype.colorTransform = function(hasAlpha) {
	var byteStream = this.byteStream;
	byteStream.byteAlign();
	var result = [1, 1, 1, 1, 0, 0, 0, 0];
	var first6bits = byteStream.getUIBits(6);
	var hasAddTerms = first6bits >> 5;
	var hasMultiTerms = (first6bits >> 4) & 1;
	var nbits = first6bits & 0x0f;
	if (hasMultiTerms) {
		result[0] = byteStream.getSIBitsFixed8(nbits);
		result[1] = byteStream.getSIBitsFixed8(nbits);
		result[2] = byteStream.getSIBitsFixed8(nbits);
		if (hasAlpha) {
			result[3] = byteStream.getSIBitsFixed8(nbits);
		}
	}
	if (hasAddTerms) {
		result[4] = byteStream.getSIBits(nbits);
		result[5] = byteStream.getSIBits(nbits);
		result[6] = byteStream.getSIBits(nbits);
		if (hasAlpha) {
			result[7] = byteStream.getSIBits(nbits);
		}
	}
	return result;
}
SwfParser.prototype.matrix = function() {
	var byteStream = this.byteStream;
	byteStream.byteAlign();
	var result = [1, 0, 0, 1, 0, 0];
	// Scale
	if (byteStream.getUIBit()) {
		var nScaleBits = byteStream.getUIBits(5);
		result[0] = byteStream.getSIBitsFixed16(nScaleBits);
		result[3] = byteStream.getSIBitsFixed16(nScaleBits);
	}
	// Rotate/Skew
	if (byteStream.getUIBit()) {
		var nRotateBits = byteStream.getUIBits(5);
		result[1] = byteStream.getSIBitsFixed16(nRotateBits);
		result[2] = byteStream.getSIBitsFixed16(nRotateBits);
	}
	// Translate (always present)
	var nTranslateBits = byteStream.getUIBits(5);
	result[4] = byteStream.getSIBits(nTranslateBits);
	result[5] = byteStream.getSIBits(nTranslateBits);
	return result;
}
//////// Structure ////////
SwfParser.prototype.parseLanguage = function() {
	var languageCode = this.byteStream.readUint8();
	switch (languageCode) {
		case 0: // Unknown
			return "";
		case 1: // Latin
			return "latin";
		case 2: // Japanese
			return "japanese";
		case 3: // Korean
			return "korean";
		case 4: // SimplifiedChinese
			return "simplifiedChinese";
		case 5: // TraditionalChinese
			return "traditionalChinese";
		default:
			throw new Error("Invalid language code:" + languageCode);
	}
}
SwfParser.prototype.gradientSpread = function(code) {
	switch (code) {
		case 0: // Pad
		// Per SWF19 p. 136, SpreadMode 3 is reserved.
		// Flash treats it as pad mode.
		case 3:
			return "pad";
		case 1: // Reflect
			return "reflect";
		case 2: // Repeat
			return "repeat";
		default:
			throw new Error("Invalid gradient spread mode:" + code);
	}
}
SwfParser.prototype.gradientInterpolation = function(code) {
	switch (code) {
		case 0: // Rgb
		// Per SWF19 p. 136, InterpolationMode 2 and 3 are reserved.
		// Flash treats them as normal RGB mode interpolation.
		case 2:
		case 3:
			return "rgb";
		case 1: // LinearRgb
			return "linearRgb";
		default:
			throw new Error("Invalid gradient interpolation mode:" + code);
	}
}
SwfParser.prototype.shapeWithStyle = function(shapeVersion) {
	var byteStream = this.byteStream;
	var fillStyles = this.fillStyleArray(shapeVersion);
	var lineStyles = this.lineStyleArray(shapeVersion);
	var numBits = byteStream.readUint8();
	var numFillBits = numBits >> 4;
	var numLineBits = numBits & 0b1111;
	var shapeRecords = this.shapeRecords(shapeVersion, {
		fillBits: numFillBits,
		lineBits: numLineBits
	});
	return {fillStyles, lineStyles, shapeRecords, numFillBits, numLineBits};
}
SwfParser.prototype.fillStyleArray = function(shapeVersion) {
	var byteStream = this.byteStream;
	var count = byteStream.readUint8();
	if ((shapeVersion >= 2) && (count == 0xff)) {
		count = byteStream.readUint16();
	}
	var fillStyles = [];
	while (count--) {
		fillStyles.push(this.fillStyle(shapeVersion));
	}
	return fillStyles;
}
SwfParser.prototype.gradient = function(shapeVersion) {
	var byteStream = this.byteStream;
	var matrix = this.matrix();
	var flags = byteStream.readUint8();
	var spreadMode = this.gradientSpread((flags >> 6) & 0b11);
	var interpolationMode = this.gradientInterpolation((flags >> 4) & 0b11);
	var numGradients = (flags & 0b1111);
	var gradientRecords = [];
	for (var i = numGradients; i--;) {
		var ratio = byteStream.readUint8() / 255;
		var color = ((shapeVersion >= 3) ? this.rgba() : this.rgb());
		gradientRecords.push({ratio, color});
	}
	return {
		spreadMode,
		interpolationMode,
		gradientRecords,
		matrix: matrix
	};
}
SwfParser.prototype.fillStyle = function(shapeVersion) {
	var byteStream = this.byteStream;
	var obj = {};
	var bitType = byteStream.readUint8();
	obj.fillStyleType = bitType;
	switch (bitType) {
		case 0x00:
			if (shapeVersion >= 3) {
				obj.color = this.rgba();
			} else {
				obj.color = this.rgb();
			}
			break;
		case 0x10:
			obj.linearGradient = this.gradient(shapeVersion);
			break;
		case 0x12:
			obj.radialGradient = this.gradient(shapeVersion);
			break;
		case 0x13:
			// SWF19 says focal gradients are only allowed in SWFv8+ and DefineShape4,
			// but it works even in earlier tags (#2730).
			obj.gradient = this.gradient(shapeVersion);
			obj.focalPoint = byteStream.readFixed8();
			break;
		case 0x40:
		case 0x41:
		case 0x42:
		case 0x43:
			obj.bitmapId = byteStream.readUint16();
			obj.bitmapMatrix = this.matrix();
            // Bitmap smoothing only occurs in SWF version 8+.
			obj.isSmoothed = ((this._swfVersion >= 8) && ((bitType & 0b10) == 0));
			obj.isRepeating = (bitType & 0b01);
			break;
		default:
			throw new Error("Invalid fill style.");
	}
	return obj;
}
SwfParser.prototype.lineStyleArray = function(shapeVersion) {
	var byteStream = this.byteStream;
	var count = byteStream.readUint8();
	if ((shapeVersion >= 2) && (count === 0xff)) {
		count = byteStream.readUint16();
	}
	var lineStyles = [];
	while (count--) {
		lineStyles.push(this.lineStyles(shapeVersion));
	}
	return lineStyles;
}
SwfParser.prototype.lineStyles = function(shapeVersion) {
	var byteStream = this.byteStream;
	var obj = {};
	obj.width = byteStream.readUint16();
	if (shapeVersion == 4) {
		// LineStyle2 in DefineShape4
		obj.startCapStyle = byteStream.getUIBits(2);
		obj.joinStyle = byteStream.getUIBits(2);
		obj.hasFill = byteStream.getUIBit();
		obj.noHScale = byteStream.getUIBit();
		obj.noVScale = byteStream.getUIBit();
		obj.pixelHinting = byteStream.getUIBit();
		byteStream.getUIBits(5); // Reserved
		obj.noClose = byteStream.getUIBit();
		obj.endCapStyle = byteStream.getUIBits(2);
		if (obj.joinStyle === 2) {
			obj.miterLimitFactor = byteStream.readFixed8();
		}
		if (obj.hasFill) {
			obj.fillType = this.fillStyle(shapeVersion);
		} else {
			obj.color = this.rgba();
		}
	} else {
		// LineStyle1
		if (shapeVersion >= 3) {
			obj.color = this.rgba();
		} else {
			obj.color = this.rgb();
		}
	}
	return obj;
}
SwfParser.prototype.shapeRecords = function(shapeVersion, currentNumBits) {
	var byteStream = this.byteStream;
	var shapeRecords = [];
	while (true) {
		var first6Bits = byteStream.getUIBits(6);
		var shape = null;
		if (first6Bits & 0x20) {
			var numBits = first6Bits & 0b1111;
			if (first6Bits & 0x10) {
				shape = this.straightEdgeRecord(numBits);
			} else {
				shape = this.curvedEdgeRecord(numBits);
			}
		} else {
			if (first6Bits) {
				shape = this.styleChangeRecord(shapeVersion, first6Bits, currentNumBits);
			}
		}
		if (!shape) {
			byteStream.byteAlign();
			break;
		} else {
			shapeRecords.push(shape);
		}
	}
	return shapeRecords;
}
SwfParser.prototype.straightEdgeRecord = function(numBits) {
	var byteStream = this.byteStream;
	var deltaX = 0;
	var deltaY = 0;
	var GeneralLineFlag = byteStream.getUIBit();
	if (GeneralLineFlag) {
		deltaX = byteStream.getSIBits(numBits + 2);
		deltaY = byteStream.getSIBits(numBits + 2);
	} else {
		var VertLineFlag = byteStream.getUIBit();
		if (VertLineFlag) {
			deltaX = 0;
			deltaY = byteStream.getSIBits(numBits + 2);
		} else {
			deltaX = byteStream.getSIBits(numBits + 2);
			deltaY = 0;
		}
	}
	return {
		deltaX,
		deltaY,
		isCurved: false,
		isChange: false
	};
}
SwfParser.prototype.curvedEdgeRecord = function(numBits) {
	var byteStream = this.byteStream;
	var controlDeltaX = byteStream.getSIBits(numBits + 2);
	var controlDeltaY = byteStream.getSIBits(numBits + 2);
	var anchorDeltaX = byteStream.getSIBits(numBits + 2);
	var anchorDeltaY = byteStream.getSIBits(numBits + 2);
	return {
		controlDeltaX,
		controlDeltaY,
		anchorDeltaX,
		anchorDeltaY,
		isCurved: true,
		isChange: false
	};
}
SwfParser.prototype.styleChangeRecord = function(shapeVersion, changeFlag, currentNumBits) {
	var byteStream = this.byteStream;
	var obj = {};
	obj.stateMoveTo = changeFlag & 1;
	obj.stateFillStyle0 = (changeFlag >> 1) & 1;
	obj.stateFillStyle1 = (changeFlag >> 2) & 1;
	obj.stateLineStyle = (changeFlag >> 3) & 1;
	obj.stateNewStyles = (changeFlag >> 4) & 1;
	if (obj.stateMoveTo) {
		var moveBits = byteStream.getUIBits(5);
		obj.moveX = byteStream.getSIBits(moveBits);
		obj.moveY = byteStream.getSIBits(moveBits);
	}
	obj.fillStyle0 = 0;
	if (obj.stateFillStyle0) {
		obj.fillStyle0 = byteStream.getUIBits(currentNumBits.fillBits);
	}
	obj.fillStyle1 = 0;
	if (obj.stateFillStyle1) {
		obj.fillStyle1 = byteStream.getUIBits(currentNumBits.fillBits);
	}
	obj.lineStyle = 0;
	if (obj.stateLineStyle) {
		obj.lineStyle = byteStream.getUIBits(currentNumBits.lineBits);
	}
	if (obj.stateNewStyles) {
		obj.fillStyles = this.fillStyleArray(shapeVersion);
		obj.lineStyles = this.lineStyleArray(shapeVersion);
		var numBits = byteStream.readUint8();
		currentNumBits.fillBits = obj.numFillBits = numBits >> 4;
		currentNumBits.lineBits = obj.numLineBits = numBits & 0b1111;
	}
	obj.isChange = true;
	return obj;
}
SwfParser.prototype.morphFillStyleArray = function(shapeVersion) {
	var byteStream = this.byteStream;
	var fillStyleCount = byteStream.readUint8();
	if ((shapeVersion >= 2) && (fillStyleCount == 0xff)) {
		fillStyleCount = byteStream.readUint16();
	}
	var fillStyles = [];
	for (var i = fillStyleCount; i--;) {
		fillStyles[fillStyles.length] = this.morphFillStyle();
	}
	return fillStyles;
}
SwfParser.prototype.morphFillStyle = function() {
	var byteStream = this.byteStream;
	var obj = {};
	var bitType = byteStream.readUint8();
	obj.fillStyleType = bitType;
	switch (bitType) {
		case 0x00:
			obj.startColor = this.rgba();
			obj.endColor = this.rgba();
			break;
		case 0x10:
			obj.linearGradient = this.morphGradient();
			break;
		case 0x12:
			obj.radialGradient = this.morphGradient();
			break;
		case 0x13:
			// SWF19 says focal gradients are only allowed in SWFv8+ and DefineMorphShapeShape2,
			// but it works even in earlier tags (#2730).
			// TODO(Herschel): How is focal_point stored?
			obj.gradient = this.morphGradient();
			obj.startFocalPoint = byteStream.readFixed8();
			obj.endFocalPoint = byteStream.readFixed8();
			break;
		case 0x40:
		case 0x41:
		case 0x42:
		case 0x43:
			obj.bitmapId = byteStream.readUint16();
			obj.bitmapStartMatrix = this.matrix();
			obj.bitmapEndMatrix = this.matrix();
			obj.isSmoothed = (bitType & 0b10) == 0;
			obj.isRepeating = (bitType & 0b01) == 0;
			break;
		default:
			throw new Error("Invalid fill style.");
	}
	return obj;
}
SwfParser.prototype.morphGradient = function() {
	var obj = {};
	var byteStream = this.byteStream;
	obj.startMatrix = this.matrix();
	obj.endMatrix = this.matrix();
	var flags = byteStream.readUint8();
	obj.spreadMode = this.gradientSpread((flags >> 6) & 0b11);
	obj.interpolationMode = this.gradientInterpolation((flags >> 4) & 0b11);
	var numGradients = (flags & 0b1111);
	var startRecords = [];
	var endRecords = [];
	for (var i = numGradients; i--;) {
		startRecords[startRecords.length] = {ratio: byteStream.readUint8() / 255, color: this.rgba()};
		endRecords[endRecords.length] = {ratio: byteStream.readUint8() / 255, color: this.rgba()};
	}
	obj.startRecords = startRecords;
	obj.endRecords = endRecords;
	return obj;
}
SwfParser.prototype.morphLineStyleArray = function(shapeVersion) {
	var byteStream = this.byteStream;
	var lineStyleCount = byteStream.readUint8();
	if ((shapeVersion >= 2) && (lineStyleCount == 0xff)) {
		lineStyleCount = byteStream.readUint16();
	}
	var lineStyles = [];
	for (var i = lineStyleCount; i--;) {
		lineStyles[lineStyles.length] = this.morphLineStyle(shapeVersion);
	}
	return lineStyles;
}
SwfParser.prototype.morphLineStyle = function(shapeVersion) {
	var byteStream = this.byteStream;
	var obj = {};
	obj.startWidth = byteStream.readUint16();
	obj.endWidth = byteStream.readUint16();
	if (shapeVersion < 2) {
		obj.startColor = this.rgba();
		obj.endColor = this.rgba();
	} else {
		// MorphLineStyle2 in DefineMorphShape2
		obj.startCapStyle = byteStream.getUIBits(2);
		obj.joinStyle = byteStream.getUIBits(2);
		obj.hasFill = byteStream.getUIBit();
		obj.noHScale = byteStream.getUIBit();
		obj.noVScale = byteStream.getUIBit();
		obj.pixelHinting = byteStream.getUIBit();
		byteStream.getUIBits(5); // Reserved
		obj.noClose = byteStream.getUIBit();
		obj.endCapStyle = byteStream.getUIBits(2);
		if (obj.joinStyle === 2) {
			obj.miterLimitFactor = byteStream.readFixed8();
		}
		if (obj.hasFill) {
			obj.fillType = this.morphFillStyle();
		} else {
			obj.startColor = this.rgba();
			obj.endColor = this.rgba();
		}
	}
	return obj;
}
SwfParser.prototype.morphShapeWithStyle = function(shapeVersion, t) {
	var byteStream = this.byteStream;
	var numBits = byteStream.readUint8();
	var NumFillBits = numBits >> 4;
	var NumLineBits = numBits & 0b1111;
	// NumFillBits and NumLineBits are written as 0 for the end shape.
	if (t) {
		NumFillBits = 0;
		NumLineBits = 0;
	}
	var ShapeRecords = this.shapeRecords(shapeVersion, {
		fillBits: NumFillBits,
		lineBits: NumLineBits
	});
	return ShapeRecords;
}
SwfParser.prototype.buttonRecords = function(ver) {
	var records = [];
	var byteStream = this.byteStream;
	while (true) {
		var flags = byteStream.readUint8();
		if (flags == 0) break;
		var obj = {};
		obj.buttonStateUp = flags & 1;
		obj.buttonStateOver = (flags >>> 1) & 1;
		obj.buttonStateDown = (flags >>> 2) & 1;
		obj.buttonStateHitTest = (flags >>> 3) & 1;
		obj.characterId = byteStream.readUint16();
		obj.depth = byteStream.readUint16();
		obj.matrix = this.matrix();
		if (ver == 2) {
			obj.colorTransform = this.colorTransform(true);
		}
		if (flags & 16) {
			obj.filters = this.getFilterList();
		}
		if (flags & 32) {
			obj.blendMode = this.parseBlendMode();
		}
		records.push(obj);
	}
	return records;
}
SwfParser.prototype.buttonActions = function(endOffset) {
	var byteStream = this.byteStream;
	var results = [];
	while (true) {
		var obj = Object.create(null);
		var condActionSize = byteStream.readUint16();
		var flags = byteStream.readUint16();
		obj.condIdleToOverUp = flags & 1;
		obj.condOverUpToIdle = (flags >>> 1) & 1;
		obj.condOverUpToOverDown = (flags >>> 2) & 1;
		obj.condOverDownToOverUp = (flags >>> 3) & 1;
		obj.condOverDownToOutDown = (flags >>> 4) & 1;
		obj.condOutDownToOverDown = (flags >>> 5) & 1;
		obj.condOutDownToIdle = (flags >>> 6) & 1;
		obj.condIdleToOverDown = (flags >>> 7) & 1;
		obj.condOverDownToIdle = (flags >>> 8) & 1;
		obj.condKeyPress = (flags >> 9);
		byteStream.byteAlign();
		if (condActionSize >= 4) {
			obj.actionScript = this.parseAction(byteStream.readBytes(condActionSize - 4));
		} else if (condActionSize == 0) {
			// Last action, read to end.
			obj.actionScript = this.parseAction(byteStream.readBytes(endOffset - byteStream.position));
		} else {
			// Some SWFs have phantom action records with an invalid length.
			// See 401799_pre_Scene_1.swf
			// TODO: How does Flash handle this?
		}
		results.push(obj);
		if (condActionSize == 0) {
			break;
		}
		if (byteStream.position > endOffset) {
			break;
		}
	}
	return results;
}
SwfParser.prototype.getTextRecords = function(ver, GlyphBits, AdvanceBits) {
	var byteStream = this.byteStream;
	var array = [];
	while (true) {
		var flags = byteStream.readUint8();
		if (flags == 0) {
			// End of text records.
			break;
		}
		var obj = Object.create(null);
		if (flags & 0b1000) {
			obj.fontId = byteStream.readUint16();
		}
		if (flags & 0b100) {
			if (ver === 1) {
				obj.textColor = this.rgb();
			} else {
				obj.textColor = this.rgba();
			}
		}
		if (flags & 0b1) {
			obj.XOffset = byteStream.readInt16();
		}
		if (flags & 0b10) {
			obj.YOffset = byteStream.readInt16();
		}
		if (flags & 0b1000) {
			obj.textHeight = byteStream.readUint16();
		}
		obj.glyphEntries = this.getGlyphEntries(GlyphBits, AdvanceBits);
		array.push(obj);
	}
	return array;
}
SwfParser.prototype.textAlign = function(type) {
	switch (type) {
		case 0:
			return "left";
		case 1:
			return "right";
		case 2:
			return "center";
		case 3:
			return "justify";
		default:
			throw new Error("Invalid language code:" + type);
	}
}
SwfParser.prototype.getGlyphEntries = function(GlyphBits, AdvanceBits) {
	// TODO(Herschel): font_id and height are tied together. Merge them into a struct?
	var byteStream = this.byteStream;
	var count = byteStream.readUint8();
	var array = [];
	while (count--) {
		array.push({
			index: byteStream.getUIBits(GlyphBits),
			advance: byteStream.getSIBits(AdvanceBits)
		});
	}
	return array;
}
SwfParser.prototype.parseSoundFormat = function() {
	var byteStream = this.byteStream;
	var obj = Object.create(null);
	var frags = byteStream.readUint8();
	var compression;
	switch (frags >> 4) {
		case 0: // UncompressedUnknownEndian
			compression = "uncompressedUnknownEndian";
			break;
		case 1: // ADPCM
			compression = "ADPCM";
			break;
		case 2: // MP3
			compression = "MP3";
			break;
		case 3: // Uncompressed
			compression = "uncompressed";
			break;
		case 4: // Nellymoser16Khz
			compression = "nellymoser16Khz";
			break;
		case 5: // Nellymoser8Khz
			compression = "nellymoser8Khz";
			break;
		case 6: // Nellymoser
			compression = "nellymoser";
			break;
		case 11: // Speex
			compression = "speex";
			break;
		default:
			throw new Error("Invalid audio format.");
	}
	obj.compression = compression;
	var sampleRate;
	switch ((frags & 0b1100) >> 2) {
		case 0:
			sampleRate = 5512;
			break;
		case 1:
			sampleRate = 11025;
			break;
		case 2:
			sampleRate = 22050;
			break;
		case 3:
			sampleRate = 44100;
			break;
		default:
			console.log("unreachable");
	}
	obj.sampleRate = sampleRate;
	obj.is16Bit = frags & 0b10;
	obj.isStereo = frags & 0b1;
	return obj;
}
SwfParser.prototype.parseBlendMode = function() {
	var blendMode = this.byteStream.readUint8()
	switch (blendMode) {
		case 0:
		case 1:
			return "normal";
		case 2:
			return "layer";
		case 3:
			return "multiply";
		case 4:
			return "screen";
		case 5:
			return "lighten";
		case 6:
			return "darken";
		case 7:
			return "difference";
		case 8:
			return "add";
		case 9:
			return "subtract";
		case 10:
			return "invert";
		case 11:
			return "alpha";
		case 12:
			return "erase";
		case 13:
			return "overlay";
		case 14:
			return "hardlight";
		default:
			throw new Error("Invalid blend mode: " + blendMode);
	}
}
SwfParser.prototype.parseClipActions = function(startOffset, length) {
	var byteStream = this.byteStream;
	byteStream.readUint16();
	var allEventFlags = this.parseClipEventFlags();
	var endLength = startOffset + length;
	var actionRecords = [];
	while (byteStream.position < endLength) {
		var clipActionRecord = this.parseClipActionRecord(endLength);
		actionRecords[actionRecords.length] = clipActionRecord;
		if (endLength <= byteStream.position) {
			break;
		}
		var endFlag = (this._swfVersion <= 5) ? byteStream.readUint16() : byteStream.readUint32();
		if (!endFlag) {
			break;
		}
		if (this._swfVersion <= 5) {
			byteStream.position -= 2;
		} else {
			byteStream.position -= 4;
		}
		if (clipActionRecord.keyCode) {
			byteStream.position -= 1;
		}
	}
	return {allEventFlags, actionRecords};
}
SwfParser.prototype.parseClipActionRecord = function(endLength) {
	var byteStream = this.byteStream;
	var obj = Object.create(null);
	var eventFlags = this.parseClipEventFlags();
	if (endLength > byteStream.position) {
		var ActionRecordSize = byteStream.readUint32();
		if (eventFlags.keyPress) {
			obj.keyCode = byteStream.readUint8();
		}
		obj.eventFlags = eventFlags;
		obj.actions = this.parseAction(byteStream.readBytes(ActionRecordSize));
	}
	return obj;
}
SwfParser.prototype.parseClipEventFlags = function() {
	var obj = Object.create(null);
	var byteStream = this.byteStream;
	obj.keyUp = byteStream.getUIBits(1);
	obj.keyDown = byteStream.getUIBits(1);
	obj.mouseUp = byteStream.getUIBits(1);
	obj.mouseDown = byteStream.getUIBits(1);
	obj.mouseMove = byteStream.getUIBits(1);
	obj.unload = byteStream.getUIBits(1);
	obj.enterFrame = byteStream.getUIBits(1);
	obj.load = byteStream.getUIBits(1);
	if (this._swfVersion >= 6) {
		obj.dragOver = byteStream.getUIBits(1);
		obj.rollOut = byteStream.getUIBits(1);
		obj.rollOver = byteStream.getUIBits(1);
		obj.releaseOutside = byteStream.getUIBits(1);
		obj.release = byteStream.getUIBits(1);
		obj.press = byteStream.getUIBits(1);
		obj.initialize = byteStream.getUIBits(1);
	}
	obj.data = byteStream.getUIBits(1);
	if (this._swfVersion >= 6) {
		byteStream.getUIBits(5);
		obj.construct = byteStream.getUIBits(1);
		obj.keyPress = byteStream.getUIBits(1);
		obj.dragOut = byteStream.getUIBits(1);
		byteStream.getUIBits(8);
	}
	byteStream.byteAlign();
	return obj;
}
SwfParser.prototype.getFilterList = function() {
	var byteStream = this.byteStream;
	var result = [];
	var numberOfFilters = byteStream.readUint8();
	while (numberOfFilters--) {
		result[result.length] = this.getFilter();
	}
	return (result.length) ? result : null;
}
SwfParser.prototype.getFilter = function() {
	var byteStream = this.byteStream;
	var filterId = byteStream.readUint8();
	var filter;
	switch (filterId) {
		case 0:
			filter = this.dropShadowFilter();
			break;
		case 1:
			filter = this.blurFilter();
			break;
		case 2:
			filter = this.glowFilter();
			break;
		case 3:
			filter = this.bevelFilter();
			break;
		case 4:
			filter = this.gradientGlowFilter();
			break;
		case 5:
			filter = this.convolutionFilter();
			break;
		case 6:
			filter = this.colorMatrixFilter();
			break;
		case 7:
			filter = this.gradientBevelFilter();
			break;
		default: 
			throw new Error("Invalid filter type");
	}
	return {filterId, filter};
}
SwfParser.prototype.dropShadowFilter = function() {
	var byteStream = this.byteStream;
	var rgba = this.rgba();
	var alpha = rgba[3];
	var color = rgba[0] << 16 | rgba[1] << 8 | rgba[2];
	var blurX = byteStream.readFixed16();
	var blurY = byteStream.readFixed16();
	var angle = byteStream.readFixed16() * 180 / Math.PI;
	var distance = byteStream.readFixed16();
	var strength = byteStream.readFloat16() / 256;
	var inner = (byteStream.getUIBits(1)) ? true : false;
	var knockout = (byteStream.getUIBits(1)) ? true : false;
	var hideObject = (byteStream.getUIBits(1)) ? false : true;
	var quality = byteStream.getUIBits(5);
	if (!strength) {
		return null;
	}
	return {distance, angle, color, alpha, blurX, blurY, strength, quality, inner, knockout, hideObject}
}
SwfParser.prototype.blurFilter = function() {
	var byteStream = this.byteStream;
	var blurX = byteStream.readFixed16();
	var blurY = byteStream.readFixed16();
	var quality = byteStream.getUIBits(5);
	byteStream.getUIBits(3);
	return {blurX, blurY, quality}
}
SwfParser.prototype.glowFilter = function() {
	var byteStream = this.byteStream;
	var rgba = this.rgba();
	var alpha = rgba[3];
	var color = rgba[0] << 16 | rgba[1] << 8 | rgba[2];
	var blurX = byteStream.readFixed16();
	var blurY = byteStream.readFixed16();
	var strength = byteStream.readFloat16() / 256;
	var inner = (byteStream.getUIBits(1)) ? true : false;
	var knockout = (byteStream.getUIBits(1)) ? true : false;
	byteStream.getUIBits(1);
	var quality = byteStream.getUIBits(5);
	if (!strength) {
		return null;
	}
	return {color, alpha, blurX, blurY, strength, quality, inner, knockout};
}
SwfParser.prototype.bevelFilter = function() {
	var byteStream = this.byteStream;
	var rgba;
	rgba = this.rgba();
	var highlightAlpha = rgba[3];
	var highlightColor = rgba[0] << 16 | rgba[1] << 8 | rgba[2];
	rgba = this.rgba();
	var shadowAlpha = rgba[3];
	var shadowColor = rgba[0] << 16 | rgba[1] << 8 | rgba[2];
	var blurX = byteStream.readFixed16();
	var blurY = byteStream.readFixed16();
	var angle = byteStream.readFixed16() * 180 / Math.PI;
	var distance = byteStream.readFixed16();
	var strength = byteStream.readFloat16() / 256;
	var inner = (byteStream.getUIBits(1)) ? true : false;
	var knockout = (byteStream.getUIBits(1)) ? true : false;
	byteStream.getUIBits(1);
	var OnTop = byteStream.getUIBits(1);
	var quality = byteStream.getUIBits(4);
	var type = "inner";
	if (!inner) {
		if (OnTop) {
			type = "full";
		} else {
			type = "outer";
		}
	}
	if (!strength) {
		return null;
	}
	return {distance, angle, highlightColor, highlightAlpha, shadowColor, shadowAlpha, blurX, blurY, strength, quality, type, knockout};
}
SwfParser.prototype.gradientGlowFilter = function() {
	var byteStream = this.byteStream;
	var i;
	var numColors = byteStream.readUint8();
	var colors = [];
	var alphas = [];
	for (i = 0; i < numColors; i++) {
		var rgba = this.rgba();
		alphas[alphas.length] = rgba[3];
		colors[colors.length] = rgba[0] << 16 | rgba[1] << 8 | rgba[2];
	}
	var ratios = [];
	for (i = 0; i < numColors; i++) {
		ratios[ratios.length] = byteStream.readUint8();
	}
	var blurX = byteStream.readFixed16();
	var blurY = byteStream.readFixed16();
	var angle = byteStream.readFixed16() * 180 / Math.PI;
	var distance = byteStream.readFixed16();
	var strength = byteStream.readFloat16() / 256;
	var inner = (byteStream.getUIBits(1)) ? true : false;
	var knockout = (byteStream.getUIBits(1)) ? true : false;
	byteStream.getUIBits(1);
	var onTop = byteStream.getUIBits(1);
	var quality = byteStream.getUIBits(4);
	var type = "inner";
	if (!inner) {
		if (onTop) {
			type = "full";
		} else {
			type = "outer";
		}
	}
	if (!strength) {
		return null;
	}
	return {distance, angle, colors, alphas, ratios, blurX, blurY, strength, quality, type, knockout};
}
SwfParser.prototype.convolutionFilter = function() {
	var byteStream = this.byteStream;
	var obj = Object.create(null);
	obj.matrixX = byteStream.readUint8();
	obj.matrixY = byteStream.readUint8();
	obj.divisor = byteStream.readFloat16() | byteStream.readFloat16();
	obj.bias = byteStream.readFloat16() | byteStream.readFloat16();
	var count = obj.matrixX * obj.matrixY;
	var matrixArr = [];
	while (count--) {
		matrixArr.push(byteStream.readUint32());
	}
	obj.defaultColor = this.rgba();
	byteStream.getUIBits(6);
	obj.clamp = byteStream.getUIBits(1);
	obj.preserveAlpha = byteStream.getUIBits(1);
	return obj;
}
SwfParser.prototype.gradientBevelFilter = function() {
	var byteStream = this.byteStream;
	var NumColors = byteStream.readUint8();
	var i;
	var colors = [];
	var alphas = [];
	for (i = 0; i < NumColors; i++) {
		var rgba = this.rgba();
		alphas[alphas.length] = rgba[3];
		colors[colors.length] = rgba[0] << 16 | rgba[1] << 8 | rgba[2];
	}
	var ratios = [];
	for (i = 0; i < NumColors; i++) {
		ratios[ratios.length] = byteStream.readUint8();
	}
	var blurX = byteStream.readFixed16();
	var blurY = byteStream.readFixed16();
	var angle = byteStream.readFixed16() * 180 / Math.PI;
	var distance = byteStream.readFixed16();
	var strength = byteStream.readFloat16() / 256;
	var inner = (byteStream.getUIBits(1)) ? true : false;
	var knockout = (byteStream.getUIBits(1)) ? true : false;
	byteStream.getUIBits(1);
	var OnTop = byteStream.getUIBits(1);
	var quality = byteStream.getUIBits(4);
	var type = "inner";
	if (!inner) {
		if (OnTop) {
			type = "full";
		} else {
			type = "outer";
		}
	}
	if (!strength) {
		return null;
	}
	return {distance, angle, colors, alphas, ratios, blurX, blurY, strength, quality, type, knockout};
}
SwfParser.prototype.colorMatrixFilter = function() {
	var byteStream = this.byteStream;
	var matrixArr = [];
	for (var i = 0; i < 20; i++) {
		matrixArr.push(byteStream.readUint32());
	}
	return matrixArr;
}
SwfParser.prototype.parseSoundInfo = function() {
	var obj = Object.create(null);
	var byteStream = this.byteStream;
	var flags = byteStream.readUint8();
	switch ((flags >> 4) & 0b11) {
		case 0: // Event
			obj.event = 'event';
			break;
		case 1: // Start
			obj.event = 'start';
			break;
		case 2: // Stop
			obj.event = 'stop';
			break;
	}
	if (flags & 0b1) {
		obj.inSample = byteStream.readUint32()
	}
	if (flags & 0b10) {
		obj.outSample = byteStream.readUint32();
	}
	if (flags & 0b100) {
		obj.numLoops = byteStream.readUint16();
	}
	if (flags & 0b1000) {
		var count = byteStream.readUint8();
		var envelope = [];
		while (count--) {
			envelope.push({
				sample: byteStream.readUint32(),
				leftVolume: byteStream.readUint16(),
				rightVolume: byteStream.readUint16()
			});
		}
		obj.envelope = envelope;
	}
	return obj;
}
SwfParser.prototype.parseAction = function(data) {
	var actionParser = new ActionParser(data);
	return actionParser.parse();
}
SwfParser.prototype.parseABC = function(data) {
	var abcParser = new AbcParser(data);
	return abcParser.parse();
}

//////// Define ////////
SwfParser.prototype.parseDefineButton = function(ver, length) {
	var byteStream = this.byteStream;
	var obj = {};
	var endOffset = byteStream.position + length;
	obj.id = byteStream.readUint16();
	var ActionOffset = 0;
	if (ver == 2) {
		obj.flag = byteStream.readUint8();
		obj.trackAsMenu = (obj.flag & 0b1);
		ActionOffset = byteStream.readUint16();
	}
	obj.records = this.buttonRecords(ver);
	byteStream.byteAlign();
	if (ver === 1) {
		obj.actions = this.parseAction(byteStream.readBytes(endOffset - byteStream.position));
	} else {
		if (ActionOffset > 0) {
			obj.actions = this.buttonActions(endOffset);
		}
	}
	byteStream.byteAlign();
	return obj;
}
SwfParser.prototype.parseDefineButtonSound = function() {
	var byteStream = this.byteStream;
	var obj = Object.create(null);
	obj.buttonId = byteStream.readUint16();

	// Some SWFs (third-party soundboard creator?) create SWFs with a malformed
	// DefineButtonSound tag that has fewer than all 4 sound IDs.
	for (var i = 0; i < 4; i++) {
		var soundId = byteStream.readUint16();
		if (soundId) {
			var soundInfo = this.parseSoundInfo();
			switch (i) {
				case 0:
					obj.buttonStateUpSoundInfo = soundInfo;
					obj.buttonStateUpSoundId = soundId;
					break;
				case 1:
					obj.buttonStateOverSoundInfo = soundInfo;
					obj.buttonStateOverSoundId = soundId;
					break;
				case 2:
					obj.buttonStateDownSoundInfo = soundInfo;
					obj.buttonStateDownSoundId = soundId;
					break;
				case 3:
					obj.buttonStateHitTestSoundInfo = soundInfo;
					obj.buttonStateHitTestSoundId = soundId;
					break;
			}
		}
	}
	return obj;
}
SwfParser.prototype.parseDefineFont1 = function(length) {
	var byteStream = this.byteStream;
	var obj = Object.create(null);
	obj.version = 1;
	var endOffset = byteStream.position + length;
	var i;
	obj.id = byteStream.readUint16();
	var offset = byteStream.position;
	var numGlyphs = byteStream.readUint16();
	var offsetTable = [];
	offsetTable.push(numGlyphs);
	numGlyphs /= 2;
	numGlyphs--;
	for (i = numGlyphs; i--;) {
		offsetTable.push(byteStream.readUint16());
	}
	numGlyphs++;
	var glyphs = [];
	for (i = 0; i < numGlyphs; i++) {
		byteStream.setOffset(offset + offsetTable[i], 0);
		var numBits = byteStream.readUint8();
		glyphs.push(this.shapeRecords(1, {
			fillBits: numBits >> 4,
			lineBits: numBits & 0b1111
		}));
	}
	obj.glyphs = glyphs;
	byteStream.position = endOffset;
	byteStream.bit_offset = 0;
	return obj;
}
SwfParser.prototype.parseDefineFont2 = function(ver, length) {
	var byteStream = this.byteStream;
	var startOffset = byteStream.position;
	var obj = Object.create(null);
	obj.version = ver;
	obj.id = byteStream.readUint16();
	var i = 0;
	var fontFlags = byteStream.readUint8();
	obj.isBold = (fontFlags) & 1;
	obj.isItalic = (fontFlags >>> 1) & 1;
	var isWideCodes = (fontFlags >>> 2) & 1;
	obj.isWideCodes = isWideCodes;
	var isWideOffsets = (fontFlags >>> 3) & 1;
	obj.isWideOffsets = isWideOffsets;
	obj.isANSI = (fontFlags >>> 4) & 1;
	obj.isSmallText = (fontFlags >>> 5) & 1;
	obj.isShiftJIS = (fontFlags >>> 6) & 1;
	var hasLayout = (fontFlags >>> 7) & 1;
	obj.language = this.parseLanguage();
	
	// SWF19 states that the font name should not have a terminating null byte,
	// but it often does (depends on Flash IDE version?)
	obj.fontNameData = byteStream.readStringWithLength();

	var numGlyphs = byteStream.readUint16();
	obj.numGlyphs = numGlyphs;
	
	// SWF19 p. 164 doesn't make it super clear: If there are no glyphs,
	// then the following tables are omitted. But the table offset values
	// may or may not be written... (depending on Flash IDE version that was used?)
	if (numGlyphs == 0) {
		// Try to read the CodeTableOffset. It may or may not be present,
		// so just dump any error.
		if (isWideOffsets) {
			byteStream.readUint32();
		} else {
			byteStream.readUint16();
		}
	} else {
		var offset = byteStream.position;
		// OffsetTable
		var OffsetTable = [];
		if (isWideOffsets) {
			for (i = numGlyphs; i--;) {
				OffsetTable[OffsetTable.length] = byteStream.readUint32();
			}
		} else {
			for (i = numGlyphs; i--;) {
				OffsetTable[OffsetTable.length] = byteStream.readUint16();
			}
		}

		// CodeTableOffset
		var codeTableOffset;
		if (isWideOffsets) {
			codeTableOffset = byteStream.readUint32();
		} else {
			codeTableOffset = byteStream.readUint16();
		}

		// GlyphShapeTable
		var glyphShapeTable = [];
		for (i = 0; i < numGlyphs; i++) {
			// The glyph shapes are assumed to be positioned per the offset table.
			// Panic on debug builds if this assumption is wrong, maybe we need to
			// seek into these offsets instead?
			byteStream.setOffset(offset + OffsetTable[i], 0);

			// The glyph shapes must not overlap. Avoid exceeding to the next one.
			// TODO: What happens on decreasing offsets?
			var availableBytes;
			if (i < (numGlyphs - 1)) {
				availableBytes = (OffsetTable[i + 1] - OffsetTable[i]);
			} else {
				availableBytes = (codeTableOffset - OffsetTable[i]);
			}
			if (availableBytes == 0) {
				continue;
			}
			var numBits = byteStream.readUint8();
			if (availableBytes == 1) {
				continue;
			}
			// TODO: Avoid reading more than `available_bytes - 1`?
			var numFillBits = numBits >> 4;
			var numLineBits = numBits & 0b1111;
			glyphShapeTable.push(this.shapeRecords(1, {
				fillBits: numFillBits,
				lineBits: numLineBits
			}));
		}
		obj.glyphs = glyphShapeTable;

		// The code table is assumed to be positioned right after the glyph shapes.
		// Panic on debug builds if this assumption is wrong, maybe we need to seek
		// into the code table offset instead?
		byteStream.setOffset(offset + codeTableOffset, 0);

		// CodeTable
		var CodeTable = [];
		if (isWideCodes) {
			for (i = numGlyphs; i--;) {
				CodeTable.push(byteStream.readUint16());
			}
		} else {
			for (i = numGlyphs; i--;) {
				CodeTable.push(byteStream.readUint8());
			}
		}
		obj.codeTables = CodeTable;
	}

	// TODO: Is it possible to have a layout when there are no glyphs?
	if (hasLayout) {
		obj.layout = Object.create(null);
		obj.layout.ascent = byteStream.readUint16();
		obj.layout.descent = byteStream.readUint16();
		obj.layout.leading = byteStream.readInt16();
		var advanceTable = [];
		for (i = numGlyphs; i--;) {
			advanceTable.push(byteStream.readInt16());
		}
		obj.layout.advanceTable = advanceTable;
		// Some older SWFs end the tag here, as this data isn't used until v7.
		var boundsTable = [];
		if ((byteStream.position - startOffset) < length) {
			for (i = numGlyphs; i--;) {
				boundsTable.push(this.rect());
			}
			byteStream.byteAlign();
		}
		obj.layout.boundsTable = boundsTable;
		var kernings = [];
		if ((byteStream.position - startOffset) < length) {
			var kerningCount = byteStream.readUint16();
			for (i = kerningCount; i--;) {
				var kerningCode1 = ((isWideCodes) ? byteStream.readUint16() : byteStream.readUint8());
				var kerningCode2 = ((isWideCodes) ? byteStream.readUint16() : byteStream.readUint8());
				var kerningAdjustment = byteStream.readInt16();
				kernings.push({
					leftCode: kerningCode1,
					rightCode: kerningCode2,
					adjustment: kerningAdjustment
				});
			}
		}
		obj.kernings = kernings;
	}
	return obj;
}
SwfParser.prototype.parseDefineFont4 = function(length) {
	var byteStream = this.byteStream;
	var startOffset = byteStream.position;
	var obj = {};
	obj.version = 4;
	obj.id = byteStream.readUint16();
	var flags = byteStream.readUint8();
	obj.name = byteStream.readStringWithUntil();
	if (flags & 0b100) {
		obj.data = byteStream.readBytes(length - (byteStream.position - startOffset));
	} else {
		var e = (length - (byteStream.position - startOffset));
		byteStream.position += e;
	}
	obj.isItalic = (flags & 0b10);
	obj.isBold = (flags & 0b1);
	return obj;
}
SwfParser.prototype.parseDefineFontInfo = function(ver, length) {
	var byteStream = this.byteStream;
	var endOffset = byteStream.position + length;
	var obj = {};
	obj.id = byteStream.readUint16();
	obj.version = ver;
	obj.fontNameData = byteStream.readStringWithLength();
	var flags = byteStream.readUint8();
	obj.isWideCodes = flags & 1;
	obj.isBold = (flags >>> 1) & 1;
	obj.isItalic = (flags >>> 2) & 1;
	obj.isShiftJIS = (flags >>> 3) & 1;
	obj.isANSI = (flags >>> 4) & 1;
	obj.isSmallText = (flags >>> 5) & 1;
	byteStream.byteAlign();
	if (ver === 2) {
		obj.language = this.parseLanguage();
	}
	var codeTable = [];
	var tLen = endOffset - byteStream.position;
	if (obj.isWideCodes) {
		while (tLen > 1) {
			codeTable[codeTable.length] = byteStream.readUint16();
			tLen -= 2;
		}
	} else {
		// TODO(Herschel): Warn for version 2.
		while (tLen > 0) {
			codeTable[codeTable.length] = byteStream.readUint8();
			tLen--;
		}
	}
	obj.codeTable = codeTable;

	// SWF19 has ANSI and Shift-JIS backwards?
	return obj;
}
SwfParser.prototype.parseDefineEditText = function() {
	var byteStream = this.byteStream;
	var obj = {};
	obj.id = byteStream.readUint16();
	obj.bounds = this.rect();
	var flag1 = byteStream.readUint16();

	var hasFont = flag1 & 1;
	var hasMaxLength = (flag1 >>> 1) & 1;
	var hasTextColor = (flag1 >>> 2) & 1;
	var hasInitialText = (flag1 >>> 7) & 1;
	var hasLayout = (flag1 >>> 13) & 1;
	var hasFontClass = (flag1 >>> 15) & 1;

	obj.isReadOnly = (flag1 >>> 3) & 1;
	obj.isPassword = (flag1 >>> 4) & 1;
	obj.isMultiline = (flag1 >>> 5) & 1;
	obj.isWordWrap = (flag1 >>> 6) & 1;
	obj.outlines = (flag1 >>> 8) & 1;
	obj.HTML = (flag1 >>> 9) & 1;
	obj.wasStatic = (flag1 >>> 10) & 1;
	obj.border = (flag1 >>> 11) & 1;
	obj.noSelect = (flag1 >>> 12) & 1;
	obj.autoSize = (flag1 >>> 14) & 1;

	if (hasFont) {
		obj.fontID = byteStream.readUint16();
	}
	if (hasFontClass) {
		obj.fontClass = byteStream.readStringWithUntil();
	}
	if (hasFont && !hasFontClass) {
		obj.fontHeight = byteStream.readUint16();
	}
	if (hasTextColor) {
		obj.textColor = this.rgba();
	}
	if (hasMaxLength) {
		obj.maxLength = byteStream.readUint16();
	}
	if (hasLayout) {
		obj.layout = Object.create(null);
		obj.layout.align = this.textAlign(byteStream.readUint8());
		obj.layout.leftMargin = byteStream.readUint16();
		obj.layout.rightMargin = byteStream.readUint16();
		obj.layout.indent = byteStream.readUint16();
		obj.layout.leading = byteStream.readInt16();
	}
	obj.variableName = byteStream.readStringWithUntil();
	if (hasInitialText) {
		obj.initialText = byteStream.readStringWithUntil();
	}
	return obj;
}
SwfParser.prototype.parseDefineSprite = function(length) {
	var obj = Object.create(null);
	var byteStream = this.byteStream;
	obj.id = byteStream.readUint16();
	obj.numFrames = byteStream.readUint16();
	this.taglengthstack[this.taglengthstackSize++] = (this.byteStream.position + (length - 4));
	obj.tags = this.parseTags();
	return obj;
}
SwfParser.prototype.parseDefineShape = function(version) {
	var byteStream = this.byteStream;
	var obj = Object.create(null);
	obj.id = byteStream.readUint16();
	obj.bounds = this.rect();
	obj.version = version;
	if (version >= 4) {
		obj.edgeBounds = this.rect();
		var flags = byteStream.readUint8();
		obj.scalingStrokes = flags & 1;
		obj.nonScalingStrokes = (flags >>> 1) & 1;
		obj.fillWindingRule = (flags >>> 2) & 1;
	}
	obj.shapes = this.shapeWithStyle(version);
	return obj;
}
SwfParser.prototype.parseDefineSound = function(length) {
	var obj = Object.create(null);
	var byteStream = this.byteStream;
	var startOffset = byteStream.position;
	obj.id = byteStream.readUint16();
	obj.format = this.parseSoundFormat();
	obj.numSamples = byteStream.readUint32();
	var sub = byteStream.position - startOffset;
	var dataLength = length - sub;
	obj.data = byteStream.readBytes(dataLength);
	return obj;
}
SwfParser.prototype.parseDefineText = function(ver) {
	var byteStream = this.byteStream;
	var obj = {};
	obj.id = byteStream.readUint16();
	obj.bounds = this.rect();
	obj.matrix = this.matrix();
	var GlyphBits = byteStream.readUint8();
	var AdvanceBits = byteStream.readUint8();
	obj.textRecords = this.getTextRecords(ver, GlyphBits, AdvanceBits);
	return obj;
}
SwfParser.prototype.parseDefineBinaryData = function(length) {
	var byteStream = this.byteStream;
	var obj = Object.create(null)
	obj.id = byteStream.readUint16();
	byteStream.readUint32();
	obj.data = byteStream.readBytes(length - 6);
	return obj;
}
SwfParser.prototype.parseDefineScalingGrid = function() {
	var byteStream = this.byteStream;
	var obj = Object.create(null);
	obj.characterId = byteStream.readUint16();
	obj.splitter = this.rect();
	byteStream.byteAlign();
	return obj;
}
SwfParser.prototype.parseDefineSceneAndFrameLabelData = function() {
	var byteStream = this.byteStream;
	var obj = Object.create(null);
	var sceneCount = byteStream.getU30();
	obj.sceneInfo = [];
	while (sceneCount--) {
		obj.sceneInfo.push({
			offset: byteStream.getU30(),
			name: decodeURIComponent(byteStream.readStringWithUntil())
		});
	}
	var frameLabelCount = byteStream.getU30();
	obj.frameInfo = [];
	while (frameLabelCount--) {
		obj.frameInfo.push({
			num: byteStream.getU30(),
			label: decodeURIComponent(byteStream.readStringWithUntil())
		});
	}
	return obj;
}
SwfParser.prototype.parseDefineVideoStream = function() {
	var byteStream = this.byteStream;
	var obj = Object.create(null);
	obj.id = byteStream.readUint16();
	obj.numFrames = byteStream.readUint16();
	obj.width = byteStream.readUint16();
	obj.height = byteStream.readUint16();
	// TODO(Herschel): Check SWF version.
	var flags = byteStream.readUint8();
	switch (byteStream.readUint8()) {
		case 0: // None
			obj.codec = "none";
			break;
		case 2: // H263
			obj.codec = "H263";
			break;
		case 3: // ScreenVideo
			obj.codec = "ScreenVideo";
			break;
		case 4: // Vp6
			obj.codec = "Vp6";
			break;
		case 5: // Vp6WithAlpha
			obj.codec = "Vp6WithAlpha";
			break;
		case 6: // ScreenVideoV2
			obj.codec = "ScreenVideoV2";
			break;
		default:
			throw new Error("Invalid video codec.");
	}
	switch ((flags >> 1) & 0b111) {
		case 0: // None
			obj.deblocking = "useVideoPacketValue";
			break;
		case 1: // None
			obj.deblocking = "none";
			break;
		case 2: // Level1
			obj.deblocking = "Level1";
			break;
		case 3: // Level2
			obj.deblocking = "Level2";
			break;
		case 4: // Level3
			obj.deblocking = "Level3";
			break;
		case 5: // Level4
			obj.deblocking = "Level4";
			break;
		default:
			throw new Error("Invalid video deblocking value.");
	}
	obj.isSmoothed = flags & 0b1;
	return obj;
}
SwfParser.prototype.parseDefineBitsLossLess = function(ver, length) {
	var obj = Object.create(null);
	var byteStream = this.byteStream;
	var startOffset = byteStream.position;
	obj.id = byteStream.readUint16();
	obj.ver = ver;
	var format = byteStream.readUint8();
	obj.width = byteStream.readUint16();
	obj.height = byteStream.readUint16();
	switch (format) {
		case 3: // ColorMap8
			obj.numColors = byteStream.readUint8();
			break;
		case 4: // Rgb15
		case 5: // Rgb32
			break;
		default:
			throw new Error("Invalid bitmap format: " + format);
	}
	var sub = byteStream.position - startOffset;
	obj.data = byteStream.readBytes(length - sub);
	obj.format = format;
	return obj;
}
SwfParser.prototype.parseDefineFontName = function() {
	var obj = Object.create(null);
	var byteStream = this.byteStream;
	obj.id = byteStream.readUint16();
	obj.name = byteStream.readStringWithUntil();
	obj.copyrightInfo = byteStream.readStringWithUntil();
	return obj;
}
SwfParser.prototype.parseDefineBits = function(ver, length) {
	var obj = Object.create(null);
	var byteStream = this.byteStream;
	var startOffset = byteStream.position;
	obj.id = byteStream.readUint16();
	if (ver <= 2) {
		obj.data = byteStream.readBytes(length - 2);
	} else {
		var dataSize = byteStream.readUint32();
		var deblocking = null;
		if (ver >= 4) {
			deblocking = byteStream.readUint16();
		}
		var data = byteStream.readBytes(dataSize);
		var sub = byteStream.position - startOffset;
		var alphaData = byteStream.readBytes(length - sub);
		obj.data = data;
		obj.alphaData = alphaData;
		obj.deblocking = deblocking;
	}
	return obj;
}
SwfParser.prototype.parseDefineButtonCxform = function(length) {
	var byteStream = this.byteStream;
	var startOffset = byteStream.position;
	var obj = Object.create(null);
	// SWF19 is incorrect here. You can have >1 color transforms in this tag. They apply
	// to the characters in a button in sequence.

	obj.id = byteStream.readUint16();
	var colorTransforms = [];
	
	// Read all color transforms.
	while ((byteStream.position - startOffset) < length) {
		colorTransforms.push(this.colorTransform(false));
		byteStream.byteAlign();
	}
	obj.colorTransforms = colorTransforms;
	return obj;
}
SwfParser.prototype.parseDefineMorphShape = function(ver) {
	var byteStream = this.byteStream;
	var obj = {};
	obj.id = byteStream.readUint16();
	obj.startBounds = this.rect();
	obj.endBounds = this.rect();
	if (ver == 2) {
		obj.startEdgeBounds = this.rect();
		obj.endEdgeBounds = this.rect();
		var flags = byteStream.readUint8();
		obj.isScalingStrokes = flags & 1;
		obj.isNonScalingStrokes = (flags >>> 1) & 1;
	}
	byteStream.readUint32(); // Offset to EndEdges.
	obj.morphFillStyles = this.morphFillStyleArray(ver);
	obj.morphLineStyles = this.morphLineStyleArray(ver);

	// TODO(Herschel): Add read_shape
	obj.StartEdges = this.morphShapeWithStyle(ver, false);
	obj.EndEdges = this.morphShapeWithStyle(ver, true);
	return obj;
}
SwfParser.prototype.parseDefineFontAlignZones = function(length) {
	var byteStream = this.byteStream;
	var tag = Object.create(null);
	var startOffset = byteStream.position;
	tag.id = byteStream.readUint16();
	tag.thickness = byteStream.readUint8();
	var zones = [];
	while (byteStream.position < (startOffset + length)) {
		byteStream.readUint8(); // Always 2.
		zones.push({
			left: byteStream.readInt16(),
			width: byteStream.readInt16(),
			bottom: byteStream.readInt16(),
			height: byteStream.readInt16()
		});
		byteStream.readUint8(); // Always 0b000000_11 (2 dimensions).
	}
	tag.zones = zones;
	return tag;
}
SwfParser.prototype.parsePlaceObject = function(ver, length) {
	var byteStream = this.byteStream;
	var obj = Object.create(null);
	var startOffset = byteStream.position;
	obj.version = ver;
	if (ver === 1) {
		obj.characterId = byteStream.readUint16();
		obj.depth = byteStream.readUint16();
		obj.matrix = this.matrix();
		byteStream.byteAlign();
		if ((byteStream.position - startOffset) < length) {
			obj.colorTransform = this.colorTransform();
		}
	} else {
		var flags;
		if (ver >= 3) {
			flags = byteStream.readUint16();
		} else {
			flags = byteStream.readUint8();
		}
		obj.depth = byteStream.readUint16();

		var isMove = (flags & 1);
		var hasCharacter = (flags >>> 1) & 1;
		var hasMatrix = (flags >>> 2) & 1;
		var hasColorTransform = (flags >>> 3) & 1;
		var hasRatio = (flags >>> 4) & 1;
		var hasName = (flags >>> 5) & 1;
		var hasClipDepth = (flags >>> 6) & 1;
		var hasClipActions = (flags >>> 7) & 1;
		// PlaceObject3
		var hasFilters = (flags >>> 8) & 1;
		var hasBlendMode = (flags >>> 9) & 1;
		var hasBitmapCache = (flags >>> 10) & 1;
		var hasClassName = (flags >>> 11) & 1;
		var hasImage = (flags >>> 12) & 1;
		var hasVisible = (flags >>> 13) & 1;
		var hasBackgroundColor = (flags >>> 14) & 1;

		// PlaceObject3
		// SWF19 p.40 incorrectly says class name if (HasClassNameFlag || (HasImage && HasCharacterID))
		// I think this should be if (HasClassNameFlag || (HasImage && !HasCharacterID)),
		// you use the class name only if a character ID isn't present.
		// But what is the case where we'd have an image without either HasCharacterID or HasClassName set?
		obj.hasImage = hasImage;
		if ((hasClassName) || ((obj.hasImage) && !hasCharacter)) {
			obj.className = byteStream.readStringWithUntil();
		}
		obj.isMove = isMove;
		if (hasCharacter) {
			obj.characterId = byteStream.readUint16();
		}
		if (!obj.isMove && !hasCharacter) {
			throw new Error("Invalid PlaceObject type");
		}
		if (hasMatrix) {
			obj.matrix = this.matrix();
		}
		if (hasColorTransform) {
			obj.colorTransform = this.colorTransform(true);
		}
		if (hasRatio) {
			obj.ratio = byteStream.readUint16();
		}
		if (hasName) {
			obj.name = byteStream.readStringWithUntil();
		}
		if (hasClipDepth) {
			obj.clipDepth = byteStream.readUint16();
		}
		// PlaceObject3
		if (hasFilters) {
			obj.filters = this.getFilterList();
		}
		if (hasBlendMode) {
			obj.blendMode = this.parseBlendMode();
		}
		if (hasBitmapCache) {
			obj.bitmapCache = byteStream.readUint8();
		}
		if (hasVisible) {
			obj.visible = byteStream.readUint8();
		}
		if (hasBackgroundColor) {
			obj.backgroundColor = this.rgba();
		}
		if (hasClipActions) {
			obj.clipActions = this.parseClipActions(startOffset, length);
		}
		// PlaceObject4
		if (ver === 4) {
			obj.amfData = byteStream.readBytes((length - (byteStream.position - startOffset)));
		}
	}
	byteStream.byteAlign();
	return obj;
}
SwfParser.prototype.parseDoAction = function(length) {
	var byteStream = this.byteStream;
	var obj = Object.create(null);
	obj.action = this.parseAction(byteStream.readBytes(length));
	return obj;
}
SwfParser.prototype.parseDoInitAction = function(length) {
	var byteStream = this.byteStream;
	var obj = Object.create(null);
	obj.spriteId = byteStream.readUint16();
	obj.action = this.parseAction(byteStream.readBytes(length - 2));
	return obj;
}
SwfParser.prototype.parseDoABC = function(ver, length) {
	var byteStream = this.byteStream;
	var startOffset = byteStream.position;
	var obj = Object.create(null);
	obj.version = ver;
	obj.flags = byteStream.readUint32();
	obj.lazyInitialize = obj.flags & 1;
	obj.name = byteStream.readStringWithUntil();
	var offset = length - (byteStream.position - startOffset) | 0;
	obj.abc = this.parseABC(byteStream.readBytes(offset));
	return obj;
}
SwfParser.prototype.parseProductInfo = function() {
	// Not documented in SWF19 reference.
	// See http://wahlers.com.br/claus/blog/undocumented-swf-tags-written-by-mxmlc/
	var byteStream = this.byteStream;
	var obj = Object.create(null);
	obj.productID = byteStream.readUint32();
	obj.edition = byteStream.readUint32();
	obj.majorVersion = byteStream.readUint8();
	obj.minorVersion = byteStream.readUint8();
	obj.buildBumber = byteStream.readUint64();
	obj.compilationDate = byteStream.readUint64();
	return obj;
}
SwfParser.prototype.parseDebugID = function(length) {
	// Not documented in SWF19 reference.
	// See http://wahlers.com.br/claus/blog/undocumented-swf-tags-written-by-mxmlc/
	var byteStream = this.byteStream;
	var obj = Object.create(null);
	obj.debugId = byteStream.readUint8();
	byteStream.position--;
	byteStream.position += length;
	return obj;
}
SwfParser.prototype.parseNameCharacter = function() {
	// Not documented in SWF19 reference, and seems to be ignored by the official Flash Player.
	// Not generated by any version of the Flash IDE, but some 3rd party tools contain it.
	// See https://www.m2osw.com/swf_tag_namecharacter
	var byteStream = this.byteStream;
	var obj = Object.create(null);
	obj.id = byteStream.readUint16();
	obj.name = byteStream.readStringWithUntil();
	return obj;
}
SwfParser.prototype.parseFileAttributes = function() {
	var byteStream = this.byteStream;
	var obj = Object.create(null);
	var flags = byteStream.readUint32();

	/// Whether this SWF requests hardware acceleration to blit to the screen.
	obj.useDirectBlit = (flags >> 6) & 1;

	/// Whether this SWF requests hardware acceleration for compositing.
	obj.useGPU = (flags >> 5) & 1;

	/// Whether this SWF contains XMP metadata in a Metadata tag.
	obj.hasMetadata = (flags >> 4) & 1;

	/// Whether this SWF uses ActionScript 3 (AVM2).
	obj.isActionScript3 = (flags >> 3) & 1;

	/// Whether this SWF should be placed in the network sandbox when run locally.
	///
	/// SWFs in the network sandbox can only access network resources,  not local resources.
	/// SWFs in the local sandbox can only access local resources, not network resources.
	obj.useNetworkSandbox = (flags >> 0) & 1;
	return obj;
}
SwfParser.prototype.parseSymbolClass = function() {
	var byteStream = this.byteStream;
	var obj = Object.create(null);
	var symbols = [];
	var count = byteStream.readUint16();
	while (count--) {
		symbols.push({
			tagId: byteStream.readUint16(),
			path: byteStream.readStringWithUntil()
		});
	}
	obj.symbols = symbols;
	return obj;
}
SwfParser.prototype.parseFrameLabel = function(length) {
	var byteStream = this.byteStream;
	var startOffset = byteStream.position;
	var obj = Object.create(null);
	obj.label = byteStream.readStringWithUntil();
	var isAnchor = false;
	if (this._swfVersion >= 6 && (byteStream.position - startOffset) !== length) {
		isAnchor = byteStream.readUint8() != 0;
	}
	obj.isAnchor = isAnchor;
	return obj;
}
SwfParser.prototype.parseRemoveObject = function(ver) {
	var obj = Object.create(null);
	if (ver == 1) {
		obj.characterId = this.byteStream.readUint16();
	}
	obj.depth = this.byteStream.readUint16();
	return obj;
}
SwfParser.prototype.parseExportAssets = function() {
	var obj = Object.create(null);
	var byteStream = this.byteStream;
	var count = byteStream.readUint16();
	var packages = [];
	while (count--) {
		var id = byteStream.readUint16();
		var name = byteStream.readStringWithUntil();
		packages.push([id, name]);
	}
	obj.packages = packages;
	return obj;
}
SwfParser.prototype.parseImportAssets = function(ver) {
	var obj = Object.create(null);
	var url = this.byteStream.readStringWithUntil();
	if (ver == 2) {
		this.byteStream.readUint8(); // Reserved; must be 1
		this.byteStream.readUint8(); // Reserved; must be 0
	}
	var num_imports = this.byteStream.readUint16();
	var imports = [];
	while (num_imports--) {
		imports.push({
			id: this.byteStream.readUint16(),
			name: this.byteStream.readStringWithUntil()
		});
	}
	obj.url = url;
	obj.imports = imports;
	return obj;
}
SwfParser.prototype.parseStartSound = function(ver) {
	var byteStream = this.byteStream;
	var obj = Object.create(null);
	if (ver == 2) {
		obj.className = byteStream.readStringWithUntil();
	} else {
		obj.id = byteStream.readUint16();
	}
	obj.info = this.parseSoundInfo();
	return obj;
}
SwfParser.prototype.parseSoundStreamHead = function(ver) {
	var obj = Object.create(null);
	var byteStream = this.byteStream;
	// TODO: Verify version requirements.
	obj.playback = this.parseSoundFormat();
	obj.stream = this.parseSoundFormat();
	obj.samplePerBlock = byteStream.readUint16();
	obj.latencySeek = 0;
	if (obj.stream.compression === "MP3") {
		// SWF19 says latency seek is i16, not u16. Is this wrong> How are negative values used?
		// Some software creates SWF files that incorrectly omit this value.
		// Fail silently if it's missing.
		// TODO: What is Flash's behavior in this case? Does it read the value from the following bytes?
		obj.latencySeek = byteStream.readInt16();
	}
	byteStream.byteAlign();
	return obj;
}
SwfParser.prototype.parseSoundStreamBlock = function(length) {
	var byteStream = this.byteStream;
	var obj = Object.create(null);
	obj.compressed = byteStream.readBytes(length);
	return obj;
}
SwfParser.prototype.parseVideoFrame = function(length) {
	var byteStream = this.byteStream;
	var startOffset = byteStream.position;
	var obj = Object.create(null);
	obj.streamId = byteStream.readUint16();
	byteStream.readUint16();
	var sub = byteStream.position - startOffset;
	var dataLength = length - sub;
	obj.videoData = byteStream.readBytes(dataLength);
	return obj;
}
SwfParser.prototype.parseCSMTextSettings = function() {
	var obj = Object.create(null);
	var byteStream = this.byteStream;
	obj.id = byteStream.readUint16();
	var flags = byteStream.readUint8();
	obj.useAdvancedRendering = flags & 0b01000000;
	switch ((flags >> 3) & 0b11) {
		case 0:
			obj.gridFit = "none";
			break;
		case 1:
			obj.gridFit = "pixel";
			break;
		case 2:
			obj.gridFit = "subPixel";
			break;
		default:
			throw new Error("Invalid text grid fitting");
	}
	obj.thickness = byteStream.readFloat32();
	obj.sharpness = byteStream.readFloat32();
	byteStream.readUint8(); // Reserved (0).
	return obj;
}
var swfParse = function (info) {
}
class ActionParser {
	constructor(data) {
		this.byteStream = new ByteStream();
		this.byteStream.setData(data);
	}
	parseAvm1(data) {
		var avm1Parser = new ActionParser(data);
		return avm1Parser.parse();
	}
	parse() {
		return this.parseCaches();
	}
	parseCaches() {
		var caches = [];
		var byteOffset;
		while (this.byteStream.position < this.byteStream.getLength()) {
			byteOffset = this.byteStream.position;
			var action = this.parseAction();
			caches[byteOffset] = action;
			if (action.opcode === 0x00) break;
		}
		return caches
	}
	parseAction() {
		let {opcode, length} = this.parseOpcodeAndLength();
		let startOffset = this.byteStream.position;
		let action = this.parseOpcode(opcode, length);
		action.opcode = opcode;
		action.end = this.byteStream.position;
		if ((this.byteStream.position - startOffset) !== action.len) {
			console.log("Length mismatch in AVM1 action: ", opcode, ((this.byteStream.position - startOffset) + " = " + action.len));
			this.byteStream.position = startOffset + action.len;
		}
		return action;
	}
	parseOpcodeAndLength() {
		let opcode = this.byteStream.readUint8();
        let length = (opcode >= 0x80) ? this.byteStream.readUint16() : 0;
        return {opcode, length};
	}
	parseOpcode(opcode, length) {
		var action = Object.create(null);
		var lenFix = length;
		switch (opcode) {
			case 0x00: // End
			case 0x04: // NextFrame
			case 0x05: // PreviousFrame
			case 0x06: // Play
			case 0x07: // Stop
			case 0x08: // ToggleQuality
			case 0x09: // StopSounds
			case 0x0A: // Add
			case 0x0B: // Subtract
			case 0x0C: // Multiply
			case 0x0D: // Divide
			case 0x0E: // Equals
			case 0x0F: // Less
			case 0x10: // And
			case 0x11: // Or
			case 0x12: // Not
			case 0x13: // StringEquals
			case 0x14: // StringLength
			case 0x15: // StringExtract

			case 0x17: // Pop
			case 0x18: // ToInteger

			case 0x1C: // GetVariable
			case 0x1D: // SetVariable

			case 0x20: // SetTarget2
			case 0x21: // StringAdd
			case 0x22: // GetProperty
			case 0x23: // SetProperty
			case 0x24: // CloneSprite
			case 0x25: // RemoveSprite
			case 0x26: // Trace
			case 0x27: // StartDrag
			case 0x28: // EndDrag
			case 0x29: // StringLess
			case 0x2A: // Throw
			case 0x2B: // CastOp
			case 0x2C: // ImplementsOp
			case 0x2D: // FsCommand2

			case 0x30: // RandomNumber
			case 0x31: // MBStringLength
			case 0x32: // CharToAscii
			case 0x33: // AsciiToChar
			case 0x34: // GetTime
			case 0x35: // MBStringExtract
			case 0x36: // MBCharToAscii
			case 0x37: // MBAsciiToChar

			case 0x3A: // Delete
			case 0x3B: // Delete2
			case 0x3C: // DefineLocal
			case 0x3D: // CallFunction
			case 0x3E: // Return
			case 0x3F: // Modulo
			case 0x40: // NewObject
			case 0x41: // DefineLocal2
			case 0x42: // InitArray
			case 0x43: // InitObject
			case 0x44: // TypeOf
			case 0x45: // TargetPath
			case 0x46: // Enumerate
			case 0x47: // Add2
			case 0x48: // Less2
			case 0x49: // Equals2
			case 0x4a: // ToNumber
			case 0x4b: // ToString
			case 0x4c: // PushDuplicate
			case 0x4d: // StackSwap
			case 0x4e: // GetMember
			case 0x4f: // SetMember
			case 0x50: // Increment
			case 0x51: // Decrement
			case 0x52: // CallMethod
			case 0x53: // NewMethod
			case 0x54: // InstanceOf
			case 0x55: // Enumerate2
				
			case 0x60: // BitAnd
			case 0x61: // BitOr
			case 0x62: // BitXor
			case 0x63: // BitLShift
			case 0x64: // BitRShift
			case 0x65: // BitURShift
			case 0x66: // StrictEquals
			case 0x67: // Greater
			case 0x68: // StringGreater
			case 0x69: // Extends

			case 0x9E: // Call
				break;
			case 0x81: // GotoFrame
				action.frame = this.byteStream.readUint16();
				break;
			case 0x83: // GetUrl
				action.url = this.byteStream.readStringWithUntil();
				action.target = this.byteStream.readStringWithUntil();
				break;
			case 0x87: // StoreRegister
				action.register = this.byteStream.readUint8();
				break;
			case 0x88: // ConstantPool
				var count = this.byteStream.readUint16();
				var strings = [];
				if (count > 0) {
					while (count--) {
						strings.push(this.byteStream.readStringWithUntil());
					}
				}
				action.strings = strings;
				break;
			case 0x8A: // WaitForFrame
				action.frame = this.byteStream.readUint16();
				action.numActionsToSkip = this.byteStream.readUint8();
				break;
			case 0x8B: // SetTarget
				action.target = this.byteStream.readStringWithUntil();
				break;
			case 0x8C: // GotoLabel
				action.label = this.byteStream.readStringWithUntil();
				break;
			case 0x8D: // WaitForFrame2
				action.numActionsToSkip = this.byteStream.readUint8();
				break;
			case 0x8E: // DefineFunction2
				var name = this.byteStream.readStringWithUntil();
				var numParams = this.byteStream.readUint16();
				var registerCount = this.byteStream.readUint8();
				var flags = this.byteStream.readUint16();
				var params = [];
				while (numParams--) {
					params.push({
						registerIndex: this.byteStream.readUint8(),
						name: this.byteStream.readStringWithUntil()
					});
				}
				var codeLength = this.byteStream.readUint16();
				action.name = name;
				action.params = params;
				action.registerCount = registerCount;
				action.preloadThis = flags & 1;
				action.suppressThis = (flags >>> 1) & 1;
				action.preloadArguments = (flags >>> 2) & 1;
				action.suppressArguments = (flags >>> 3) & 1;
				action.preloadSuper = (flags >>> 4) & 1;
				action.suppressSuper = (flags >>> 5) & 1;
				action.preloadRoot = (flags >>> 6) & 1;
				action.preloadParent = (flags >>> 7) & 1;
				action.preloadGlobal = (flags >>> 8) & 1;
				action.actions = this.parseAvm1(this.byteStream.readBytes(codeLength));
				lenFix += codeLength;
				break;
			case 0x8F: // Try
				if (length < 7) {
					action.tryBody = [];
				} else {
					var flags = this.byteStream.readUint8();
					let trySize = this.byteStream.readUint16();
					let catchSize = this.byteStream.readUint16();
					let finallySize = this.byteStream.readUint16();
					var catchVar;
					if ((flags >>> 2) & 1) {
						catchVar = this.byteStream.readUint8();
					} else {
						catchVar = this.byteStream.readStringWithUntil();
					}
					var tryBody = this.parseAvm1(this.byteStream.readBytes(trySize));
					var catchBody = this.parseAvm1(this.byteStream.readBytes(catchSize));
					var finallyBody = this.parseAvm1(this.byteStream.readBytes(finallySize));
					action.catchVar = catchVar;
					action.tryBody = tryBody;
					if (flags & 1) {
						action.catchBody = catchBody;
					}
					if ((flags >>> 1) & 1) {
						action.finallyBody = finallyBody;
					}
					lenFix += (trySize + catchSize + finallySize);
				}
				break;
			case 0x94: // With
				var codeLength = this.byteStream.readUint16();
				action.actions = this.parseAvm1(this.byteStream.readBytes(codeLength));
				lenFix += codeLength;
				break;
			case 0x96: // Push
				var startOffset = this.byteStream.position;
				var values = [];
				while (this.byteStream.position < (startOffset + length)) {
					var value;
					var type = this.byteStream.readUint8();
					switch (type) {
						case 0: // String
							value = String(this.byteStream.readStringWithUntil());
							break;
						case 1: // Float
							value = this.byteStream.readFloat32();
							break;
						case 2: // Null
							value = null;
							break;
						case 3: // Undefined
							value = undefined;
							break;
						case 4: // Register
							value = this.byteStream.readUint8();
							break;
						case 5: // Boolean
							value = (this.byteStream.readUint8() != 0);
							break;
						case 6: // Double
							value = this.byteStream.readFloat64();
							break;
						case 7: // Int
							value = this.byteStream.readInt32();
							break;
						case 8: // ConstantPool
							value = this.byteStream.readUint8();
							break;
						case 9: // ConstantPool
							value = this.byteStream.readUint16();
							break;
						default:
							throw new Error("Invalid value type: " + type + " in ActionPush");
					}
					values.push({
						type: type,
						value: value
					});
				}
				action.values = values;
				break;
			case 0x99: // Jump
				action.offset = this.byteStream.readInt16();
				break;
			case 0x9A: // GetUrl2
                action.loadVariablesFlag = this.byteStream.getUIBits(1); // 0=none, 1=LoadVariables
                action.loadTargetFlag = this.byteStream.getUIBits(1);// 0=web, 1=Sprite
                this.byteStream.getUIBits(4); // Reserved
                action.sendVarsMethod = this.byteStream.getUIBits(2);// 0=NONE, 1=GET, 2=POST
				this.byteStream.byteAlign();
				break;
			case 0x9B: // DefineFunction
				var name = this.byteStream.readStringWithUntil();
				var count = this.byteStream.readUint16();
				var params = [];
				if (count > 0) {
					while (count--) {
						params.push(this.byteStream.readStringWithUntil());
					}
				}
				var codeLength = this.byteStream.readUint16();
				action.name = name;
				action.params = params;
				action.actions = this.parseAvm1(this.byteStream.readBytes(codeLength));
				lenFix += codeLength;
				break;
			case 0x9D: // If
				action.offset = this.byteStream.readInt16();
				break;
			case 0x9F: // GotoFrame2
				var flags = this.byteStream.readUint8();
				action.setPlaying = flags & 0b1 != 0;
				action.sceneOffset = ((flags & 0b10) != 0) ? this.byteStream.readUint16() : 0;
				break;
			default:
				console.log("Unknown AVM1 opcode: " + opcode);
				this.byteStream.position += length;
		}
		action.len = lenFix;
		return action;
	}
}
class AbcParser {
	constructor(data) {
		this.byteStream = new ByteStream();
		this.byteStream.setData(data);
	}
	parse() {
		var byteStream = this.byteStream;
		var len;
		var i;
		var minorVersion = byteStream.readUint16();
		var majorVersion = byteStream.readUint16();
		var constantPool = this.readConstantPool();
		len = byteStream.getU30();
		var methods = [];
		while (len--) {
			methods.push(this.readMethod());
		}
		len = byteStream.getU30();
		var metadata = [];
		while (len--) {
			metadata.push(this.readMetadata());
		}
		len = byteStream.getU30();
		i = len;
		var instances = [];
		while (i--) {
			instances.push(this.readInstance());
		}
		i = len;
		var classes = [];
		while (i--) {
			classes.push(this.readClass());
		}
		len = byteStream.getU30();
		var scripts = [];
		while (len--) {
			scripts.push(this.readScript());
		}
		len = byteStream.getU30();
		var methodBodies = [];
		while (len--) {
			methodBodies.push(this.readMethodBody());
		}
		var obj = Object.create(null);
		obj.minorVersion = minorVersion;
		obj.majorVersion = majorVersion;
		obj.constantPool = constantPool;
		obj.methods = methods;
		obj.metadata = metadata;
		obj.instances = instances;
		obj.classes = classes;
		obj.scripts = scripts;
		obj.methodBodies = methodBodies;
		return obj;
	}
	readConstantPool() {
		var byteStream = this.byteStream;
		var count;
		count = 0 | byteStream.getU30();
		var integers = [];
		for (let i = 1; count > i; i++) {
			integers[i] = byteStream.getS30();
		}
		count = 0 | byteStream.getU30();
		var uintegers = [];
		for (let i = 1; count > i; i++) {
			uintegers[i] = byteStream.getU30();
		}
		count = 0 | byteStream.getU30();
		var doubles = [];
		for (let i = 1; count > i; i++) {
			doubles[i] = byteStream.readDouble();
		}
		count = 0 | byteStream.getU30();
		var strings = [];
		for (let i = 1; count > i; i++) {
			// TODO: Avoid allocating a String.
			strings[i] = this.readString();
		}
		count = 0 | byteStream.getU30();
		var nameSpaces = [];
		for (let i = 1; count > i; i++) {
			nameSpaces[i] = this.readNamespace();
		}
		count = 0 | byteStream.getU30();
		var nsSets = [];
		for (let i = 1; count > i; i++) {
			var nsCount = byteStream.getU30();
			var ns = [];
			if (nsCount) {
				for (var j = 0; j < nsCount; j++) {
					ns[j] = byteStream.getU30();
				}
			}
			nsSets[i] = ns;
		}
		count = 0 | byteStream.getU30();
		var multinames = [];
		for (let i = 1; count > i; i++) {
			multinames[i] = this.readMultiname();
		}
		var obj = Object.create(null);
		obj.integer = integers;
		obj.uinteger = uintegers;
		obj.double = doubles;
		obj.strings = strings;
		obj.nameSpaces = nameSpaces;
		obj.nsSets = nsSets;
		obj.multinames = multinames;
		return obj;
	}
	readString() {
		var byteStream = this.byteStream;
		const t = [];
		let e = byteStream.getU30();
		for (let s = 0; e > s; ) {
			const e = byteStream.readUint8();
			switch (!0) {
				case e > 193:
					switch (!0) {
						case e < 248 && e > 239:
							t[t.length] = 55296 | ((7 & e) << 8 | (63 & byteStream.readUint8()) << 2 | byteStream.readUint8() >>> 4 & 3) - 64, t[t.length] = 56320 | (15 & byteStream.readUint8()) << 6 | 63 & byteStream.readUint8(), s += 4;
							break;
						case e < 240 && e > 223:
							t[t.length] = (15 & e) << 12 | (63 & byteStream.readUint8()) << 6 | 63 & byteStream.readUint8(), s += 3;
							break;
						case e < 224:
							t[t.length] = (31 & e) << 6 | 63 & byteStream.readUint8(), s += 2;
							break;
						default:
							t[t.length] = e, ++s
					}
					break;
				default:
					t[t.length] = e, ++s
			}
		}
		let s = "", a = 0, i = 65535;
		e = 0 | t.length;
		for (let r = 0; e > a; ) s += String.fromCharCode.apply(null, t.slice(a, i)), ++r, a = 65535 * r, i = 65535 * (r + 1);
		return s
	}
	readNamespace() {
		var byteStream = this.byteStream;
		var obj = Object.create(null);
		obj.kind = byteStream.readUint8();
		obj.name = byteStream.getU30();
		// TODO: AVM2 specs say that "non-system" namespaces
		// should have an empty name?
		switch (obj.kind) {
			case 0x05: // Private
			case 0x08: // Namespace
			case 0x16: // Package
			case 0x17: // PackageInternal
			case 0x18: // Protected
			case 0x19: // Explicit
			case 0x1a: // StaticProtected
				break;
			default:
				throw new Error("Invalid namespace kind");
		}
		return obj;
	}
	readMultiname() {
		var byteStream = this.byteStream;
		var obj = Object.create(null);
		obj.kind = byteStream.readUint8();
		switch (obj.kind) {
			case 0x07: // QName
			case 0x0D: // QNameA
				obj.ns = byteStream.getU30();
				obj.name = byteStream.getU30();
				break;
			case 0x0F: // RTQName
			case 0x10: // RTQNameA
				obj.string = byteStream.getU30();
				break;
			case 0x11: // RTQNameL
			case 0x12: // RTQNameLA
				break;
			case 0x09: // Multiname
			case 0x0E: // MultinameA
				obj.name = byteStream.getU30();
				obj.nsSet = byteStream.getU30();
				break;
			case 0x1B: // MultinameL
			case 0x1C: // MultinameLA
				obj.nsSet = byteStream.getU30();
				break;
			case 0x1d:
				obj.index = byteStream.getU30();
				var count = byteStream.getU30();
				var parameters = [];
				while (count--) {
					parameters.push(byteStream.getU30());
				}
				obj.parameters = parameters;
				break;
			default:
				throw new Error("Invalid multiname kind: " + obj.kind);
		}
		return obj;
	}
	readMethod() {
		var byteStream = this.byteStream;
		var obj = Object.create(null);
		var i;
		var count = byteStream.getU30();
		obj.paramCount = count;
		obj.returnType = byteStream.getU30();
		if (count) {
			var paramType = [];
			for (i = 0; i < count; i++) {
				paramType.push(byteStream.getU30());
			}
			obj.paramType = paramType;
		}
		obj.name = byteStream.getU30();
		var flags = byteStream.readUint8();
		obj.needArguments = flags & 1;
		obj.needActivation = (flags >>> 1) & 1;
		obj.needRest = (flags >>> 2) & 1;
		obj.ignoreRest = (flags >>> 4) & 1;
		obj.native = (flags >>> 5) & 1;
		obj.setDXNS = (flags >>> 6) & 1;
		if (8 & flags) {
			var options = [];
			var optionCount = byteStream.getU30();
			while (optionCount--) {
				options.push(this.readConstantValue());
			}
			obj.options = options;
		}
		if (128 & flags) {
			var paramNames = [];
			if (count) {
				for (i = 0; i < count; i++) {
					paramNames.push(byteStream.getU30());
				}
			}
			obj.paramNames = paramNames;
		}
		return obj;
	}
	readConstantValue() {
		var byteStream = this.byteStream;
		var obj = Object.create(null);
		obj.index = byteStream.getU30();
		obj.kind = byteStream.readUint8();
		switch (obj.kind) {
			case 0x00: // Undefined
			case 0x01: // String
			case 0x03: // Int
			case 0x04: // Uint
			case 0x05: // Private
			case 0x06: // Double
			case 0x08: // Namespace
			case 0x0a: // False
			case 0x0b: // True
			case 0x0c: // Null
			case 0x16: // Package
			case 0x17: // PackageInternal
			case 0x18: // Protected
			case 0x19: // Explicit
			case 0x1a: // StaticProtected
				break;
			default:
				throw new Error("Invalid namespace kind");
		}
		return obj;
	}
	readOptionalValue() {
		var byteStream = this.byteStream;
		var obj = Object.create(null);
		obj.index = byteStream.getU30();
		if (obj.index) {
			obj.kind = byteStream.readUint8();
			switch (obj.kind) {
				case 0x00: // Undefined
				case 0x01: // String
				case 0x03: // Int
				case 0x04: // Uint
				case 0x05: // Private
				case 0x06: // Double
				case 0x08: // Namespace
				case 0x0a: // False
				case 0x0b: // True
				case 0x0c: // Null
				case 0x16: // Package
				case 0x17: // PackageInternal
				case 0x18: // Protected
				case 0x19: // Explicit
				case 0x1a: // StaticProtected
					break;
				default:
					throw new Error("Invalid namespace kind");
			}
		}
		return obj;
	}
	readMetadata() {
		var byteStream = this.byteStream;
		var obj = Object.create(null);
		obj.name = byteStream.getU30();
		var count = byteStream.getU30();
		var items = [];
		while (count--) {
			items.push({
				key: byteStream.getU30(),
				value: byteStream.getU30()
			});
		}
		obj.items = items;
		return obj;
	}
	readInstance() {
		var byteStream = this.byteStream;
		var obj = Object.create(null);
		obj.name = byteStream.getU30();
		obj.superName = byteStream.getU30();
		var flags = byteStream.readUint8();
		if (flags & 0x08) {
			obj.protectedNs = byteStream.getU30();
		}
		var count = byteStream.getU30();
		var interfaces = [];
		while (count--) {
			interfaces.push(byteStream.getU30());
		}
		obj.interfaces = interfaces;
		obj.initMethod = byteStream.getU30();
		obj.trait = this.readTrait();
		obj.isSealed = flags & 0x01;
		obj.isFinal = flags & 0x02;
		obj.isInterface = flags & 0x04;
		return obj;
	}
	readClass() {
		var byteStream = this.byteStream;
		var initMethod = byteStream.getU30();
		var trait = this.readTrait();
		return {initMethod, trait};
	}
	readScript() {
		var byteStream = this.byteStream;
		var initMethod = byteStream.getU30();
		var trait = this.readTrait();
		return {initMethod, trait};
	}
	readTrait() {
		var byteStream = this.byteStream;
		var count = byteStream.getU30();
		var trait = [];
		while (count--) {
			var tObj = Object.create(null);
			tObj.id = byteStream.getU30();
			var flags = byteStream.readUint8();
			var kind = flags & 0b1111;
			var data = Object.create(null);
			switch (kind) {
				case 0: // Slot
				case 6: // Const
					data.id = byteStream.getU30();
					data.name = byteStream.getU30();
					data.value = this.readOptionalValue();
					break;
				case 1: // Method
				case 2: // Getter
				case 3: // Setter
				case 4: // Class
				case 5: // Function
					data.id = byteStream.getU30();
					data.info = byteStream.getU30();
					break;
				default:
					throw new Error("Invalid trait kind: " + kind);
			}
			tObj.kind = kind;
			tObj.data = data;
			if (flags & 0x40) {
				var metadataCount = byteStream.getU30();
				var metadata = [];
				if (metadataCount) {
					for (var j = 0; j < metadataCount; j++) {
						metadata.push(byteStream.getU30());
					}
				}
				tObj.metadata = metadata;
			}
			tObj.isFinal = (flags & 0x10);
			tObj.isOverride = (flags & 0x20);
			trait.push(tObj);
		}
		return trait;
	}
	readMethodBody() {
		var byteStream = this.byteStream;
		var obj = Object.create(null);
		obj.method = byteStream.getU30();
		obj.maxStack = byteStream.getU30();
		obj.localCount = byteStream.getU30();
		obj.initScopeDepth = byteStream.getU30();
		obj.maxScopeDepth = byteStream.getU30();
		obj.codes = this.readCodes();
		var count = byteStream.getU30();
		var exceptions = [];
		while (count--) {
			exceptions[exceptions.length] = this.readException();
		}
		obj.exceptions = exceptions;
		obj.trait = this.readTrait();
		return obj;
	}
	readCodes() {
		var byteStream = this.byteStream;
		var count = byteStream.getU30();
		var array = [];
		var cacheOffset;
		for (var i = 0; i < count; i++) {
			var obj = Object.create(null);
			var code = byteStream.readUint8();
			var offset = 0;
			obj.code = code;
			cacheOffset = byteStream.position;
			switch (code) {
				case 0xa0: // Add
				case 0xc5: // AddI
				case 0x87: // AsTypeLate
				case 0xA8: // BitAnd
				case 0x97: // BitNot
				case 0xa9: // BitOr
				case 0xaa: // BitXor
				case 0x01: // Bkpt
				case 0x78: // CheckFilter
				case 0x82: // CoerceA
				case 0x81: // CoerceB
				case 0x84: // CoerceD
				case 0x83: // CoerceI
				case 0x89: // CoerceO
				case 0x85: // CoerceS
				case 0x88: // CoerceU
				case 0x76: // ConvertB
				case 0x75: // ConvertD
				case 0x73: // ConvertI
				case 0x77: // ConvertO
				case 0x70: // ConvertS
				case 0x74: // ConvertU
				case 0x93: // Decrement
				case 0xc1: // DecrementI
				case 0xa3: // Divide
				case 0x2a: // Dup
				case 0x07: // DxnsLate
				case 0xab: // Equals
				case 0x72: // EscXAttr
				case 0x71: // EscXElem
				case 0x64: // GetGlobalScope
				case 0xd0: // GetLocal0
				case 0xd1: // GetLocal1
				case 0xd2: // GetLocal2
				case 0xd3: // GetLocal3
				case 0xb0: // GreaterEquals Listed incorrectly in AVM2 specs.
				case 0xaf: // GreaterThan
				case 0x1f: // HasNext
				case 0xb4: // In
				case 0x91: // Increment
				case 0xc0: // IncrementI
				case 0xb1: // InstanceOf
				case 0xb3: // IsTypeLate
				case 0x09: // Label
				case 0xae: // LessEquals
				case 0xad: // LessThan
				case 0x38: // Lf32
				case 0x39: // Lf64
				case 0x36: // Li16
				case 0x37: // Li32
				case 0x35: // Li8
				case 0xa5: // LShift
				case 0xa4: // Modulo
				case 0xa2: // Multiply
				case 0xc7: // MultiplyI
				case 0x90: // Negate
				case 0xc4: // NegateI
				case 0x57: // NewActivation
				case 0x1e: // NextName
				case 0x23: // NextValue
				case 0x02: // Nop
				case 0x96: // Not
				case 0x29: // Pop
				case 0x1d: // PopScope
				case 0x27: // PushFalse
				case 0x28: // PushNaN
				case 0x20: // PushNull
				case 0x30: // PushScope
				case 0x26: // PushTrue
				case 0x21: // PushUndefined
				case 0x1c: // PushWith
				case 0x48: // ReturnValue
				case 0x47: // ReturnVoid
				case 0xa6: // RShift
				case 0xd4: // SetLocal0
				case 0xd5: // SetLocal1
				case 0xd6: // SetLocal2
				case 0xd7: // SetLocal3
				case 0x3d: // Sf32
				case 0x3e: // Sf64
				case 0x3b: // Si16
				case 0x3c: // Si32
				case 0x3a: // Si8
				case 0xac: // StrictEquals
				case 0xa1: // Subtract
				case 0xc6: // SubtractI
				case 0x2b: // Swap
				case 0x50: // Sxi1
				case 0x52: // Sxi16
				case 0x51: // Sxi8
				case 0x03: // Throw
				case 0xf3: // Timestamp
				case 0x95: // TypeOf
				case 0xa7: // URShift
					break;
				case 0x53: // ApplyType
				case 0x80: // Coerce
				case 0x86: // AsType
				case 0xf2: // BkptLine
				case 0x41: // Call
				case 0x42: // Construct
				case 0x49: // ConstructSuper
				case 0xf1: // DebugFile
				case 0xf0: // DebugLine
				case 0x94: // DecLocal
				case 0xc3: // DecLocalI
				case 0x6a: // DeleteProperty
				case 0x06: // Dxns
				case 0x5f: // FindDef
				case 0x5e: // FindProperty
				case 0x5d: // FindPropStrict
				case 0x59: // GetDescendants
				case 0x6e: // GetGlobalSlot
				case 0x60: // GetLex
				case 0x62: // GetLocal
				case 0x67: // GetOuterScope
				case 0x66: // GetProperty
				case 0x6c: // GetSlot
				case 0x04: // GetSuper
				case 0x92: // IncLocal
				case 0xc2: // IncLocalI
				case 0x68: // InitProperty
				case 0xb2: // IsType
				case 0x08: // Kill
				case 0x56: // NewArray
				case 0x5a: // NewCatch
				case 0x58: // NewClass
				case 0x40: // NewFunction
				case 0x55: // NewObject
				case 0x22: // PushConstant unused
				case 0x2f: // PushDouble
				case 0x2d: // PushInt
				case 0x31: // PushNamespace
				case 0x25: // PushShort
				case 0x2c: // PushString
				case 0x2e: // PushUint
				case 0x6f: // SetGlobalSlot
				case 0x63: // SetLocal
				case 0x61: // SetProperty
				case 0x6d: // SetSlot
				case 0x05: // SetSuper
					obj.value1 = byteStream.getU30();
					break;
				case 0x43: // CallMethod
				case 0x46: // CallProperty
				case 0x4c: // CallPropLex
				case 0x4f: // CallPropVoid
				case 0x44: // CallStatic
				case 0x45: // CallSuper
				case 0x4e: // CallSuperVoid
				case 0x4a: // ConstructProp
				case 0x32: // HasNext2
					obj.value1 = byteStream.getU30();
					obj.value2 = byteStream.getU30();
					break;
				case 0x65: // GetScopeObject
				case 0x24: // PushByte
					obj.value1 = byteStream.readInt8();
					break;
				case 0x13: // IfEq
				case 0x12: // IfFalse
				case 0x18: // IfGe
				case 0x17: // IfGt
				case 0x16: // IfLe
				case 0x15: // IfLt
				case 0x14: // IfNe
				case 0x0f: // IfNge
				case 0x0e: // IfNgt
				case 0x0d: // IfNle
				case 0x0c: // IfNlt
				case 0x19: // IfStrictEq
				case 0x1a: // IfStrictNe
				case 0x11: // IfTrue
				case 0x10: // Jump
					obj.value1 = byteStream.readInt24();
					break;
				case 0x1b: // LookupSwitch
					obj.value1 = byteStream.readInt24();
					obj.value2 = byteStream.getU30();
					obj.value3 = [];
					for (let index = -1; index < obj.value2; ) {
						index++;
						obj.value3.push(byteStream.readInt24());
					}
					break;
				case 0xef: // Debug
					obj.value1 = byteStream.readUint8();
					obj.value2 = byteStream.getU30();
					obj.value3 = byteStream.readUint8();
					obj.value4 = byteStream.getU30();
					break;
				default:
					throw new Error("Unknown ABC opcode: " + code);
			}
			offset += (byteStream.position - cacheOffset);
			obj.offset = offset;
			array[i] = obj;
			i += offset;
		}
		return array;
	}
	readException() {
		var byteStream = this.byteStream;
		var obj = Object.create(null);
		obj.from = byteStream.getU30();
		obj.to = byteStream.getU30();
		obj.target = byteStream.getU30();
		obj.excType = byteStream.getU30();
		obj.varName = byteStream.getU30();
		return obj;
	}
}