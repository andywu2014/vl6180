
/**
* 使用此文件来定义自定义函数和图形块。
* 想了解更详细的信息，请前往 https://makecode.microbit.org/blocks/custom
*/


/**
 * VL6180 blocks
 */
//% weight=40 color=#D35B53 icon="\uf2db"
//% groups=['others', '计算', '标定', '状态']
namespace VL6180 {
    
    /**
     * 初始化并可设置新地址
     * @param addr vl6180 7-bit i2c 地址, eg: 0x29
     * @param win 平滑滤波的窗口长度, eg: 10
     */
    //% newAddr.min=0x07 newAddr.max=0x77 newAddr.defl=0x29
    //% block="初始化VL6180 || ，并新设地址为 %newAddr"
    //% weight=100
    export function initVL6180(newAddr?: number): void {
        newAddr = newAddr ? newAddr:0x29
        // wait for Hardware standby and DeviceBooted
        basic.pause(2)
        if (newAddr != DefaultAddr) {
            setNewAddr(DefaultAddr, newAddr)
        }
        initVL6180_impl(newAddr)
        
        control.raiseEvent(VL6180Inited, newAddr)
    }

    /**
     * 设置新地址，重新上电后重置为 0x29
     * @param addr vl6180 7-bit i2c 当前地址, eg: 0x29
     * @param newAddr 计划新设置的 7-bit i2c 地址
     */
    //%  addr.min=0x07 addr.max=0x77 addr.defl=0x29 
    //%  newAddr.min=0x07 addr.newAddr=0x77 newAddr.defl=0x29
    // block="设置在地址 %addr 的VL6180|新地址为 %newAddr"
    //% weight=10
    export function setNewAddr(addr: Addr, newAddr: number):void {
        // wait for Hardware standby and DeviceBooted
        basic.pause(2)
        write1Byte(addr, I2C_SLAVE__DEVICE_ADDRESS, newAddr)
    }


    /**
     * 获取距离
     * @param addr vl6180 7-bit i2c 地址, eg: 0x29
     */
    //% addr.min=0x07 addr.max=0x77 addr.defl=0x29 
    //% block="读取地址为 %addr 的VL6180的距离"
    //% weight=99
    export function readRange(addr: Addr): number {
        // if continual, read history
        if (isContinualMode(addr)) {
            basic.pause((read1Byte(addr, SYSRANGE__INTERMEASUREMENT_PERIOD) + 1) * 10)
            return readLatestRange(addr)
        } 

        return startASingleMeasurement(addr)
    }

    /**
     *  range 测量事件
     */
    //% addr.min=0x07 addr.max=0x77 addr.defl=0x29 
    //% block="当地址为 %addr 的VL6180测到 $value 时"
    //% draggableParameters="reporter"
    //% weight=98
    export function continualRange(addr: Addr, body: (value: number) => void):void {
        control.inBackground(function() {
            // wait for Initialization
            control.waitForEvent(VL6180Inited, addr)
            waitRangReady(addr)
            
            // period = (periodValue + 1) * 10 ms
            const periodValue = 9 // 100 ms
            write1Byte(addr, SYSRANGE__INTERMEASUREMENT_PERIOD, periodValue)
            write1Byte(addr, SYSRANGE__START, 3)

            while (true) {
                body(waitARange(addr))
                basic.pause(10)
            }
        })
    }

    /**
     * 最近几次的平均值，去掉最远端的无效值(0与255)
     */ 
    //% addr.min=0x07 addr.max=0x77 addr.defl=0x29 
    //% n.min=2 n.max=16 n.defl=5
    //% removeMaxMin.defl=true
    //% block="获取地址为 %addr 的VL6180 最近 %n 次的平均值 || ，去掉最值 %removeMaxMin"
    //% weight=97
    //% group="计算"
    export function averageLastest(addr: Addr, n: number, removeMaxMin?: boolean): number {
        // if not continual, start a single measurement
        if (!isContinualMode(addr)) {
            startASingleMeasurement(addr)
        }

        removeMaxMin = removeMaxMin ? removeMaxMin:true
        let buffer = readToBuffer(addr, RESULT__HISTORY_BUFFER_x, n)
        let min = 255, max = 0, sum = 0, count = 0
        // trim 0&255
        let offset = n-1
        for (; offset >= 1; offset--) {
            let v = buffer.getUint8(offset)
            if (v != 0 && v != 255) {
                break
            }
        }

        // 多于3个数 才去最值
        if (offset < 2) {
            removeMaxMin = false
        }

        for (; offset >= 0; offset--) {
            let v = buffer.getUint8(offset)
            sum += v
            min = Math.min(min, v)
            max = Math.max(max, v)
            count++
        }

        if (removeMaxMin) {
            sum = sum - max - min
            count -= 2
        }

        return sum / count
    }

