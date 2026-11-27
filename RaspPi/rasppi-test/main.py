import struct, asyncio

# import modules.tts as tts
import modules.bluetooth as ble

# tts.wait_for_audio_device("hw:0,0")
# tts.play("Testing 1, 2, 3")

DEVICE_NAMES = ["MyArduinoDevice"]

# Data processing thread
async def process_hand_data():
    while True:
        hand_name, data = await ble.data_queue.get()

        accX, accY, accZ, gyrX, gyrY, gyrZ, magX, magY, magZ, f1, f2, f3, f4, f5 = struct.unpack('<9f5i', data)

        print(f"Packet received from {hand_name}:")
        print(accX, accY, accZ, gyrX, gyrY, gyrZ, magX, magY, magZ, f1, f2, f3, f4, f5)

        # Feed data to model


        # Transmit output
        # await ble.transmitter.transmit_data((model_output, data))

        # Free the queue
        ble.data_queue.task_done()

async def main():
    # Start advertising, don't wait for a connection
    await ble.transmitter.start()

    # Start up service handlers for receiving data from the gloves and transmitting outputs over another channel
    await asyncio.gather(
        ble.receive_data(DEVICE_NAMES[0]),
        # ble.receive_data(DEVICE_NAMES[1]),
        process_hand_data()
    )

asyncio.run(main())