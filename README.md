# request-time
> Timings for HTTP requests

Understanding and measuring HTTP timings helps us to discover performance. bottlenecks in client to server or server to server communication.

![Request Timing](./media/request-timing.png "Request Timing")

#### Timings explained

- `DNS Lookup`: Time spent performing the DNS lookup. DNS lookup resolves domain names to IP addresses. Every new domain requires a full round trip to do the DNS lookup.
    - > There is no DNS lookup when the destination is already an IP address.

- `TCP Connection`: Time it took to establish TCP connection between a source host and destination host. Connections must be properly established in a multi-step handshake process. TCP connection is managed by an operating system, if the underlying TCP connection cannot be established, the OS-wide TCP connection timeout will overrule the timeout config of our application.

- `TLS handshake`: Time spent completing a TLS handshake. During the handshake process endpoints exchange authentication and keys to establish or resume secure sessions. 
    - > There is no TLS handshake with a not HTTPS request.

- `Time to First Byte (TTFB)`: Time spent waiting for the initial response. This time captures the latency of a round trip to the server in addition to the time spent waiting for the server to process the request and deliver the response.

- `Content Transfer`: Time spent receiving the response data. The size of the response data and the available network bandwidth determinates its duration.

## Installation

NPM:

> `npm install @abellsmythe/request-time`


## Usage

```javascript
'use strict';

const https = require('https');
const timer = require('@abellsmythe/request-time').default;

const request = https.get('https://google.com');
const timings = timer(request);

request.on('response', response => {
	response.on('data', () => {
        // Do something
    });
	response.on('end', () => {
		console.log(timings);
	});
});
```

```javascript
{
    start: 20019170.414002,
    socket: 20019171.943738,
    dnsLookup: 20019182.811348,
    connect: 20019194.637675,
    tlsHandshake: 20019245.32874,
    upload: 20019246.615841,
    response: 20019284.613933,
    end: 20019288.80115,
    error: undefined,
    phases:
    {
        wait: 1.5297359973192215,
        dns: 10.86761000007391,
        tcp: 11.826326999813318,
        request: 51.9781660027802,
        firstByte: 37.998091999441385,
        download: 4.187217000871897,
        total: 118.38714800029993
    }
}
```

## API

### timer(request)

Returns: `Object`

- `start` - Time when the request started.
- `socket` - Time when a socket was assigned to the request.
- `dnsLookup` - Time when the DNS lookup finished.
- `tlsHandshake` - Time when the secure connection is done.
- `connect` - Time when the socket successfully connected.
- `upload` - Time when the request finished uploading.
- `response` - Time when the request fired the `response` event.
- `end` - Time when the response fired the `end` event.
- `error` - Time when the request fired the `error` event.
- `phases`
	- `wait` - `timings.socket - timings.start`
	- `dns` - `timings.dnsLookup - timings.socket`
	- `tcp` - `timings.connect - timings.dnsLookup`
	- `request` - `timings.upload - timings.connect`
	- `firstByte` - `timings.response - timings.upload`
	- `download` - `timings.end - timings.response`
	- `total` - `timings.end - timings.start` or `timings.error - timings.start`

If something is not measured yet, it will be `undefined`.

> **Note**: The time is a `number` representing the milliseconds without elapsing since the UNIX epoch.

> **Note**: `request-time` uses `process.hrtime()` from node as it's not a subject of clock drift