import { EventEmitter } from 'events';
import { Socket } from 'net';
import { ClientRequest, IncomingMessage } from 'http';
// @ts-ignore
import deferToConnect from 'defer-to-connect';

export interface Timings {
	start: number;
	socket?: number;
	dnsLookupAt?: number;
	tlsHandshakeAt?: number
	connect?: number;
	upload?: number;
	response?: number;
	end?: number;
	error?: number;
	phases: {
		wait?: number;
		dns?: number;
		tcp?: number;
		request?: number;
		firstByte?: number;
		download?: number;
		total?: number;
	};
}

export default (request: ClientRequest): Timings => {
    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e6;

    /**
     * Get duration in milliseconds from process.hrtime()
     * @function getHrTimeDurationInMs
     * @param {Array} time - [seconds, nanoseconds]
     * @return {Number} durationInMs
     */
    const getHrTimeDurationInMs = (time: [number, number]): number =>
        (time[0] * NS_PER_SEC + time[1]) / MS_PER_NS;

	const timings: Timings = {
		start: getHrTimeDurationInMs(process.hrtime()),
		socket: undefined,
		dnsLookupAt: undefined,
		tlsHandshakeAt: undefined,
		connect: undefined,
		upload: undefined,
		response: undefined,
		end: undefined,
		error: undefined,
		phases: {
			wait: undefined,
			dns: undefined,
			tcp: undefined,
			request: undefined,
			firstByte: undefined,
			download: undefined,
			total: undefined
		}
    };

	const handleError = (origin: EventEmitter): void => {
		const emit = origin.emit.bind(origin);
		origin.emit = (event, ...args) => {
			// Catches the `error` event
			if (event === 'error') {
				timings.error = getHrTimeDurationInMs(process.hrtime());
				timings.phases.total = timings.error - timings.start;

				origin.emit = emit;
			}

			// Saves the original behavior
			return emit(event, ...args);
		};
	};

	let uploadFinished = false;
	const onUpload = (): void => {
		timings.upload = getHrTimeDurationInMs(process.hrtime());
		timings.phases.request = timings.upload - timings.connect!;
	};

	handleError(request);

	request.once('socket', (socket: Socket): void => {
		timings.socket = getHrTimeDurationInMs(process.hrtime());
		timings.phases.wait = timings.socket - timings.start;

		const lookupListener = (): void => {
			timings.dnsLookupAt = getHrTimeDurationInMs(process.hrtime());
			timings.phases.dns = timings.dnsLookupAt - timings.socket!;
		};

		socket.once('lookup', lookupListener);

		socket.on('secureConnect', () => {
			timings.tlsHandshakeAt = getHrTimeDurationInMs(process.hrtime())
		})

		deferToConnect(socket, () => {
			timings.connect = getHrTimeDurationInMs(process.hrtime());

			if (timings.dnsLookupAt === undefined) {
				socket.removeListener('lookup', lookupListener);
				timings.dnsLookupAt = timings.connect;
				timings.phases.dns = timings.dnsLookupAt - timings.socket!;
			}

			timings.phases.tcp = timings.connect - timings.dnsLookupAt;

			if (uploadFinished && !timings.upload) {
				onUpload();
			}
		});
	});

	request.once('finish', () => {
		uploadFinished = true;

		if (timings.connect) {
			onUpload();
		}
	});

	request.once('response', (response: IncomingMessage): void => {
		timings.response = getHrTimeDurationInMs(process.hrtime());
		timings.phases.firstByte = timings.response - timings.upload!;

		handleError(response);

		response.once('end', () => {
			timings.end = getHrTimeDurationInMs(process.hrtime());
			timings.phases.download = timings.end - timings.response!;
			timings.phases.total = timings.end - timings.start;
		});
	});

	return timings;
};
