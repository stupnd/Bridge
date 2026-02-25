import asyncio
from bleak import BleakScanner, BleakClient

# Searches for device called DEVICE_NAME
# Subscribes to that device's service with UUID SERVICE_UUID
DEVICE_NAME = "MyArduinoDevice"
SERVICE_UUID = "3104838b-5ed7-4e6c-ac03-7823dd9d4c7b"

# char is the characteristic we're subscribed to.
# data is the data written to that characteristic
# This function gets called whenever this device is notified of a change in the data
# (the change comes from the Arduino)
def sampleServiceHandler(char, data):
    # Data is received as a byte array! Important to know the format for when we have actual data
    print(f"Received data from characteristic {char.uuid}: {data.hex()}")

# Discover and return a device with name dName
async def findDevice(dName):
    device = None
    while device is None:
        device = await BleakScanner.find_device_by_name(dName)
    return device

# Connects to a device, finds a service with serviceUUID, and subscribes to notifications from it handled by serviceHandler
async def connectToDevice(device, serviceUUID, serviceHandler):
    # Connect to the target device
    async with BleakClient(device.address) as client:
        print("Device connected")

        # Find the target service
        service = None
        for s in client.services:
            if s.uuid == serviceUUID: 
                service = s
                break
        print(f"Service found: {service}")

        # Subscribe to the characteristic 
        characteristic_uuid = service.characteristics[0].uuid
        
        # Start the notify service
        await client.start_notify(characteristic_uuid, serviceHandler)
        await asyncio.Event().wait() # keeps this connection alive

# Main function for reading from the device
async def main():
    # Find the ESP32 and run the sampleServiceHandler from its data.
    device = await findDevice(DEVICE_NAME)
    print(f"Device found: {device.address}")
    await connectToDevice(device, SERVICE_UUID, sampleServiceHandler)

asyncio.run(main())
