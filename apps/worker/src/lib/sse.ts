export async function* readSseData(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });

    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? '';

    for (const event of events) {
      if (event.startsWith('data:')) {
        yield event.slice(5).trimStart();
      }
    }
  }
}
