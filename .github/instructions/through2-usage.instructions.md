---
copilot: instruction
applyTo: "src/**"
---
# Stream Processing with through2

Use `through2` for building Node.js transform streams when processing file content or piping data between stages.

## When to Use

- Processing files from globby results through a pipeline
- Transforming file content (e.g. parsing frontmatter, injecting headers)
- Composing multi-step processing as stream pipelines

## API Reference

```ts
import through2 from 'through2'
```

### Transform stream (object mode)

```ts
const transform = through2.obj(function (chunk, enc, callback) {
  // chunk is an object in object mode
  // push transformed result
  this.push({ ...chunk, processed: true })
  callback()
})
```

### Transform stream (buffer mode)

```ts
const transform = through2(function (chunk: Buffer, enc, callback) {
  const content = chunk.toString()
  this.push(content.toUpperCase())
  callback()
})
```

## Key Points

- Use `through2.obj()` when streaming objects (file metadata, parsed rule records).
- Use regular `through2()` when streaming raw file content as buffers.
- Always call `callback()` — forgetting it silently stalls the stream.
- Use `callback(error)` to propagate errors downstream.
- Prefer functional wrappers: write a factory function that returns a configured through2 stream rather than building it inline.

## Example: Factory pattern

```ts
import through2 from 'through2'

export function createFrontmatterFilter(agent: string) {
  return through2.obj(function (file, enc, callback) {
    if (file.frontmatter?.[agent]) {
      this.push(file)
    }
    callback()
  })
}
```
