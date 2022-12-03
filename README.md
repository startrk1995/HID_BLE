# Denial of service for BLE enabled HID readers

This is denial of service attack to disable HID BLE enabled readers. After watching a DefCon29 talk about using an Apple Air tag or any NRF52 BLE chipset device, I started to recreate a very small portion of their work which was not public. Here is the talk with Babak Javadi, Nick Draffen, Eric Bettse, Anze Jensterle :

https://www.youtube.com/watch?v=NARJrwX_KFY

I used my NRF52840 dongle in BLE sniffing mode to capture the data when the HID Mobile Access app initiated the "Inspect or Locate" function.

https://www.nordicsemi.com/Products/Development-hardware/nrf52840-dongle

https://infocenter.nordicsemi.com/topic/ug_sniffer_ble/UG/sniffer_ble/installing_sniffer.html

Once I had the conversation that the reader had with the phone, I was able to use my Puck.js (which has an NRF52 chipset and works with Javascript) to simulate the Locate feature the phone used. ~~After that I added a continuous scan for up to 4-5 of the closest readers.~~ I know the security researchers mentioned above coded this attack in much faster programming languages and for many different devices. (C+, noble, Javascript, Ardunio, etc)

My Javascript coding skills are not the best and as of right now it works for 4-5 simultaneous DOS of HID BLE readers. They were able to get many, many more. Mine is much more rudimentary and only works with the Puck.js as of now.

https://www.espruino.com/Puck.js

So with the Puck, the following button presses will change the behaviour of the attack:

1.	One short button press with attack the closest HID BLE reader ***ONCE***.       
~~2.	One medium button press (.5 to 2 secs) will enable the attack for up to 5 of the closest HID BLE readers ***continuously***.~~       
~~3.	One long button press (>2secs) will stop all attacks and place the Puck in a ready state.~~

Blue led blinking is BLE scanning.    
Green led blinking is the Puck found a reader and is starting the attack.    
Red led blinking means either no HID BLE readers were found or the attack failed.       
~~RGB in sequence means the attack for that reader is finished.~~    

Credit for this idea was the Defcon talk by Babak Javadi, Nick Draffen, Eric Bettse, Anze Jensterle.