    /**
    * 清空buffer
    */
    //% addr.min=0x07 addr.max=0x77 addr.defl=0x29 
    //% block="清空地址为 %addr 的VL6180 的 Buffer"
    //% weight=96
    //% group="计算"
    export function clearBuffer(addr: Addr) {
        // clear buffer and enable history
        write1Byte(addr, SYSTEM__HISTORY_CTRL, 0x05)
    }

    /**
    * 最近测量的错误码
    */
    //% addr.min=0x07 addr.max=0x77 addr.defl=0x29 
    //% block="地址为 %addr 的 VL6180 最近错误码"
    //% weight=89
    //% group="状态"
    export function errorCode(addr: Addr): number {
        return read1Byte(addr, RESULT__RANGE_STATUS) >> 4
    }

    /**
     * 最大量程
     */
    //% addr.min=0x07 addr.max=0x77 addr.defl=0x29 
    //% block="地址为 %addr 的 VL6180 最大量程 mm"
    //% weight=88
    //% group="状态"
    export function maxRange(addr: Addr): number {
        return read1Byte(addr, SYSRANGE__THRESH_HIGH)
    }

    /**
     * 最小量程
     */
    //% addr.min=0x07 addr.max=0x77 addr.defl=0x29 
    //% block="地址为 %addr 的 VL6180 最小量程 mm"
    //% weight=87
    //% group="状态"
    export function minRange(addr: Addr): number {
        return read1Byte(addr, SYSRANGE__THRESH_LOW)
    }

    /**
     * offset 标定值
     */
    //% addr.min=0x07 addr.max=0x77 addr.defl=0x29 
    //% block="地址为 %addr 的 VL6180 Offset 标定值"
    //% weight=79
    //% group="标定"
    export function rangOffsetCalibration(addr: Addr): number {
        return readInt8(addr, SYSRANGE__PART_TO_PART_RANGE_OFFSET)
    }

    /**
     * set offset 标定值
     */
    //% addr.min=0x07 addr.max=0x77 addr.defl=0x29 
    //% block="设置地址为 %addr 的 VL6180 Offset标定值为 %offset "
    //% weight=78
    //% group="标定"
    export function setRangOffsetCalibration(addr: Addr, offset: number) {
        writeInt8(addr, SYSRANGE__PART_TO_PART_RANGE_OFFSET, offset)
    }

    /**
     * 在 50mm 处标定offset
     */
    //% addr.min=0x07 addr.max=0x77 addr.defl=0x29 
    //% targetDis.defl=50
    //% block="标定地址为 %addr VL6180 的 Offset || ，使用 %targetDis mm 处白色物体标注"
    //% weight=77
    //% group="标定"
    export function offsetCalibrationAt50mm(addr: Addr, targetDis?: number) {
        targetDis = targetDis ? targetDis : 50
    
        let sum = 0
        for (let i = 0; i < 10; i++) {
            sum += readRange(addr)
        }
        if (Math.abs(targetDis - sum / 10) <= 3) {
            return
        }
        
        writeInt8(addr, SYSRANGE__PART_TO_PART_RANGE_OFFSET, 0)

        sum = 0
        for (let i = 0; i < 10; i++) {
            sum += readRange(addr)
        }

        writeInt8(addr, SYSRANGE__PART_TO_PART_RANGE_OFFSET, targetDis - Math.round(sum / 10))
    }
}

type Addr = number

const DefaultAddr = 0x29

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
const SYSRANGE__INTERMEASUREMENT_PERIOD = 0x01B
const READOUT__AVERAGING_SAMPLE_PERIOD = 0x10A
const SYSRANGE__MAX_CONVERGENCE_TIME = 0x01C
const RESULT__RANGE_STATUS = 0x04D
const SYSTEM__HISTORY_CTRL = 0x012
const RESULT__HISTORY_BUFFER_x = 0x052
const SYSRANGE__PART_TO_PART_RANGE_OFFSET = 0x024

