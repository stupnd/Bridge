import asyncio
from bleak import BleakScanner, BleakClient
from bless import BlessServer, GATTCharacteristicProperties, GATTAttributePermissions

# Service UUID to subscribe to for receiving data from the hands
INPUT_SERVICE_UUID = "3104838b-5ed7-4e6c-ac03-7823dd9d4c7b"
INPUT_CHAR_UUID = "77283f94-81cf-4438-be8a-642fe725ccbd"

# Advertised service
OUTPUT_SERVICE_UUID = "A07498CA-AD5B-474E-940D-16F1FBE7E8CD"
OUTPUT_CHAR_UUID = "51FF12BB-3ED8-46E5-B4F9-D64E2FEC021B"
DEVICE_NAME = "Bridge-Body-Unit"

# Queue for receiving data
data_queue = asyncio.Queue()

# Makes a unique handler for every device
def get_handler(name):
    def handler(char, data):
        # Puts tagged data into the queue
        data_queue.put_nowait((name, data))
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

class TransmissionHandler:
    def __init__(self, name, service_uuid, char_uuid):
        self.name = name
        self.service_uuid = service_uuid
        self.char_uuid = char_uuid
        self.server = BlessServer(name=self.name)

    async def start(self):
        # Set up GATT service, starts advertising, and keeps the server alive
        await self.server.add_new_service(self.service_uuid)

        char_flags = (GATTCharacteristicProperties.read | GATTCharacteristicProperties.notify)
        permissions = GATTAttributePermissions.readable

        await self.server.add_new_characteristic(
            self.service_uuid,
            self.char_uuid,
            char_flags,
            None,
            permissions
        )

        await self.server.start()
        print(f"Advertising as \"{self.name}\". Waiting for connections...")

    async def transmit_data(self, data):
        # Updates the characteristic and notifies any connected central device
        payload = bytearray(data.encode("utf-8")) if isinstance(data, str) else bytearray(data)

        char = self.server.get_characteristic(self.char_uuid)
        char.value = payload

        # Push the new value to the subscribed clients
        self.server.update_value(self.service_uuid, self.char_uuid)

    async def stop(self):
        await self.server.stop()

transmitter = TransmissionHandler(DEVICE_NAME, OUTPUT_SERVICE_UUID, OUTPUT_CHAR_UUID)