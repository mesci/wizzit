// Web Worker for high-performance chunk processing
// This runs in background thread, doesn't block UI

self.onmessage = async function(event) {
  const { type, data } = event.data

  switch (type) {
    case 'PROCESS_CHUNK':
      try {
        const { fileSlice, chunkIndex, chunkSize } = data
        
        // Convert file slice to ArrayBuffer in background
        const arrayBuffer = await fileSlice.arrayBuffer()
        
        // Send processed chunk back to main thread
        self.postMessage({
          type: 'CHUNK_READY',
          data: {
            arrayBuffer,
            chunkIndex,
            size: arrayBuffer.byteLength
          }
        })
      } catch (error) {
        self.postMessage({
          type: 'CHUNK_ERROR',
          data: {
            chunkIndex: data.chunkIndex,
            error: error.message
          }
        })
      }
      break

    case 'PROCESS_RECEIVED_CHUNK':
      try {
        const { chunkData, chunkIndex } = data
        
        // Process received chunk in background
        const processedChunk = chunkData // Could add decompression/validation here
        
        self.postMessage({
          type: 'RECEIVED_CHUNK_READY',
          data: {
            processedChunk,
            chunkIndex
          }
        })
      } catch (error) {
        self.postMessage({
          type: 'RECEIVED_CHUNK_ERROR',
          data: {
            chunkIndex: data.chunkIndex,
            error: error.message
          }
        })
      }
      break
  }
} 