const CONFIG_GPIO_INTERRUPT_NEW_SAMPLE_READY = 0x04
/** clear ranging interrupt in write to #SYSTEM_INTERRUPT_CLEAR */
const INTERRUPT_CLEAR_RANGING = 0x01
/** clear als interrupt  in write to #SYSTEM_INTERRUPT_CLEAR */
const INTERRUPT_CLEAR_ALS = 0x02
/** clear error interrupt in write to #SYSTEM_INTERRUPT_CLEAR */
const INTERRUPT_CLEAR_ERROR = 0x04
const RANGE_DEVICE_READY_MASK = 0x01

let VL6180Inited = control.allocateEventSource()

// Initialize sensor with settings from ST application note AN4545, section
// "SR03 settings" - "Mandatory : private registers"
function initVL6180_impl(i2caddr: Addr) {
    if (read1Byte(i2caddr, SYSTEM__FRESH_OUT_OF_RESET) == 1) {
        // "Mandatory : private registers"
         
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

        // "Recommended : Public registers"

        // readout__averaging_sample_period = 48
        write1Byte(i2caddr, READOUT__AVERAGING_SAMPLE_PERIOD, 0x30);
        
        // Reset other settings to power-on defaults

        // sysrange__max_convergence_time = 49 (49 ms)
        write1Byte(i2caddr, SYSRANGE__MAX_CONVERGENCE_TIME, 0x31);

        // Thresh and open interrupt

        // set range interrupt
        write1Byte(i2caddr, SYSTEM__INTERRUPT_CONFIG_GPIO, CONFIG_GPIO_INTERRUPT_NEW_SAMPLE_READY)
        // range: 8~200 
        write1Byte(i2caddr, SYSRANGE__THRESH_HIGH, 200)
        write1Byte(i2caddr, SYSRANGE__THRESH_LOW, 8)
        // clear all interrupt
        write1Byte(i2caddr, SYSTEM__INTERRUPT_CLEAR, INTERRUPT_CLEAR_ERROR | INTERRUPT_CLEAR_RANGING | INTERRUPT_CLEAR_ALS)

        // enable history
        write1Byte(i2caddr, SYSTEM__HISTORY_CTRL, 0x01)

        write1Byte(i2caddr, SYSTEM__FRESH_OUT_OF_RESET, 0)
    }

    // stop. This will actually start a single measurement of range
    // if continuous mode is not active, so it's a good idea to
    // wait a few hundred ms after calling this function to let that complete
    // before starting continuous mode again or taking a reading.
    write1Byte(i2caddr, SYSRANGE__START, 1)
    basic.pause(100)
}

function write1Byte(i2caddr: Addr, reg: number, value: number) {
    let buf = pins.createBuffer(3)
    buf.setNumber(NumberFormat.UInt16BE, 0, reg)
    buf.setNumber(NumberFormat.UInt8BE, 2, value)
    pins.i2cWriteBuffer(i2caddr, buf)
}

function writeInt8(i2caddr: Addr, reg: number, value: number) {
    let buf = pins.createBuffer(3)
    buf.setNumber(NumberFormat.UInt16BE, 0, reg)
    buf.setNumber(NumberFormat.Int8BE, 2, value)
    pins.i2cWriteBuffer(i2caddr, buf)
}

function read1Byte(i2caddr: Addr, reg: number): number {
    pins.i2cWriteNumber(
        i2caddr,
        reg,
        NumberFormat.UInt16BE,
        true
    )
    return pins.i2cReadNumber(i2caddr, NumberFormat.UInt8BE, false)
}

function readInt8(i2caddr: Addr, reg: number): number {
    pins.i2cWriteNumber(
        i2caddr,
        reg,
        NumberFormat.UInt16BE,
        true
    )
    return pins.i2cReadNumber(i2caddr, NumberFormat.Int8BE, false)
}

function readToBuffer(i2caddr: Addr, reg: number, size: number): Buffer {
    pins.i2cWriteNumber(
        i2caddr,
        reg,
        NumberFormat.UInt16BE,
        true
    )
    return pins.i2cReadBuffer(i2caddr, size, false)
}

function waitARange(addr: Addr):number {
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

function waitRangReady(addr: Addr):void {
    while ((read1Byte(addr, RESULT__RANGE_STATUS) & RANGE_DEVICE_READY_MASK) == 0) {
        basic.pause(10)
    }
}

function readLatestRange(addr: Addr): number {
    return read1Byte(addr, RESULT__HISTORY_BUFFER_x)
}

function isContinualMode(addr: Addr): boolean {
    return (read1Byte(addr, SYSRANGE__START) & 0x02) != 0
}

function startASingleMeasurement(addr: Addr): number {
    waitRangReady(addr)
    write1Byte(addr, SYSRANGE__START, 1)
    return waitARange(addr)
}

