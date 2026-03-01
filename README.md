<h1>Fast JSON Transfer Protocol</h1>
This simple library provides a fast and efficient way to communicate between different Node.js processes using JSON over Unix Domain Sockets.

<h2>Performance</h2>
For small to medium payloads, this library offers extremely high speed communication with minimal overhead, considerably higher bandwidth and lower latency than popular alternatives.
<br>
NOTE: For larger payloads (more than ~256 KB), popular HTTP-based libraries start to quickly outperform this library by a large margin, as their protocol overhead no longer dominates at that scale and actually starts helping.

<h3>Benchmarks</h3>

<table class="center">
  <caption>Performance comparison of Fastify+Fetch and FJTP</caption>
  <thead>
    <tr>
      <th rowspan="2">Payload<br>size (KB)</th>
      <th colspan="2">Req/sec</th>
      <th colspan="2">Latency (ms)</th>
    </tr>
    <tr>
      <th>Fastify</th>
      <th>FJTP</th>
      <th>Fastify</th>
      <th>FJTP</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>~0</td><td>15,400</td><td>121,000</td><td>0.065</td><td>0.008</td></tr>
    <tr><td>0.5</td><td>14,400</td><td>96,000</td><td>0.070</td><td>0.010</td></tr>
    <tr><td>1</td><td>13,500</td><td>84,500</td><td>0.074</td><td>0.012</td></tr>
    <tr><td>2</td><td>12,900</td><td>67,000</td><td>0.078</td><td>0.015</td></tr>
    <tr><td>4</td><td>11,700</td><td>49,000</td><td>0.086</td><td>0.021</td></tr>
    <tr><td>8</td><td>10,500</td><td>32,000</td><td>0.096</td><td>0.030</td></tr>
    <tr><td>12</td><td>9,100</td><td>23,500</td><td>0.110</td><td>0.041</td></tr>
    <tr><td>16</td><td>8,000</td><td>19,300</td><td>0.126</td><td>0.052</td></tr>
    <tr><td>24</td><td>6,300</td><td>14,000</td><td>0.158</td><td>0.071</td></tr>
    <tr><td>32</td><td>5,000</td><td>10,000</td><td>0.200</td><td>0.100</td></tr>
    <tr><td>48</td><td>4,300</td><td>9,000</td><td>0.230</td><td>0.112</td></tr>
    <tr><td>64</td><td>2,900</td><td>5,800</td><td>0.340</td><td>0.172</td></tr>
    <tr><td>72</td><td>2,800</td><td>5,700</td><td>0.351</td><td>0.176</td></tr>
    <tr><td>96</td><td>2,400</td><td>4,200</td><td>0.425</td><td>0.240</td></tr>
    <tr><td>128</td><td>1,300</td><td>1,800</td><td>0.745</td><td>0.570</td></tr>
    <tr><td>256</td><td>800</td><td>800</td><td>1.300</td><td>1.200</td></tr>
    <tr><td>512</td><td>400</td><td>400</td><td>2.370</td><td>2.550</td></tr>
    <tr><td>768</td><td>300</td><td>200</td><td>3.480</td><td>4.100</td></tr>
  </tbody>
</table>

*Test conducted with FJTP 2.0.1, Fastify 5.7.4, Node.js v24.14.0*

FJTP is best suited for scenarios where you need high bandwidth and low latency with small to medium JSON payloads (for example, a backend authentication service, which just transmits tokens or user credentials to other services).

<h2>Security</h2>
Unix Domain Sockets are not exposed to the network. Instead, they are files in the file system. This typically makes them more secure than communication over localhost. Care should still be taken to ensure that the folder which contains the Unix Domain Socket file is properly permissioned and accessible only to trusted users. This helps prevent unauthorized access to the communication channel.

<h2>Server Example</h2>

```js
import { FJTPServer } from 'fjtp';
const SOCKET_PATH = './secure_directory/my_socket.sock';

const options = { clientOptions: { UDSInterfaceOptions: { payloadCodecOptions: { encoding: 'ascii' } } } };
const server = new FJTPServer(options);

// Handle incoming connections
server.onConnection((socket) => {
  console.log('Client connected');

  // Handle incoming messages
  socket.onRequest((message) => {
    console.log('Received message:', message);
    return { anything: 'Hello from server!' };
    //or throw an error to the client
    throw new Error("Something went wrong!");
  });

  // Handle socket disconnect
  socket.on('close', () => {
    console.log('Client disconnected');
  });

  // Handle socket errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Listen for incoming connections
server.listen(SOCKET_PATH, () => console.log(`Server listening on ${SOCKET_PATH}`));
```

<h2>Client Example</h2>

```js
import { FJTPClient } from 'fjtp';
const SOCKET_PATH = './secure_directory/my_socket.sock';

const options = { UDSInterfaceOptions: { payloadCodecOptions: { encoding: 'ascii' } } };
const socket = new FJTPClient(options);

// Handle socket errors
socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Connect to the server
socket.connect(SOCKET_PATH, () => {
  console.log("Connected to the server");

  // Send a message and wait for a response
  socket.rpc({ anything: 'Hello from client!' }, 3000) //custom timeout ms
    .then(response => {
      console.log('Received response:', response);
    })
    .catch(error => {
      console.error('RPC error:', error);
    });
});
```