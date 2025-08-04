
/**
* 使用此文件来定义自定义函数和图形块。
* 想了解更详细的信息，请前往 https://makecode.microbit.org/blocks/custom
*/


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
        // wait for Hardware standby and DeviceBooted
        basic.pause(2)
        initVL6180_impl(addr)
    }

    /**
     * 设置新地址，重新上电后重置为 0x29
     * @param addr vl6180 7-bit i2c 当前地址, eg: 0x29
     * @param newAddr 计划新设置的 7-bit i2c 地址
     */
    //%  addr.min=0x07 addr.max=0x77 addr.defl=0x29 
    //%  newAddr.min=0x07 addr.newAddr=0x77 newAddr.defl=0x29
    //% block="设置在地址 %addr 的VL6180|新地址为 %newAddr"
    //% weight=10
    export function setNewAddr(addr: number, newAddr: number):void {
        write1Byte(addr, I2C_SLAVE__DEVICE_ADDRESS, newAddr)
    }

    /**
     * 获取距离
     * @param addr vl6180 7-bit i2c 地址, eg: 0x29
     */
    //% addr.min=0x07 addr.max=0x77 addr.defl=0x29 
    //% block="读取地址为 %addr 的VL6180的距离"
    export function readRange(addr: number): number {
        write1Byte(addr, SYSRANGE__START, 1)
        return waitARange(addr)
    }

    // todo: SNR, SystemError, ECE Failed, Offset CAL

    //% block="当VL6180测到数据时，平滑窗口为 %meanTimes"
    export function continualRange(meanTimes:number, body:()=>void):void {

    }

    //% block
    export function latestValue():number {
        return 0
    }
}

// reg addr
const SYSRANGE__START = 0x18
const RESULT__INTERRUPT_STATUS_GPIO = 0x4F
const RESULT__RANGE_VAL = 0x62
const SYSTEM__INTERRUPT_CLEAR = 0x15
const SYSTEM__FRESH_OUT_OF_RESET = 0x16
const I2C_SLAVE__DEVICE_ADDRESS = 0x212
const SYSTEM__INTERRUPT_CONFIG_GPIO = 0x14
const SYSRANGE__THRESH_HIGH = 0x019
const SYSRANGE__THRESH_LOW = 0x019

const CONFIG_GPIO_INTERRUPT_NEW_SAMPLE_READY = 0x04
/** clear ranging interrupt in write to #SYSTEM_INTERRUPT_CLEAR */
const INTERRUPT_CLEAR_RANGING = 0x01
/** clear als interrupt  in write to #SYSTEM_INTERRUPT_CLEAR */
const INTERRUPT_CLEAR_ALS = 0x02
/** clear error interrupt in write to #SYSTEM_INTERRUPT_CLEAR */
const INTERRUPT_CLEAR_ERROR = 0x04

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

        // set range interrupt
        write1Byte(i2caddr, SYSTEM__INTERRUPT_CONFIG_GPIO, CONFIG_GPIO_INTERRUPT_NEW_SAMPLE_READY)
        // range: 8~200 
        write1Byte(i2caddr, SYSRANGE__THRESH_HIGH, 200)
        write1Byte(i2caddr, SYSRANGE__THRESH_LOW, 8)
        // clear all interrupt
        write1Byte(i2caddr, SYSTEM__INTERRUPT_CLEAR, INTERRUPT_CLEAR_ERROR | INTERRUPT_CLEAR_RANGING | INTERRUPT_CLEAR_ALS)

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
    return pins.i2cReadNumber(i2caddr, NumberFormat.UInt8BE, false)
}

function waitARange(addr: number):number {
    // pre-cal + ct of 50mm 88% + readout
    const delay = 3.2 + 0.24 + 4.3
    basic.pause(delay)
    while ((read1Byte(addr, RESULT__INTERRUPT_STATUS_GPIO)
        & CONFIG_GPIO_INTERRUPT_NEW_SAMPLE_READY) == 0) {
        basic.pause(1)
    }
    let ret = read1Byte(addr, RESULT__RANGE_VAL)
    write1Byte(addr, SYSTEM__INTERRUPT_CLEAR, INTERRUPT_CLEAR_RANGING)
    return ret
}

