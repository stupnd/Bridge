import asyncio
from bleak import BleakScanner, BleakClient
import struct

# Searches for device called DEVICE_NAME
# Subscribes to that device's service with UUID INPUT_SERVICE_UUID
INPUT_SERVICE_UUID = "3104838b-5ed7-4e6c-ac03-7823dd9d4c7b"
INPUT_CHAR_UUID = "77283f94-81cf-4438-be8a-642fe725ccbd"

data_queue = asyncio.Queue()

# Makes a unique handler for every device
def get_handler(name):
    def handler(char, data):
        # Puts tagged data into the queue
        data_queue.put((name, data))
    return handler

# Discover and return a device by name
async def find_device(name):
    while True:
        device = await BleakScanner.find_device_by_name(name)
        if device:
            return device

# Connect to a device by name and start receiving data in a queue
async def receive_data(name):
    device = await find_device(name)

    async with BleakClient(device) as client:
        print(f"Connected to {name}")

        # Start the notify service
        await client.start_notify(INPUT_CHAR_UUID, get_handler(name))

        # Keep the connection alive
        await asyncio.Event().wait()

async def transmit_data():
    pass

