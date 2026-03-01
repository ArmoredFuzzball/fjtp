<h1>Fast JSON Transfer Protocol</h1>
This simple library provides a fast and efficient way to communicate between different Node.js processes using JSON over Unix Domain Sockets.

<h2>Performance</h2>
For small to medium payloads, this library offers extremely high speed communication with minimal overhead, considerably higher bandwidth and lower latency than popular alternatives.
<br>
NOTE: For larger payloads (more than ~96 KB), popular HTTP-based libraries start to quickly outperform this library by a large margin, as their protocol overhead no longer dominates at that scale and actually starts helping.

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
    <tr><td>~0</td><td>10,900</td><td>123,400</td><td>0.27</td><td>0.019</td></tr>
    <tr><td>0.5</td><td>10,300</td><td>98,400</td><td>0.28</td><td>0.028</td></tr>
    <tr><td>1</td><td>10,200</td><td>84,300</td><td>0.28</td><td>0.033</td></tr>
    <tr><td>2</td><td>9,800</td><td>65,600</td><td>0.29</td><td>0.041</td></tr>
    <tr><td>4</td><td>9,100</td><td>46,700</td><td>0.30</td><td>0.055</td></tr>
    <tr><td>8</td><td>8,200</td><td>30,300</td><td>0.33</td><td>0.091</td></tr>
    <tr><td>12</td><td>7,400</td><td>22,000</td><td>0.35</td><td>0.12</td></tr>
    <tr><td>16</td><td>6,700</td><td>17,300</td><td>0.38</td><td>0.15</td></tr>
    <tr><td>24</td><td>5,500</td><td>12,200</td><td>0.45</td><td>0.20</td></tr>
    <tr><td>32</td><td>5,000</td><td>9,300</td><td>0.50</td><td>0.26</td></tr>
    <tr><td>48</td><td>3,800</td><td>6,400</td><td>0.64</td><td>0.38</td></tr>
    <tr><td>64</td><td>3,000</td><td>4,900</td><td>0.78</td><td>0.56</td></tr>
    <tr><td>72</td><td>2,700</td><td>4,200</td><td>0.86</td><td>0.56</td></tr>
    <tr><td>96</td><td>2,200</td><td>3,100</td><td>1.04</td><td>3.5</td></tr>
    <tr><td>128</td><td>1,800</td><td>2,100</td><td>1.31</td><td>46.9</td></tr>
    <tr><td>256</td><td>900</td><td>600</td><td>2.77</td><td>160</td></tr>
  </tbody>
</table>

*Test conducted with FJTP 1.5.1, Fastify 5.5.0, Node.js v22.18.0*

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