import asyncio
from bleak import BleakScanner, BleakClient

DEVICE_NAME = "MyArduinoDevice"

async def main():
    device = None
    while device is None:
        device = await BleakScanner.find_device_by_name(DEVICE_NAME)

    print(f"Device found: {device.address}")
    
    async with BleakClient(device.address) as client:
        print("Device connected")
        for service in client.services:
            print(service)

asyncio.run(main())
