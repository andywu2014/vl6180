
/**
* 使用此文件来定义自定义函数和图形块。
* 想了解更详细的信息，请前往 https://makecode.microbit.org/blocks/custom
*/

enum MyEnum {
    //% block="one"
    One,
    //% block="two"
    Two
}

/**
 * VL6180 blocks
 */
//% weight=40 color=#D35B53 icon="\uf2db"
namespace VL6180 {
    /**
     * 初始化
     * @param addr vl6180 7-bit i2c 地址, eg: 0x29
     */
    //%  addr.min=0x07 addr.max=0x77 addr.defl=0x29 block="初始化地址为 %addr 的VL6180"
    //% weight=100
    export function initVL6180(addr: number): void {
        initVL6180_impl(addr)
    }

    /**
     * 设置新地址，重新上电后重置为 0x29
     * @param addr vl6180 7-bit i2c 当前地址, eg: 0x29
     * @param newAddr 计划新设置的 7-bit i2c 地址
     */
    //%  addr.min=0x07 addr.max=0x77 addr.defl=0x29 
    //%  newAddr.min=0x07 addr.newAddr=0x77
    //% block="设置在地址 %addr 的VL6180 | 新地址为 %newAddr"
    //% weight=10
    export function setNewAddr(addr: number, newAddr: number):void {
        write1Byte(addr, I2C_SLAVE__DEVICE_ADDRESS, newAddr)
    }

    /**
     * TODO: describe your function here
     * @param addr describe value here, eg: 5
     */
    //% block
    export function readRange(addr: number): number {
        write1Byte(addr, SYSRANGE__START, 1)
        basic.pause(1000)
        let ret = read1Byte(addr, RESULT__RANGE_VAL)
        write1Byte(addr, SYSTEM__INTERRUPT_CLEAR, 1)
        return ret
    }
}

const SYSRANGE__START = 0x18
const RESULT__INTERRUPT_STATUS_GPIO = 0x4F
const RESULT__RANGE_VAL = 0x62
const SYSTEM__INTERRUPT_CLEAR = 0x15
const SYSTEM__FRESH_OUT_OF_RESET = 0x16
const I2C_SLAVE__DEVICE_ADDRESS = 0x212

// Initialize sensor with settings from ST application note AN4545, section
// "SR03 settings" - "Mandatory : private registers"
function initVL6180_impl(i2caddr: number) {
    if (read1Byte(i2caddr, SYSTEM__FRESH_OUT_OF_RESET) == 1) {
        write1Byte(i2caddr, 0x207, 0x01);
        write1Byte(i2caddr, 0x208, 0x01);
        write1Byte(i2caddr, 0x096, 0x00);
        // RANGE_SCALER = 253
        write1Byte(i2caddr, 0x097, 0xFD);
        write1Byte(i2caddr, 0x0E3, 0x01);
        write1Byte(i2caddr, 0x0E4, 0x03);
        write1Byte(i2caddr, 0x0E5, 0x02);
        write1Byte(i2caddr, 0x0E6, 0x01);
        write1Byte(i2caddr, 0x0E7, 0x03);
        write1Byte(i2caddr, 0x0F5, 0x02);
        write1Byte(i2caddr, 0x0D9, 0x05);
        write1Byte(i2caddr, 0x0DB, 0xCE);
        write1Byte(i2caddr, 0x0DC, 0x03);
        write1Byte(i2caddr, 0x0DD, 0xF8);
        write1Byte(i2caddr, 0x09F, 0x00);
        write1Byte(i2caddr, 0x0A3, 0x3C);
        write1Byte(i2caddr, 0x0B7, 0x00);
        write1Byte(i2caddr, 0x0BB, 0x3C);
        write1Byte(i2caddr, 0x0B2, 0x09);
        write1Byte(i2caddr, 0x0CA, 0x09);
        write1Byte(i2caddr, 0x198, 0x01);
        write1Byte(i2caddr, 0x1B0, 0x17);
        write1Byte(i2caddr, 0x1AD, 0x00);
        write1Byte(i2caddr, 0x0FF, 0x05);
        write1Byte(i2caddr, 0x100, 0x05);
        write1Byte(i2caddr, 0x199, 0x05);
        write1Byte(i2caddr, 0x1A6, 0x1B);
        write1Byte(i2caddr, 0x1AC, 0x3E);
        write1Byte(i2caddr, 0x1A7, 0x1F);
        write1Byte(i2caddr, 0x030, 0x00);

        write1Byte(i2caddr, SYSTEM__FRESH_OUT_OF_RESET, 0)
    }
}

function write1Byte(i2caddr: number, reg: number, value: number) {
    let buf = pins.createBuffer(3)
    buf.setNumber(NumberFormat.UInt16BE, 0, reg)
    buf.setNumber(NumberFormat.UInt8BE, 2, value)
    pins.i2cWriteBuffer(i2caddr, buf)
}

function read1Byte(i2caddr: number, reg: number) {
    pins.i2cWriteNumber(
        i2caddr,
        reg,
        NumberFormat.UInt16BE,
        true
    )
    return pins.i2cReadNumber(i2caddr, NumberFormat.Int8LE, false)
}

